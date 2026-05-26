/**
 * service-worker.js — Lab.Rosas
 * Service Worker principal de la aplicación.
 */

const CACHE_NAME = 'labrosas-v2';
const APP_SHELL = ['/'];

// ─── Instalación ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Error cacheando app shell:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activación ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker v2 activado');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Notificaciones Push ──────────────────────────────────────────────────────
// ✅ IMPORTANTE: Este manejador DEBE pasar la notificación a Firebase SW
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida, pasando a Firebase SW...');
  
  // ✅ No hacer nada aquí, dejar que firebase-messaging-sw.js maneje la notificación
  // Solo asegurar que el evento no se pierda
  event.waitUntil(Promise.resolve());
});

// ─── Click en notificación ────────────────────────────────────────────────────
// ✅ Este manejador debe ser neutral para que Firebase SW tome el control
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación, delegando a Firebase SW...');
  
  // ✅ No hacer nada aquí, dejar que firebase-messaging-sw.js maneje el clic
  // Solo cerrar la notificación para que no se duplique
  event.notification.close();
  event.waitUntil(Promise.resolve());
});

// ─── Mensajes desde la app ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { titulo, cuerpo, tag, url } = event.data;
    self.registration.showNotification(titulo || '📋 Lab.Rosas', {
      body: cuerpo || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `sw-notif-${Date.now()}`,
      data: { url: url || '/ordenes' },
      vibrate: [150, 80, 150]
    });
  }
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar peticiones a la API ni a Firebase
  if (url.pathname.startsWith('/api')) return;
  if (url.hostname.includes('firebase') || url.hostname.includes('google')) return;
  if (url.pathname === '/firebase-messaging-sw.js') return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuestas exitosas de assets estáticos
        if (response.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.woff2')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});