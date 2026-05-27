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
  
  // ✅ Extraer información detallada del payload
  let titulo = payload.notification?.title || '📋 Lab.Rosas';
  let cuerpo = payload.notification?.body || 'Tienes una notificación pendiente';
  let urlDestino = payload.data?.url || '/ordenes';
  
  // ✅ Si hay datos más específicos, usarlos
  if (payload.data?.titulo_detallado) {
    titulo = payload.data.titulo_detallado;
  }
  if (payload.data?.cuerpo_detallado) {
    cuerpo = payload.data.cuerpo_detallado;
  }
  
  // ✅ Configurar la notificación SIN BOTONES
  const opciones = {
    body: cuerpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.ordenId || `fcm-${Date.now()}`,
    data: {
      url: urlDestino,
      ordenId: payload.data?.ordenId,
      title: titulo,
      body: cuerpo
    },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    // ✅ IMPORTANTE: Sin actions = sin botones
    actions: []
  };
  
  self.registration.showNotification(titulo, opciones);
});

// ✅ Manejar click en notificación - Abre la app directamente
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación');
  
  // Cerrar la notificación
  event.notification.close();
  
  // Obtener la URL de destino
  let urlDestino = '/ordenes';
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
  }
  
  console.log('[FCM SW] Abriendo URL:', urlDestino);
  
  // Abrir o enfocar la ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (client.url !== urlDestino && 'navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker listo (sin botones)');