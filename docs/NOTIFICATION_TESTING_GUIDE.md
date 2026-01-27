# Notification System Testing Guide

## Overview

This guide explains how to test the notification system that has been implemented in the QMS application.

## Components

### 1. Database Schema
- **Table**: `notifications` - Stores notification records
- **Table**: `notification_subscriptions` - Stores web push notification subscriptions
- **Field**: `users.notification_preferences` - Stores user notification preferences

### 2. API Endpoints

#### GET `/api/notifications`
- Fetches notifications for the authenticated user
- Query parameters:
  - `status` (optional): Filter by status (pending, sent, read, failed)
  - `limit` (optional, default: 50): Number of results
  - `offset` (optional, default: 0): Pagination offset

#### POST `/api/notifications`
- Creates a new notification
- Body:
  ```json
  {
    "title": "Notification Title",
    "body": "Notification body text",
    "type": "info|success|warning|error",
    "category": "system|task|message|reminder",
    "icon_url": "optional icon URL",
    "image_url": "optional image URL",
    "action_url": "optional action URL",
    "metadata": {}
  }
  ```

#### POST `/api/notifications/test`
- Creates a test notification for the current user
- Body:
  ```json
  {
    "type": "info",
    "title": "Test Notification",
    "body": "Test body"
  }
  ```

#### PATCH `/api/notifications/:id`
- Updates a notification (e.g., mark as read)
- Body:
  ```json
  {
    "status": "read",
    "read_at": "2025-01-26T10:00:00Z"
  }
  ```

#### DELETE `/api/notifications/:id`
- Deletes a notification

### 3. Frontend Components

#### Notification Consent Modal
- Location: `src/features/notifications/presentation/notification-consent-modal.html`
- Automatically shows when:
  - User logs in from a new device
  - User hasn't given consent yet

#### Notification Consent Manager
- Location: `src/features/notifications/presentation/notification-consent-manager.ts`
- Handles:
  - Checking if consent is needed
  - Requesting browser notification permissions
  - Subscribing to push notifications
  - Saving user preferences

#### Notification Display
- Integrated into home page (`home-page.html`)
- Shows notifications in a dropdown when hovering over the notification bell icon
- Displays unread count badge

## Testing Methods

### Method 1: Using the Test Page

1. Navigate to: `http://localhost:4000/notification-test.html`
2. Use the buttons to:
   - Create test notifications
   - Fetch and display notifications
   - Test consent modal
   - Check consent status

### Method 2: Using Browser Console

1. Open the home page: `http://localhost:4000/home`
2. Open browser console (F12)
3. Use these commands:

```javascript
// Create a test notification
testNotification('info', 'Test Title', 'Test Body');

// Fetch notifications
fetch('/api/notifications')
  .then(r => r.json())
  .then(data => console.log(data));

// Show consent modal (if consent manager is initialized)
// This requires the page to have loaded the consent manager
```

### Method 3: Using API Directly

#### Using curl:

```bash
# Create a test notification (requires authentication cookie)
curl -X POST http://localhost:4000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"type":"info","title":"Test","body":"Test notification"}'

# Fetch notifications
curl http://localhost:4000/api/notifications
```

#### Using Postman/Insomnia:

1. Set up authentication (use cookies from browser session)
2. POST to `/api/notifications/test` with JSON body
3. GET from `/api/notifications` to retrieve notifications

## Testing Checklist

### ✅ Notification Creation
- [ ] Create notification via API
- [ ] Create notification via test page
- [ ] Create notification via browser console
- [ ] Verify notification appears in database
- [ ] Verify notification appears in UI

### ✅ Notification Display
- [ ] Notifications load on home page
- [ ] Unread count badge displays correctly
- [ ] Notification dropdown shows notifications
- [ ] Notifications are sorted by date (newest first)
- [ ] Notification styling is correct

### ✅ Notification Consent
- [ ] Consent modal appears for new devices
- [ ] "Allow Notifications" button requests browser permission
- [ ] "Save Preferences" button saves preferences
- [ ] "Skip" button dismisses modal
- [ ] Preferences are saved to database
- [ ] Browser permission status is tracked

### ✅ Push Notifications (if VAPID keys configured)
- [ ] Service worker registers successfully
- [ ] Push subscription is created
- [ ] Subscription is saved to database
- [ ] Push notifications can be sent (requires server-side push service)

### ✅ Notification Updates
- [ ] Mark notification as read
- [ ] Delete notification
- [ ] Update notification status

## Common Issues

### Issue: Consent modal doesn't appear
**Solution**: 
- Check if user is authenticated
- Check browser console for errors
- Verify `NotificationConsentManager` is initialized
- Check if consent has already been given (check `users.notification_preferences`)

### Issue: Notifications don't appear
**Solution**:
- Verify notifications exist in database
- Check API endpoint returns data
- Check browser console for errors
- Verify user is authenticated
- Check notification status (should be 'pending' or 'sent')

### Issue: Push notifications don't work
**Solution**:
- Verify VAPID keys are configured in `.env`
- Check service worker is registered (`/sw.js`)
- Verify browser supports push notifications
- Check browser permission is granted
- Verify subscription is saved to `notification_subscriptions` table

## Database Queries for Testing

```sql
-- Check notifications for a user
SELECT * FROM notifications 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;

-- Check notification subscriptions
SELECT * FROM notification_subscriptions 
WHERE user_id = 'your-user-id' 
AND is_active = true;

-- Check user notification preferences
SELECT id, email, notification_preferences 
FROM users 
WHERE id = 'your-user-id';

-- Create a test notification manually
INSERT INTO notifications (user_id, title, body, type, status)
VALUES (
  'your-user-id',
  'Manual Test Notification',
  'This was created manually',
  'info',
  'pending'
);
```

## Next Steps

1. **Configure VAPID Keys** (for push notifications):
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```
   Add the keys to `.env`:
   ```
   VAPID_PUBLIC_KEY=your-public-key
   VAPID_PRIVATE_KEY=your-private-key
   ```

2. **Set up Push Notification Service**:
   - Create a service to send push notifications
   - Use `web-push` library to send notifications
   - Trigger notifications on events (audit assignments, reversals, etc.)

3. **Add Email Notifications**:
   - Integrate email service (SendGrid, AWS SES, etc.)
   - Send emails when notifications are created
   - Respect user email preferences

4. **Add Notification Categories**:
   - System notifications
   - Task notifications
   - Message notifications
   - Reminder notifications

## Files Modified/Created

- `src/api/routes/notifications.routes.ts` - API endpoints
- `src/features/notifications/presentation/notification-consent-modal.html` - Consent modal UI
- `src/features/notifications/presentation/notification-consent-manager.ts` - Consent logic
- `src/features/home/presentation/home-page.html` - Notification display integration
- `src/features/notifications/presentation/notification-test.html` - Test page
- `docs/NOTIFICATION_TESTING_GUIDE.md` - This guide
