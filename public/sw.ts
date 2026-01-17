/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications from server
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
      vibrate: [200, 100, 200],
      tag: data.tag || data.data?.orderId || `lablink-${Date.now()}`,
      requireInteraction: data.requireInteraction ?? true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  
  // If user clicked dismiss, just close
  if (action === 'dismiss') {
    return;
  }

  // Determine URL to open
  const urlToOpen = data.url || (data.orderId ? `/order-tracking/${data.orderId}` : '/dashboard');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with our app
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        
        // If we have a window on our domain, focus it and navigate
        if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to the target URL
            if ('navigate' in client) {
              return (client as any).navigate(urlToOpen);
            }
            // Fallback: post message to navigate
            client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
          });
        }
      }
      // If no window open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  console.log('Notification closed:', data.notificationId || event.notification.tag);
});

export {};