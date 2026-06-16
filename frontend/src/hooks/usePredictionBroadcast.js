import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export function usePredictionBroadcast(userId) {
  const [toasts,     setToasts]     = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [seenCount,  setSeenCount]  = useState(0);

  const dismiss = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t._toastId !== toastId));
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Cuenta de hoy para la campanita (lo que ya existe al cargar)
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('prediction_broadcasts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00Z')
      .then(({ count }) => {
        setTodayCount(count || 0);
        setSeenCount(count || 0);
      });

    // Escucha inserts en prediction_broadcasts (cualquier usuario)
    const channel = supabase
      .channel('pred-broadcasts')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'prediction_broadcasts',
      }, (payload) => {
        const row     = payload.new;
        const toastId = Date.now() + Math.random();
        const toast   = { ...row, _toastId: toastId };
        setToasts((prev) => [...prev.slice(-3), toast]);
        setTodayCount((n) => n + 1);
        setTimeout(() => dismiss(toastId), 6000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, dismiss]);

  const unread   = Math.max(0, todayCount - seenCount);
  const markRead = () => setSeenCount(todayCount);

  return { toasts, dismiss, todayCount, unread, markRead };
}
