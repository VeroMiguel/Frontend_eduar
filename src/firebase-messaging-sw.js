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

// ✅ Manejar click en notificación (ABRE LA APP) - VERSIÓN MEJORADA
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación:', event);
  
  // Cerrar la notificación inmediatamente
  event.notification.close();
  
  // Detener la propagación si se hizo clic en un botón de acción
  if (event.action === 'cerrar') {
    return;
  }
  
  // --- MEJORA 2: Obtener la URL de los datos de la notificación ---
  let urlDestino = '/ordenes'; // URL por defecto
  
  // 1. Intentar obtener la URL desde los datos de la notificación
  if (event.notification.data && event.notification.data.url) {
    urlDestino = event.notification.data.url;
  }
  
  // 2. Si no, intentar obtenerla del payload original (FCM_MSG)
  if (event.notification.data && event.notification.data.FCM_MSG) {
    const fcmMsg = event.notification.data.FCM_MSG;
    if (fcmMsg.data && fcmMsg.data.url) {
      urlDestino = fcmMsg.data.url;
    } else if (fcmMsg.fcmOptions && fcmMsg.fcmOptions.link) {
      urlDestino = fcmMsg.fcmOptions.link;
    }
  }
  
  console.log('[FCM SW] Abriendo URL:', urlDestino);
  
  // --- MEJORA 3: Lógica más robusta para abrir/focalizar la ventana ---
  // Esto sigue las mejores prácticas de `clients.openWindow()` [citation:5][citation:8]
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana de nuestra app que ya esté abierta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Si la encontramos, la traemos al frente
            client.focus();
            // Y si la URL no es la que queremos, la navegamos a la correcta
            if (client.url !== urlDestino && 'navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        // Si no hay ninguna ventana abierta, abrimos una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

console.log('[FCM SW] ✅ Service Worker de Firebase inicializado y listo para manejar clics');