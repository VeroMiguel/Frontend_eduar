importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyA4fQYr8Pj1N3eNsTkM90uMCKA495iQX_I',
  authDomain: 'labrosasnotificaciones.firebaseapp.com',
  projectId: 'labrosasnotificaciones',
  storageBucket: 'labrosasnotificaciones.firebasestorage.app',
  messagingSenderId: '385266856992',
  appId: '1:385266856992:web:ee718300dcb112b6e23845'
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Mensaje en background:', payload);
  
  const titulo = payload.notification?.title || '📋 Lab.Rosas';
  const cuerpo = payload.notification?.body || 'Tienes una notificación';
  const url = payload.data?.url || '/ordenes';
  
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/favicon.ico',
    data: { url: url },
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/ordenes';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.url !== url && 'navigate' in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});