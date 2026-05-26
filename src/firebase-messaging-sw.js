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
  
  // Extraer información del payload
  let titulo = payload.notification?.title || '📋 Lab.Rosas';
  let cuerpo = payload.notification?.body || 'Tienes una notificación pendiente';
  let urlDestino = payload.data?.url || '/ordenes';
  
  // ✅ Si el título es genérico, usar datos más específicos
  if (titulo === '📋 Lab.Rosas' && payload.data?.title) {
    titulo = payload.data.title;
  }
  if (cuerpo === 'Tienes una notificación pendiente' && payload.data?.body) {
    cuerpo = payload.data.body;
  }
  
  const opciones = {
    body: cuerpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || `fcm-${Date.now()}`,
    data: {
      url: urlDestino,
      title: titulo,
      body: cuerpo,
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

// ✅ Manejar click en notificación - VERSIÓN CORREGIDA
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación. Acción:', event.action);
  
  // Cerrar la notificación
  event.notification.close();
  
  // Si el usuario hizo clic en "cerrar", no hacer nada
  if (event.action === 'cerrar') {
    console.log('[FCM SW] Usuario cerró la notificación');
    return;
  }
  
  // ✅ Obtener la URL de destino (funciona tanto para clic en cuerpo como en botón "ver")
  let urlDestino = '/ordenes';
  
  // Intentar obtener URL de los datos de la notificación
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
  }
  
  // Intentar obtener del payload original (FCM_MSG)
  if (event.notification.data && event.notification.data.FCM_MSG) {
    const fcmMsg = event.notification.data.FCM_MSG;
    if (fcmMsg.data && fcmMsg.data.url) {
      urlDestino = fcmMsg.data.url;
    } else if (fcmMsg.fcmOptions && fcmMsg.fcmOptions.link) {
      urlDestino = fcmMsg.fcmOptions.link;
    }
  }
  
  console.log('[FCM SW] Abriendo URL:', urlDestino);
  
  // ✅ Abrir o enfocar la ventana (misma lógica para cualquier clic)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana ya abierta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[FCM SW] Ventana encontrada, enfocando');
            client.focus();
            if (client.url !== urlDestino && 'navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        // No hay ventana abierta, crear una nueva
        console.log('[FCM SW] Abriendo nueva ventana');
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker listo');