import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const roster = useMemo(() => (ready ? buildRoster(avatars) : []), [avatars, ready]);
  const total  = roster.length;
  const owned  = roster.filter((p) => ownedSet.has(p.username)).length; // solo cuenta fichas vigentes
  const completed = total > 0 && owned >= total;

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

  // Decidir si mostrar un reto al abrir (cuando ya cargó todo)
  useEffect(() => {
    if (!beta || loading || !ready || challenge) return;
    const missing = roster.filter((p) => p.username !== username && !ownedSet.has(p.username));
    if (canPlay(challenges, missing.length)) {
      const c = generateChallenge(roster, ownedSet, username);
      if (c) setChallenge(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beta, loading, ready, roster, ownedSet, challenges]);

  // Registrar resultado del reto: 'win' | 'lose' | 'timeout'.
  // NO cierra el popup (para mostrar la animación); el cierre lo hace dismissChallenge.
  const recordResult = useCallback(async (result, target) => {
    const nowIso = new Date().toISOString();
    setChallenges((prev) => [{ created_at: nowIso, result }, ...prev]); // optimista
    await supabase.from('album_challenges').insert({ username, result });
    if (result === 'win' && target) {
      setOwnedSet((prev) => new Set(prev).add(target.username));
      await supabase.from('album_stickers')
        .upsert({ owner_username: username, sticker_username: target.username }, { onConflict: 'owner_username,sticker_username' });
    }
  }, [username]);

  const dismissChallenge = useCallback(() => setChallenge(null), []);

  return {
    beta, loading, ready, roster, ownedSet, total, owned, completed,
    challenge, recordResult, dismissChallenge, reload: load,
  };
}
