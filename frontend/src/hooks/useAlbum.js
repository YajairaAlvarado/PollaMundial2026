import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAvatars } from '../contexts/AvatarContext';
import {
  buildRoster, generateChallenge, canPlay, isAlbumBeta, dailyState,
} from '../utils/album';

const DBG = (...a) => console.log('%c[ALBUM]', 'color:#FFD100;font-weight:bold', ...a);

export function useAlbum(user) {
  const { avatars, ready } = useAvatars();
  const username = (user?.username || '').toLowerCase();
  const beta = isAlbumBeta(username);

  const [ownedSet, setOwnedSet]     = useState(new Set());
  const [challenges, setChallenges] = useState([]);   // intentos del usuario
  const [loading, setLoading]       = useState(true);
  const [challenge, setChallenge]   = useState(null); // reto activo (popup)
  const shownRef = useRef(false);                     // solo auto-mostrar una vez por carga

  const roster = useMemo(() => (ready ? buildRoster(avatars) : []), [avatars, ready]);
  const total  = roster.length;
  // owned = cromos reales que tiene (mismo criterio que el ranking), no depende
  // de que las fotos hayan cargado todas — así el número es estable y coincide
  // en el ranking, el álbum propio y el visor de otros.
  const owned  = ownedSet.size;
  const completed = total > 0 && roster.every((p) => ownedSet.has(p.username));
  const missing = useMemo(
    () => roster.filter((p) => p.username !== username && !ownedSet.has(p.username)),
    [roster, username, ownedSet]
  );

  // Tick para reevaluar la disponibilidad cuando se vence el cooldown
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 10000); return () => clearInterval(id); }, []);
  const canPlayNow = beta && !loading && ready && canPlay(challenges, missing.length);

  // Cargar fichas + intentos
  const load = useCallback(async () => {
    if (!beta || !username) { setLoading(false); return; }
    setLoading(true);
    const [stRes, chRes] = await Promise.all([
      supabase.from('album_stickers').select('sticker_username').eq('owner_username', username),
      supabase.from('album_challenges').select('created_at, result').eq('username', username).order('created_at', { ascending: false }).limit(50),
    ]);
    setOwnedSet(new Set((stRes.data || []).map((r) => r.sticker_username)));
    setChallenges(chRes.data || []);
    setLoading(false);
  }, [beta, username]);

  useEffect(() => { load(); }, [load]);

  // Sincronizar entre dispositivos/pestañas: si gano una ficha en el celular,
  // la PC (y cualquier otra sesión abierta) se entera sola sin necesitar F5.
  useEffect(() => {
    if (!beta || !username) return;
    const channel = supabase
      .channel('album-' + username)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'album_challenges', filter: `username=eq.${username}` }, (p) => {
        setChallenges((prev) => (prev.some((c) => c.created_at === p.new.created_at) ? prev : [p.new, ...prev]));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'album_stickers', filter: `owner_username=eq.${username}` }, (p) => {
        setOwnedSet((prev) => new Set(prev).add(p.new.sticker_username));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [beta, username]);

  // Abrir un reto si corresponde (respeta límites y cooldown). No duplica si ya hay uno.
  // Persistimos el reto activo: al refrescar SIN contestar sale el MISMO (no uno
  // nuevo cada vez). Seguro doble: nunca reusar/abrir un reto de alguien que ya tengo.
  const storageKey = `album_active_${username}`;
  const openChallenge = useCallback(() => {
    const ds = dailyState(challenges);
    const play = canPlay(challenges, missing.length);
    DBG('openChallenge()', { winsToday: ds.winsToday, attemptsToday: ds.attemptsToday,
      cooldownMin: Math.round(ds.cooldownLeft / 60000), missing: missing.length,
      ownedCount: ownedSet.size, canPlay: play });
    setChallenge((prev) => {
      if (prev) {
        const own = ownedSet.has(prev.target?.username);
        DBG('  ya hay reto activo:', prev.target?.username, own ? '(YA LO TENGO → descarto)' : '(lo mantengo)');
        return own ? null : prev;
      }
      if (!play) { DBG('  NO se abre (canPlay=false)'); return prev; }
      const missingSet = new Set(missing.map((p) => p.username));
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        const t = saved?.challenge?.target;
        if (saved?.day === new Date().toDateString() && t && missingSet.has(t.username)) {
          DBG('  REUSO reto guardado →', t.username, '(¿lo tengo?', ownedSet.has(t.username), ')');
          return saved.challenge;
        }
        if (saved) DBG('  reto guardado descartado →', t?.username, '(no está en missing)');
      } catch { /* noop */ }
      const c = generateChallenge(roster, ownedSet, username);
      DBG('  GENERO nuevo →', c?.target?.username, '(¿lo tengo?', c ? ownedSet.has(c.target.username) : '-', ')');
      if (c) { try { localStorage.setItem(storageKey, JSON.stringify({ day: new Date().toDateString(), challenge: c })); } catch { /* noop */ } }
      return c || prev;
    });
  }, [challenges, missing, roster, ownedSet, username, storageKey]);

  // Trigger 1: al cargar/recargar la página (una sola vez)
  useEffect(() => {
    if (!beta || loading || !ready || shownRef.current) return;
    shownRef.current = true;
    openChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beta, loading, ready]);

  // Registrar resultado del reto: 'win' | 'lose' | 'timeout'.
  // NO cierra el popup (para mostrar la animación); el cierre lo hace dismissChallenge.
  // Para 'win' usamos un RPC atómico (chequea el límite de 3/día y otorga la
  // ficha en una sola transacción con bloqueo) para que dos pestañas/sesiones
  // abiertas a la vez no puedan colarse y superar el límite diario.
  const recordResult = useCallback(async (result, target) => {
    DBG('recordResult()', result, '→', target?.username);
    try { localStorage.removeItem(storageKey); } catch { /* noop */ } // ya se resolvió
    if (result === 'win' && target) {
      const { data: awarded, error } = await supabase.rpc('try_award_album_sticker', {
        p_username: username, p_target: target.username,
      });
      DBG('  RPC try_award →', { awarded, error: error?.message });
      // Tras el RPC, recargamos desde la base (única fuente de verdad) en vez de
      // sumar a mano en local — así evitamos contar dos veces la misma victoria
      // cuando además llega el aviso en tiempo real con el mismo registro.
      await load();
      if (awarded && target) setOwnedSet((prev) => new Set(prev).add(target.username));
      return;
    }
    const nowIso = new Date().toISOString();
    setChallenges((prev) => [{ created_at: nowIso, result }, ...prev]); // optimista
    await supabase.from('album_challenges').insert({ username, result, target_username: target?.username || null });
  }, [username, load, storageKey]);

  const dismissChallenge = useCallback(() => { try { localStorage.removeItem(storageKey); } catch { /* noop */ } setChallenge(null); }, [storageKey]);

  return {
    beta, loading, ready, roster, ownedSet, total, owned, completed,
    challenge, challenges, canPlayNow, openChallenge, recordResult, dismissChallenge, reload: load,
  };
}
