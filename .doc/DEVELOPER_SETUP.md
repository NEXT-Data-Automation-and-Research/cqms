# Developer Setup Guide

## Development Mode Toggle

The Supabase status indicator is only visible in **development mode**. To enable it:

### Enable Development Mode

Open your browser's Developer Console (F12) and run:

```javascript
localStorage.setItem('isDev', 'true');
```

Then refresh the page. You'll see the Supabase status indicator in the top-right corner.

### Disable Development Mode (Production/Staging)

To hide the status indicator:

```javascript
localStorage.setItem('isDev', 'false');
// or
localStorage.removeItem('isDev');
```

Then refresh the page.

### Check Current Mode

```javascript
const isDev = localStorage.getItem('isDev') === 'true';
console.log('Development mode:', isDev);
```

## Notes

- The status indicator is **purely visual** - Supabase will still initialize and work normally even when the indicator is hidden
- The `isDev` localStorage variable controls only the visibility of the status indicator
- This allows developers to see connection status during development while keeping the UI clean in production/staging

