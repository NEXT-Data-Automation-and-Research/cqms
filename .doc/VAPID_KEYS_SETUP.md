# VAPID Keys Setup Complete ✅

## What Was Configured

### 1. Server Configuration ✅
- Added `VAPID_PUBLIC_KEY` to the safe environment variables whitelist
- Server now exposes `VAPID_PUBLIC_KEY` to the client via `/api/env` endpoint
- Updated security logic to allow whitelisted variables (whitelist takes precedence)

### 2. Client Configuration ✅
- `notification-subscriptions.ts` reads `VAPID_PUBLIC_KEY` from `window.env`
- Added warning if VAPID key is missing
- Ready to use in `subscribeToPushNotifications()` function

### 3. Environment Template ✅
- Updated `env.template` with VAPID keys section and documentation

## Your Current Setup

You have added the VAPID keys to your `.env` file:
- ✅ `VAPID_PUBLIC_KEY` - Your public key (safe to expose)
- ✅ `VAPID_PRIVATE_KEY` - Your private key (server-side only, never exposed)

## How It Works

1. **Server Side:**
   - Reads `VAPID_PUBLIC_KEY` from `.env`
   - Exposes it via `/api/env` endpoint
   - `VAPID_PRIVATE_KEY` stays on server (never exposed)

2. **Client Side:**
   - Fetches environment variables from `/api/env`
   - Stores in `window.env`
   - `getVapidPublicKey()` reads from `window.env.VAPID_PUBLIC_KEY`
   - Used when subscribing to push notifications

## Testing the Setup

### 1. Restart Your Server
```bash
npm run serve
# or
npm run dev
```

### 2. Check if VAPID Key is Exposed
Open browser console and run:
```javascript
fetch('/api/env')
  .then(r => r.json())
  .then(env => console.log('VAPID_PUBLIC_KEY:', env.VAPID_PUBLIC_KEY ? '✅ Found' : '❌ Missing'));
```

### 3. Test Push Notification Subscription
```javascript
import { subscribeToPushNotifications } from './utils/notification-subscriptions.js';
import { getCurrentSupabaseUser } from './utils/auth.js';

const user = await getCurrentSupabaseUser();
if (user) {
  const subscription = await subscribeToPushNotifications(user.id);
  if (subscription) {
    console.log('✅ Successfully subscribed to push notifications!');
  }
}
```

## Next Steps

### 1. Create Service Worker
You'll need to create a service worker file (`public/sw.js` or similar) to handle push events:

```javascript
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: '/badge.png',
    data: data.actionUrl
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
```

### 2. Register Service Worker
In your main app code, register the service worker:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('Service Worker registered'))
    .catch(error => console.error('Service Worker registration failed:', error));
}
```

### 3. Backend Notification Sender
Create a backend endpoint or function to send notifications:

```typescript
import webpush from 'web-push';
import { getUserNotificationSubscriptions } from './utils/notification-subscriptions.js';

// Set VAPID details
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Contact email
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Send notification
async function sendNotification(userId: string, title: string, body: string) {
  const subscriptions = await getUserNotificationSubscriptions(userId);
  
  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon.png',
    actionUrl: '/notifications'
  });
  
  const promises = subscriptions.map(sub => 
    webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      },
      payload
    ).catch(error => {
      console.error('Error sending notification:', error);
      // Optionally deactivate failed subscriptions
      if (error.statusCode === 410) {
        deactivateNotificationSubscription(sub.endpoint, userId);
      }
    })
  );
  
  await Promise.all(promises);
}
```

## Security Notes

✅ **VAPID_PUBLIC_KEY:**
- Safe to expose to client
- Already configured to be exposed via `/api/env`
- Used in browser for subscription

🔒 **VAPID_PRIVATE_KEY:**
- NEVER exposed to client
- Only used on server-side
- Stored securely in `.env` (already in `.gitignore`)

## Troubleshooting

### VAPID_PUBLIC_KEY not found in client
1. Check `.env` file has `VAPID_PUBLIC_KEY` set
2. Restart the server
3. Check browser console for errors
4. Verify `/api/env` endpoint returns the key

### Push subscription fails
1. Ensure service worker is registered
2. Check browser supports push notifications
3. Verify VAPID public key is correct
4. Check browser console for errors

### Notifications not received
1. Check subscription is saved in database
2. Verify subscription is active (`is_active = true`)
3. Check backend notification sender is using correct VAPID keys
4. Verify service worker is handling push events

## Summary

✅ VAPID keys added to `.env`
✅ Server configured to expose public key
✅ Client code ready to use VAPID key
✅ Environment template updated

**You're all set!** The VAPID keys are properly configured. Next, implement the service worker and backend notification sender to complete the push notification system.

