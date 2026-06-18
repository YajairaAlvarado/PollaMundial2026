import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { TRIVIA } from '../utils/triviaQuestions';

export const NUM_Q = 5;
export const QUESTION_MS = 7000;   // 7 seg por pregunta
export const COUNTDOWN_MS = 5000;  // cuenta regresiva antes de empezar

function pickQuestions(n) {
  const idx = [...Array(TRIVIA.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, n);
}

export function useTrivia(userId, currentUser) {
  const [incoming, setIncoming] = useState(null); // reto pendiente para mí
  const [active,   setActive]   = useState(null); // partida activa
  const [declinedBy, setDeclinedBy] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('trivia-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trivia_matches', filter: `to_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'pending') setIncoming(p.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trivia_matches', filter: `from_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'active') setActive(p.new);
        else if (p.new.status === 'declined') setDeclinedBy(p.new.to_username || 'tu rival');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trivia_matches', filter: `to_user_id=eq.${userId}` }, (p) => {
        if (p.new.status === 'active') setActive(p.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const challenge = useCallback(async (target) => {
    if (!userId || !target?.id) return;
    await supabase.from('trivia_matches').insert({
      from_user_id: userId,
      to_user_id:   target.id,
      from_name:    currentUser.displayName,
      from_username: currentUser.username,
      to_username:  target.username,
      questions:    pickQuestions(NUM_Q),
      status:       'pending',
    });
  }, [userId, currentUser]);

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

  return { incoming, active, declinedBy, challenge, accept, decline, clearActive, clearDeclined };
}
