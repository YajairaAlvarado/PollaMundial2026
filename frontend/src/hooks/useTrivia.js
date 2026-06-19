import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { TRIVIA } from '../utils/triviaQuestions';

export const NUM_Q = 5;
export const QUESTION_MS = 7000;   // 7 seg por pregunta
export const COUNTDOWN_MS = 5000;  // cuenta regresiva antes de empezar
export const CHALLENGE_TIMEOUT_MS = 30000; // tiempo máximo esperando respuesta al reto

function pickQuestions(n) {
  const idx = [...Array(TRIVIA.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, n);
}

export function useTrivia(userId, currentUser) {
  const [incoming, setIncoming] = useState(null); // reto pendiente para mí
  const [active,   setActive]   = useState(null); // partida activa
  const [declinedBy, setDeclinedBy] = useState(null);
  const [outgoing, setOutgoing] = useState(null); // reto que YO envié, esperando respuesta

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('trivia-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trivia_matches', filter: `to_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'pending') setIncoming(p.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trivia_matches', filter: `to_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'cancelled') setIncoming((cur) => (cur?.id === p.new.id ? null : cur));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trivia_matches', filter: `from_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'active') { setActive(p.new); setOutgoing(null); }
        else if (p.new.status === 'declined') { setDeclinedBy(p.new.to_username || 'tu rival'); setOutgoing(null); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trivia_matches', filter: `to_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'active') setActive(p.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const challenge = useCallback(async (target) => {
    if (!userId || !target?.id) return;
    const { data } = await supabase.from('trivia_matches').insert({
      from_user_id: userId,
      to_user_id:   target.id,
      from_name:    currentUser.displayName,
      from_username: currentUser.username,
      to_username:  target.username,
      questions:    pickQuestions(NUM_Q),
      status:       'pending',
    }).select().single();
    if (data) setOutgoing({ ...data, to_name: target.display_name || target.username });
  }, [userId, currentUser]);

  const cancelOutgoing = useCallback(async () => {
    if (!outgoing) return;
    await supabase.from('trivia_matches').update({ status: 'cancelled' }).eq('id', outgoing.id);
    setOutgoing(null);
  }, [outgoing]);

  // Cancelar automáticamente si la otra persona no responde a tiempo
  useEffect(() => {
    if (!outgoing) return;
    const t = setTimeout(() => { cancelOutgoing(); }, CHALLENGE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [outgoing, cancelOutgoing]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    const startAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();
    await supabase.from('trivia_matches').update({ status: 'active', start_at: startAt }).eq('id', incoming.id);
    setActive({ ...incoming, status: 'active', start_at: startAt });
    setIncoming(null);
  }, [incoming]);

  const decline = useCallback(async () => {
    if (!incoming) return;
    await supabase.from('trivia_matches').update({ status: 'declined' }).eq('id', incoming.id);
    setIncoming(null);
  }, [incoming]);

  const clearActive = useCallback(() => setActive(null), []);
  const clearDeclined = useCallback(() => setDeclinedBy(null), []);

  return { incoming, active, declinedBy, outgoing, challenge, accept, decline, cancelOutgoing, clearActive, clearDeclined };
}
