import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAvatars } from '../contexts/AvatarContext';
import {
  buildRoster, generateChallenge, canPlay, isAlbumBeta,
} from '../utils/album';

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
  const owned  = roster.filter((p) => ownedSet.has(p.username)).length; // solo cuenta fichas vigentes
  const completed = total > 0 && owned >= total;
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

  // Abrir un reto si corresponde (respeta 3/día y cooldown). No duplica si ya hay uno.
  const openChallenge = useCallback(() => {
    setChallenge((prev) => {
      if (prev) return prev;
      if (!canPlay(challenges, missing.length)) return prev;
      return generateChallenge(roster, ownedSet, username) || prev;
    });
  }, [challenges, missing, roster, ownedSet, username]);

  // Trigger 1: al cargar/recargar la página (una sola vez)
  useEffect(() => {
    if (!beta || loading || !ready || shownRef.current) return;
    shownRef.current = true;
    openChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beta, loading, ready]);

  // Registrar resultado del reto: 'win' | 'lose' | 'timeout'.
  // NO cierra el popup (para mostrar la animación); el cierre lo hace dismissChallenge.
  const recordResult = useCallback(async (result, target) => {
    const nowIso = new Date().toISOString();
    setChallenges((prev) => [{ created_at: nowIso, result }, ...prev]); // optimista
    await supabase.from('album_challenges').insert({ username, result, target_username: target?.username || null });
    if (result === 'win' && target) {
      setOwnedSet((prev) => new Set(prev).add(target.username));
      await supabase.from('album_stickers')
        .upsert({ owner_username: username, sticker_username: target.username }, { onConflict: 'owner_username,sticker_username' });
    }
  }, [username]);

  const dismissChallenge = useCallback(() => setChallenge(null), []);

  return {
    beta, loading, ready, roster, ownedSet, total, owned, completed,
    challenge, challenges, canPlayNow, openChallenge, recordResult, dismissChallenge, reload: load,
  };
}
