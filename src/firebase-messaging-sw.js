/**
 * firebase-messaging-sw.js
 * Service Worker de Firebase para notificaciones en BACKGROUND.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración real de Firebase
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

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Mensaje en background recibido:', payload);
  
  const titulo = payload.notification?.title || '📋 Lab.Rosas';
  const cuerpo = payload.notification?.body || 'Tienes una notificación pendiente';
  const urlDestino = payload.data?.url || '/ordenes';
  
  const opciones = {
    body: cuerpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || `fcm-${Date.now()}`,
    data: {
      url: urlDestino,
      ...payload.data
    },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'ver', title: '👁️ Ver orden' },
      { action: 'cerrar', title: '✕ Cerrar' }
    ]
  };
  
  self.registration.showNotification(titulo, opciones);
});

// ✅ Manejar click en notificación (ABRE LA APP)
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación:', event.notification.tag);
  
  event.notification.close();
  
  const accion = event.action;
  if (accion === 'cerrar') return;
  
  // Obtener la URL de los datos de la notificación
  let urlDestino = '/ordenes';
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
  }
  
  // También revisar en payload.data si existe
  if (event.notification.data && event.notification.data.FCM_MSG) {
    const fcmMsg = event.notification.data.FCM_MSG;
    if (fcmMsg.data && fcmMsg.data.url) {
      urlDestino = fcmMsg.data.url;
    }
  }
  
  console.log('[FCM SW] Abriendo URL:', urlDestino);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana ya abierta de la app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navegar a la URL dentro de la misma ventana
            if ('navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        // No hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker de Firebase inicializado');