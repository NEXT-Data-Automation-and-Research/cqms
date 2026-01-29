/**
 * Vercel Serverless Function Entry Point
 * This file wraps the Express app for Vercel's serverless environment
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../src/utils/logger.js';
import { injectVersionIntoHTML, getAppVersion } from '../src/utils/html-processor.js';
import { getRouteMappings } from '../src/core/routing/route-mapper.js';

// Load environment variables
dotenv.config();

// Initialize logger
const serverLogger = createLogger('Server');

// Helper function to format timestamps
const getTimestamp = (): string => {
  return new Date().toISOString();
};

// Helper function to format log messages with timestamp
const logWithTimestamp = (level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}]`;
  switch (level) {
    case 'info':
      serverLogger.info(prefix, message, ...args);
      break;
    case 'warn':
      serverLogger.warn(prefix, message, ...args);
      break;
    case 'error':
      serverLogger.error(prefix, message, ...args);
      break;
    case 'debug':
      serverLogger.debug(prefix, message, ...args);
      break;
  }
};

const app = express();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load app version at startup
let appVersion: string = getAppVersion();
try {
  const versionPath = path.join(__dirname, '../public/version.json');
  if (fs.existsSync(versionPath)) {
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    appVersion = versionData.hash || versionData.version || '1.0.0';
    logWithTimestamp('info', `App version: ${appVersion}`);
  }
} catch (error) {
  logWithTimestamp('warn', 'Version file not found, using default version');
}

// Define which env vars are safe to expose to client
const SAFE_ENV_VARS: string[] = [
  'NODE_ENV',
  'APP_NAME',
  'API_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VAPID_PUBLIC_KEY',
  'ANALYTICS_ENABLED',
];

/**
 * Check if an environment variable name is safe to expose
 */
function isSafeEnvVar(varName: string): boolean {
  if (!SAFE_ENV_VARS.includes(varName)) {
    return false;
  }
  return true;
}

/**
 * Get safe environment variables for client
 */
function getSafeEnvVars(): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  
  SAFE_ENV_VARS.forEach(varName => {
    if (isSafeEnvVar(varName) && process.env[varName]) {
      safeEnv[varName] = process.env[varName];
    }
  });
  
  return safeEnv;
}

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const timestamp = getTimestamp();
  
  logWithTimestamp('debug', `${req.method} ${req.path}`, {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent')?.substring(0, 50) || 'unknown'
  });
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 500 ? 'error' : 
                       res.statusCode >= 400 ? 'warn' : 
                       res.statusCode >= 300 ? 'debug' : 'debug';
    
    logWithTimestamp(statusColor, `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Security headers middleware (helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://cdn.quilljs.com"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdn.tailwindcss.com",
        "https://accounts.google.com",
        "https://cdn.quilljs.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'", 
        "https://*.supabase.co", 
        "https://*.supabase.in",
        "wss://*.supabase.co",
        "wss://*.supabase.in",
        "https://cdn.jsdelivr.net",
        "http://127.0.0.1:7242",
        "ws://127.0.0.1:7242"
      ],
      fontSrc: [
        "'self'", 
        "data:",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use('/api/users', authLimiter);

// Cache control middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const url = req.path;
  const isHtml = url.endsWith('.html') || url === '/' || url === '/my-activity' || url === '/analytics';

  if (isHtml) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${appVersion}"`);
  }
  else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${appVersion}"`);
  }
  else if (url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Middleware to automatically inject auth-checker into HTML responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const url = req.path;
  const isHtmlPage = url.endsWith('.html') || url === '/' || url === '/my-activity' || url === '/analytics';

  if (!isHtmlPage) {
    return next();
  }

  if (url.includes('auth-page.html') || url === '/' || url === '/index.html') {
    return next();
  }
  
  const originalSend = res.send;
  res.send = function(body: any) {
    if (typeof body === 'string' && body.trim().startsWith('<!')) {
      const hasAuthChecker = body.includes('auth-checker.js') || body.includes('/js/auth-checker.js');
      const hasAnalytics = body.includes('analytics-client.js') || body.includes('/js/utils/analytics-client.js');
      let scriptsToInject = '';
      if (!hasAuthChecker) {
        scriptsToInject += '  <!-- Authentication Guard - Auto-injected for security -->\n  <script type="module" src="/js/auth-checker.js"></script>\n';
      }
      if (!hasAnalytics) {
        scriptsToInject += '  <!-- Analytics - automatic, invisible page view tracking -->\n  <script type="module" src="/js/utils/analytics-client.js"></script>\n';
      }
      if (scriptsToInject) {
        if (body.includes('</body>')) {
          body = body.replace('</body>', `${scriptsToInject}</body>`);
        } else if (body.includes('</html>')) {
          body = body.replace('</html>', `${scriptsToInject}</html>`);
        } else {
          body = body + '\n' + scriptsToInject;
        }
      }
    }
    return originalSend.call(this, body);
  };
  
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from the src directory
app.use('/src', express.static(path.join(__dirname, '../src')));

// Specific routes
app.get('/audit-reports.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('audit-reports.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing audit-reports.html:', error);
    const featurePath = path.join(__dirname, '../src/features/audit-reports/presentation/audit-reports.html');
    if (fs.existsSync(featurePath)) {
      res.sendFile(featurePath);
    } else {
      res.status(404).send('Audit Reports page not found');
    }
  }
});

// Audit View page - displays detailed audit information
app.get('/audit-view.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/audit-view.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing audit-view.html:', error);
    const featurePath = path.join(__dirname, '../src/features/audit-view.html');
    if (fs.existsSync(featurePath)) {
      res.sendFile(featurePath);
    } else {
      res.status(404).send('Audit View page not found');
    }
  }
});

app.get('/event-management.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('event-management.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing event-management.html:', error);
    res.sendFile(path.join(__dirname, '../public', 'event-management.html'));
  }
});

app.get('/profile.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('profile.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing profile.html:', error);
    res.sendFile(path.join(__dirname, '../public', 'profile.html'));
  }
});

app.get('/src/auth/presentation/auth-page.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('auth/presentation/auth-page.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing auth-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/auth/presentation/auth-page.html'));
  }
});

app.get('/src/features/home/presentation/home-page.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/home/presentation/home-page.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing home-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/features/home/presentation/home-page.html'));
  }
});

// Explicit clean URL routes for analytics pages (ensure they work regardless of route-mapper cache)
app.get('/my-activity', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/analytics/presentation/my-activity.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing my-activity.html:', error);
    const filePath = path.join(__dirname, '../src/features/analytics/presentation/my-activity.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  }
});

app.get('/analytics', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/analytics/presentation/analytics.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing analytics.html:', error);
    const filePath = path.join(__dirname, '../src/features/analytics/presentation/analytics.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  }
});

// Clean URL Routes
const routeMappings = getRouteMappings();
routeMappings.forEach((mapping) => {
  app.get(mapping.cleanPath, (req: express.Request, res: express.Response): void => {
    const htmlPath = mapping.filePath.replace(/^\//, '');
    
    if (htmlPath.includes('auth-page.html')) {
      try {
        const html = injectVersionIntoHTML(htmlPath, appVersion);
        res.send(html);
      } catch (error) {
        logWithTimestamp('error', `Error processing ${htmlPath}:`, error);
        res.sendFile(path.join(__dirname, '..', mapping.filePath));
      }
      return;
    }
    
    try {
      const html = injectVersionIntoHTML(htmlPath, appVersion);
      res.send(html);
    } catch (error) {
      logWithTimestamp('error', `Error processing clean route ${mapping.cleanPath} -> ${htmlPath}:`, error);
      const filePath = path.join(__dirname, '..', mapping.filePath);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).send('Page not found');
      }
    }
  });
});

// Generic HTML route handler
app.get(/^\/src\/.*\.html$/, (req: express.Request, res: express.Response): void => {
  const htmlPath = req.path.replace('/src/', 'src/');
  
  if (htmlPath.includes('auth-page.html')) {
    try {
      const html = injectVersionIntoHTML(htmlPath, appVersion);
      res.send(html);
    } catch (error) {
      logWithTimestamp('error', `Error processing ${htmlPath}:`, error);
      res.sendFile(path.join(__dirname, '..', htmlPath));
    }
    return;
  }
  
  try {
    const html = injectVersionIntoHTML(htmlPath, appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error(`Error processing ${htmlPath}:`, error);
    const filePath = path.join(__dirname, '..', htmlPath);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  }
});

app.get('/dashboard.html', (req: express.Request, res: express.Response): void => {
  res.redirect('/home');
});

// Parse JSON bodies
app.use(express.json());

// CSRF Protection
import { csrfProtection, csrfToken } from '../src/api/middleware/csrf.middleware.js';

app.use('/api', csrfToken);
app.use('/api', csrfProtection);

// Lightweight CSRF bootstrap endpoint.
// Clients can call this with Authorization header to obtain X-CSRF-Token
// without depending on any auth-protected business route.
app.get('/api/csrf', (_req: express.Request, res: express.Response): void => {
  res.status(204).end();
});

// API Routes
import usersRouter from '../src/api/routes/users.routes.js';
import notificationsRouter from '../src/api/routes/notifications.routes.js';
import notificationSubscriptionsRouter from '../src/api/routes/notification-subscriptions.routes.js';
import peopleRouter from '../src/api/routes/people.routes.js';
import permissionsRouter from '../src/api/routes/permissions.routes.js';
import analyticsRouter from '../src/api/routes/analytics.routes.js';
import adminRouter from '../src/api/routes/admin.routes.js';
import platformNotificationsRouter from '../src/api/routes/platform-notifications.routes.js';
import cacheManagementRouter from '../src/api/routes/cache-management.routes.js';
import activeUsersRouter from '../src/api/routes/active-users.routes.js';
import { errorHandler } from '../src/api/middleware/error-handler.middleware.js';

app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/people', peopleRouter);
app.use('/api/notification-subscriptions', notificationSubscriptionsRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/platform-notifications', platformNotificationsRouter);
app.use('/api/cache', cacheManagementRouter);
app.use('/api/active-users', activeUsersRouter);

// Error handler (must be last)
app.use(errorHandler);

// Serve index.html for root route
app.get('/', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('index.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing index.html:', error);
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  }
});

// API endpoint to get environment variables (client-safe only)
app.get('/api/env', (req: express.Request, res: express.Response): void => {
  const safeEnv = getSafeEnvVars();
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const hasSupabaseUrl = !!supabaseUrl;
  const hasSupabaseKey = !!supabaseKey;
  
  if (hasSupabaseUrl && supabaseUrl) {
    safeEnv.SUPABASE_URL = supabaseUrl;
  }
  if (hasSupabaseKey && supabaseKey) {
    safeEnv.SUPABASE_ANON_KEY = supabaseKey;
  }
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    logWithTimestamp('info', 'Supabase: Configuration available - Client can initialize');
  } else {
    logWithTimestamp('warn', 'Supabase: Configuration incomplete - Missing URL or Anon Key');
  }
  
  res.json(safeEnv);
});

// API endpoint to get app version
app.get('/api/version', (req: express.Request, res: express.Response): void => {
  try {
    const versionPath = path.join(__dirname, '../public/version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      res.json(versionData);
    } else {
      res.json({ 
        version: appVersion, 
        timestamp: Date.now(),
        hash: appVersion,
        buildTime: new Date().toISOString()
      });
    }
  } catch (error) {
    logWithTimestamp('error', 'Error reading version:', error);
    res.json({ 
      version: appVersion, 
      timestamp: Date.now(),
      hash: appVersion
    });
  }
});

// Export the Express app for Vercel serverless functions
export default app;
