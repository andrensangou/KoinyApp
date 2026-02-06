
/**
 * Service Worker Koiny v1.0
 * Permet les notifications push et le fonctionnement hors-ligne de base.
 */

const CACHE_NAME = 'koiny-cache-v1';

self.addEventListener('install', (event) => {
    // @ts-ignore
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/favicon.svg'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Stratégie : Network first, fallback to cache
    // @ts-ignore
    event.respondWith(
        // @ts-ignore
        fetch(event.request).catch(() => {
            // @ts-ignore
            return caches.match(event.request);
        })
    );
});

// Écouteur pour les notifications push réelles (si on active VAPID plus tard)
self.addEventListener('push', (event) => {
    // @ts-ignore
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Koiny Alerte';
    const options = {
        body: data.body || 'Une nouveauté sur Koiny !',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    // @ts-ignore
    event.waitUntil(self.registration.showNotification(title, options));
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
    // @ts-ignore
    event.notification.close();
    // @ts-ignore
    const targetUrl = event.notification.data?.url || '/';

    // @ts-ignore
    event.waitUntil(
        // @ts-ignore
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
