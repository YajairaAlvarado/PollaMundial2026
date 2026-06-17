import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos

// userId: usuario logueado (siempre manda heartbeat)
// watch:  true solo para quienes ven la lista de conectados y mandan guiños
export function usePresence(userId, watch = false) {
  const [onlineUsers,      setOnlineUsers]      = useState([]);
  const [connectionAlerts, setConnectionAlerts] = useState([]);
  const prevIdsRef = useRef(null); // null = primera carga (no notificar)
  const graceUntilRef = useRef(0); // periodo de gracia tras conectarse

  const dismissAlert = useCallback((alertId) => {
    setConnectionAlerts((prev) => prev.filter((a) => a._alertId !== alertId));
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Heartbeat: solo cuando la pestaña está VISIBLE (no minimizada/segundo plano)
    const heartbeat = async () => {
      await supabase.from('user_presence').upsert(
        { user_id: userId, last_seen: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    };
    const heartbeatIfVisible = () => { if (!document.hidden) heartbeat(); };
    heartbeatIfVisible();
    const hbInterval = setInterval(heartbeatIfVisible, 30_000);

    // Al volver a la pestaña, marcar presencia de inmediato (reaparece rápido)
    const onVisible = () => { if (!document.hidden) heartbeat(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    // Solo quien "observa" carga la lista de conectados y recibe alertas
    let pollInterval;
    if (watch) {
      // Periodo de gracia: durante los primeros 40s no se notifica a NADIE
      // (evita la avalancha de "se conectó X" de los que ya estaban en línea)
      graceUntilRef.current = Date.now() + 40_000;

      const loadOnline = async () => {
        const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
        const { data } = await supabase
          .from('user_presence')
          .select('user_id, last_seen, user:users(id, display_name, avatar_initials, username)')
          .gte('last_seen', threshold)
          .neq('user_id', userId);
        const users = (data || []).map((r) => ({ ...r.user, last_seen: r.last_seen })).filter((u) => u.id);
        setOnlineUsers(users);

        // Detectar recién conectados (no estaban antes Y ya pasó el periodo de gracia)
        const currentIds = new Set(users.map((u) => u.id));
        const enGracia = Date.now() < graceUntilRef.current;
        if (prevIdsRef.current !== null && !enGracia) {
          const nuevos = users.filter((u) => !prevIdsRef.current.has(u.id));
          if (nuevos.length > 0) {
            setConnectionAlerts((prev) => [
              ...prev,
              ...nuevos.map((u) => ({ ...u, _alertId: Date.now() + Math.random() })),
            ]);
          }
        }
        prevIdsRef.current = currentIds;
      };
      loadOnline();
      pollInterval = setInterval(loadOnline, 30_000);
    }

    return () => {
      clearInterval(hbInterval);
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, watch]);

  return { onlineUsers, connectionAlerts, dismissAlert };
}
