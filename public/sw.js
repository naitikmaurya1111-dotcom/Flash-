// Service Worker for StudyPulse - Persistent Background Mobile Notifications & Vibration
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find an existing tab of our app and focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Or open a fresh one
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
