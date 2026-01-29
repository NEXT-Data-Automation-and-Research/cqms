/**
 * Service Worker for Push Notifications
 * Handles push notification events and displays notifications to users
 */

const CACHE_NAME = 'qms-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/theme.css',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch(() => {
        // Intentionally silent in production
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: 'notification',
    requireInteraction: false,
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      // If not JSON, try text
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon || '/icon.png',
      badge: notificationData.badge || '/badge.png',
      tag: notificationData.tag || 'notification',
      requireInteraction: notificationData.requireInteraction || false,
      data: notificationData.data || {},
      actions: notificationData.actions || [],
      vibrate: notificationData.vibrate || [200, 100, 200],
    })
  );
});

// Notification click event - handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  // Intentionally silent in production
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Handle cache clear command from admin broadcast
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      (async () => {
        try {
          // Delete all caches
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              return caches.delete(cacheName);
            })
          );
          
          // Notify all clients that caches are cleared
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHES_CLEARED',
              timestamp: new Date().toISOString()
            });
          });
          
        } catch (error) {
          // Intentionally silent in production
        }
      })()
    );
  }
});

