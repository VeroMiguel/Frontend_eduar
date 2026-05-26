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
  
  // --- MEJORA 1: Extraer la URL de forma más fiable ---
  // Buscar la URL en diferentes lugares donde podría venir
  let urlDestino = '/ordenes'; // URL por defecto
  if (payload.data && payload.data.url) {
    urlDestino = payload.data.url;
  } else if (payload.fcmOptions && payload.fcmOptions.link) {
    urlDestino = payload.fcmOptions.link;
  } else if (payload.notification && payload.notification.click_action) {
    urlDestino = payload.notification.click_action;
  }

  const titulo = payload.notification?.title || '📋 Lab.Rosas';
  const cuerpo = payload.notification?.body || 'Tienes una notificación pendiente';
  
  const opciones = {
    body: cuerpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || `fcm-${Date.now()}`,
    data: {
      url: urlDestino, // Guardar la URL en los datos de la notificación
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

// ✅ Manejar click en notificación (ABRE LA APP) - VERSIÓN MEJORADA CON SOPORTE PARA BOTONES
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación. Acción:', event.action);
  
  // Cerrar la notificación inmediatamente
  event.notification.close();
  
  // ✅ Si se hizo clic en "cerrar", no hacemos nada más
  if (event.action === 'cerrar') {
    console.log('[FCM SW] Usuario cerró la notificación');
    return;
  }
  
  // --- Obtener la URL de destino ---
  let urlDestino = '/ordenes';
  
  // Intentar obtener la URL desde los datos de la notificación
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
    console.log('[FCM SW] URL desde notification.data.url:', urlDestino);
  }
  
  // Intentar obtener del payload original
  if (event.notification.data && event.notification.data.FCM_MSG) {
    const fcmMsg = event.notification.data.FCM_MSG;
    if (fcmMsg.data && fcmMsg.data.url) {
      urlDestino = fcmMsg.data.url;
      console.log('[FCM SW] URL desde FCM_MSG.data.url:', urlDestino);
    }
  }
  
  console.log('[FCM SW] Abriendo URL final:', urlDestino);
  
  // ✅ La lógica es la MISMA tanto para clic en cuerpo como en botón "ver"
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana de nuestra app que ya esté abierta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[FCM SW] Ventana encontrada, enfocando:', client.url);
            client.focus();
            // Si la URL no es la que queremos, la navegamos
            if (client.url !== urlDestino && 'navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        // Si no hay ninguna ventana abierta, abrimos una nueva
        console.log('[FCM SW] No se encontró ventana, abriendo una nueva');
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker de Firebase inicializado y listo para manejar clics');