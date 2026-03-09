/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import type { ExpirationPlugin as ExpirationPluginType } from 'workbox-expiration';
import type { CacheableResponsePlugin as CacheableResponsePluginType } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets built by Vite (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// ── OAuth: never cache auth redirects ──
registerRoute(
  ({ url }) => url.pathname.startsWith('/~oauth'),
  new NetworkOnly()
);

// ── API calls: network-first with 5-min cache ──
registerRoute(
  ({ url }) => url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ── Google Fonts: cache-first, 1 year ──
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ── Images: cache-first, 30 days ──
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// ── Skip waiting on message ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Push notifications ──
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'LabLink';
    const options: NotificationOptions = {
      body: data.body || data.message,
      icon: data.icon || '/lablink-icon.png',
      badge: data.badge || '/favicon-48x48.png',
      data: {
        url: data.url || data.data?.url || '/dashboard',
        orderId: data.orderId || data.data?.orderId,
        ...data.data,
      },
      tag: data.tag || data.data?.orderId || `lablink-${Date.now()}`,
      requireInteraction: data.requireInteraction ?? true,
    } as NotificationOptions;

    // Add SW-specific options via spread
    const extendedOptions = {
      ...options,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, extendedOptions as any));
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// ── Notification click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  const urlToOpen = data.url || (data.orderId ? `/order-tracking/${data.orderId}` : '/dashboard');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client instanceof WindowClient) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          if (clientUrl.origin === targetUrl.origin) {
            return client.focus().then((focusedClient) => {
              if (focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ── Notification close (analytics hook) ──
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  console.log('Notification closed:', data.notificationId || event.notification.tag);
});
