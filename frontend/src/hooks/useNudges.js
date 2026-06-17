import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export function useNudges(userId) {
  const [queue,     setQueue]     = useState([]);   // guiños no mostrados
  const [active,    setActive]    = useState(null);  // el que se está mostrando
  const [isVisible, setIsVisible] = useState(typeof document !== 'undefined' ? !document.hidden : true);

  // Seguir la visibilidad de la pestaña
  useEffect(() => {
    const onVis = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  // Carga inicial de guiños no vistos + suscripción en tiempo real
  useEffect(() => {
    if (!userId) return;

    // Sin límite de tiempo: trae TODOS los guiños no leídos (aunque sean viejos)
    supabase
      .from('nudges')
      .select('*')
      .eq('to_user_id', userId)
      .is('seen_at', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data?.length) {
          setQueue((q) => {
            const ids = new Set(q.map((n) => n.id));
            const nuevos = data.filter((n) => !ids.has(n.id)).map((n) => ({ ...n, _popupId: n.id }));
            return [...q, ...nuevos];
          });
        }
      });

    const channel = supabase
      .channel('nudges-inbox')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'nudges',
        filter: `to_user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new;
        setQueue((q) => (q.some((x) => x.id === n.id) ? q : [...q, { ...n, _popupId: n.id ?? Date.now() }]));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Mostrar de a uno, solo cuando la pestaña está visible. Marca "visto" al mostrar.
  useEffect(() => {
    if (!isVisible || active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
    if (next.id) {
      supabase.from('nudges').update({ seen_at: new Date().toISOString() }).eq('id', next.id).then(() => {});
    }
  }, [isVisible, active, queue]);

  const dismiss = useCallback(() => setActive(null), []);

  const reply = useCallback(async (nudgeId, replyText) => {
    await supabase.from('nudges').update({
      reply_text: replyText,
      replied_at: new Date().toISOString(),
    }).eq('id', nudgeId);
    setActive(null);
  }, []);

  const send = useCallback(async (nudge) => {
    await supabase.from('nudges').insert(nudge);
  }, []);

  const incoming = active ? [active] : [];
  return { incoming, dismiss, reply, send };
}
