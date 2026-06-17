import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const VAPID_PUBLIC = 'BDTrjy8Jx9rSFHiciUa9Lew5zJ9Ag6mz0_cVrj0UzyOjqKOe9WVYJm_WmtPzkxhcC9jKMD7DmktGXYtDaWu9Ll0';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

export function usePush(userId) {
  const [status, setStatus] = useState(supported ? Notification.permission : 'unsupported');

  // Registrar el service worker al cargar (necesario para recibir push)
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  }, []);

  // Si ya dio permiso, re-guardar la suscripción (por si cambió)
  useEffect(() => {
    if (!supported || !userId || Notification.permission !== 'granted') return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
        }
        await supabase.from('push_subscriptions').upsert(
          { user_id: userId, endpoint: sub.endpoint, subscription: sub.toJSON() },
          { onConflict: 'endpoint' }
        );
      } catch { /* noop */ }
    })();
  }, [userId]);

  const enable = useCallback(async () => {
    if (!supported || !userId) return;
    try {
      const reg = await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
      const perm = await Notification.requestPermission();
      setStatus(perm);
      if (perm !== 'granted') return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
      await supabase.from('push_subscriptions').upsert(
        { user_id: userId, endpoint: sub.endpoint, subscription: sub.toJSON() },
        { onConflict: 'endpoint' }
      );
    } catch { /* noop */ }
  }, [userId]);

  return { status, enable, supported };
}
