# Development Log Levels Guide

## Current Setup

The project uses `loglevel` package for logging with the following configuration:

### Log Levels (from most to least verbose):
1. **`trace`** - Very detailed debugging (function entry/exit, variable values)
2. **`debug`** - Detailed debugging info (queries, data transformations)
3. **`info`** - Important events (profile loaded, enrichment completed)
4. **`warn`** - Warnings (fallbacks used, missing data)
5. **`error`** - Errors (RLS blocking, query failures)
6. **`silent`** - No logs

## Recommended Log Levels for Development

### Browser (Client-Side)
- **Development**: `debug` - See all logs in browser console
- **Production**: `warn` - Only warnings and errors

### Node.js (Server-Side)
- **Development**: `debug` - See all logs in terminal
- **Production**: `warn` - Only warnings and errors

## When to Use Each Log Level

### `debug` - Use for:
- Function entry/exit
- Query parameters and results
- Data transformations
- State changes
- Detailed flow tracking

**Example:**
```typescript
personLogger.debug('Fetching supervisor name', { email: supervisorEmail });
personLogger.debug('Query successful', { rowCount: data.length });
```

### `info` - Use for:
- Important business events
- Successful operations
- Profile loaded
- Enrichment completed
- User actions

**Example:**
```typescript
personLogger.info('Profile loaded from people table', { email: data.email });
personLogger.info('Enriched profile with supervisor name', { name: supervisorName });
```

### `warn` - Use for:
- Fallback operations
- Missing optional data
- Deprecated features
- Non-critical errors

**Example:**
```typescript
personLogger.warn('Supervisor name not found, using email', { email: supervisorEmail });
personLogger.warn('People table not found, trying users table');
```

### `error` - Use for:
- RLS policy blocking access
- Query failures
- Authentication errors
- Critical failures

**Example:**
```typescript
personLogger.error('RLS POLICY BLOCKING ACCESS!', { error: error.message });
personLogger.error('Error loading person profile', { code: error.code });
```

## Best Practices

1. **Use structured logging** - Always include context objects:
   ```typescript
   // ✅ Good
   personLogger.info('Profile loaded', { email: data.email, teamSupervisor: data.team_supervisor });
   
   // ❌ Bad
   personLogger.info('Profile loaded');
   ```

2. **Don't log sensitive data** - Never log passwords, tokens, or PII:
   ```typescript
   // ✅ Good
   personLogger.debug('User authenticated', { userId: user.id });
   
   // ❌ Bad
   personLogger.debug('User authenticated', { password: user.password });
   ```

3. **Use appropriate levels** - Don't use `error` for warnings:
   ```typescript
   // ✅ Good
   personLogger.warn('Supervisor not found');
   
   // ❌ Bad
   personLogger.error('Supervisor not found'); // This is not an error!
   ```

4. **Remove debug logs before production** - Or use environment checks:
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     personLogger.debug('Detailed debug info');
   }
   ```

5. **Use console.log sparingly** - Only for critical debugging that must always show:
   ```typescript
   // ✅ Good - Critical debugging
   console.log('🔴 CRITICAL ERROR:', error);
   
   // ❌ Bad - Use logger instead
   console.log('Profile loaded'); // Should use personLogger.info()
   ```

## Current Configuration

The logger automatically detects the environment:

- **Browser (localhost/127.0.0.1)**: `debug` level
- **Browser (production)**: `warn` level
- **Node.js (development)**: `debug` level
- **Node.js (production)**: `warn` level

You can override the log level by:
1. Adding `?debug=true` to the URL
2. Setting `localStorage.setItem('LOG_LEVEL', 'debug')` in browser console

