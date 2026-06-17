/* Service Worker — notificaciones push de PollaMundial 2026 */
const BASE = '/PollaMundial2026/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch { data = {}; }
  const title = data.title || '⚽ PollaMundial 2026';
  const options = {
    body:  data.body || 'Tienes partidos sin pronosticar',
    icon:  data.icon || BASE + 'favicon.ico',
    badge: BASE + 'favicon.ico',
    image: data.image,
    vibrate: [120, 60, 120],
    tag: data.tag || 'recordatorio',
    renotify: true,
    data: { url: data.url || BASE },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || BASE;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
