import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { injectVersionIntoHTML, getAppVersion } from './utils/html-processor.js';
import { getRouteMappings, getFilePathFromCleanPath } from './core/routing/route-mapper.js';

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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

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

// Log startup information
logWithTimestamp('info', '═══════════════════════════════════════════════════════');
logWithTimestamp('info', '🚀 Starting Express Server');
logWithTimestamp('info', '═══════════════════════════════════════════════════════');

// Define which env vars are safe to expose to client
const SAFE_ENV_VARS: string[] = [
  'NODE_ENV',
  'APP_NAME',
  'API_URL',
  'PUBLIC_APP_URL',   // Safe - public app URL for OAuth redirects (e.g. Vercel URL)
  'SUPABASE_URL',      // Safe - public URL
  'SUPABASE_ANON_KEY', // Safe - public anon key (designed to be exposed)
  'VAPID_PUBLIC_KEY',  // Safe - VAPID public key (designed to be exposed to client)
  // Add only non-sensitive variables here
];

// Blacklist of patterns that should NEVER be exposed
const SENSITIVE_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /jwt/i,
  /session/i,
  /cookie[_-]?secret/i,
];

/**
 * Check if an environment variable name is safe to expose
 */
function isSafeEnvVar(varName: string): boolean {
  // Must be explicitly whitelisted
  if (!SAFE_ENV_VARS.includes(varName)) {
    return false;
  }
  
  // Whitelist takes precedence - if explicitly whitelisted, it's safe
  // (This allows VAPID_PUBLIC_KEY even though it contains "key")
  return true;
}

/**
 * Get safe environment variables for client
 */
function getSafeEnvVars(): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  
  // Only include explicitly whitelisted and verified safe variables
  SAFE_ENV_VARS.forEach(varName => {
    if (isSafeEnvVar(varName) && process.env[varName]) {
      safeEnv[varName] = process.env[varName];
    }
  });
  
  return safeEnv;
}

// Request logging middleware (placed early to log all requests)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const timestamp = getTimestamp();
  
  // Log request
  logWithTimestamp('debug', `${req.method} ${req.path}`, {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent')?.substring(0, 50) || 'unknown'
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 500 ? 'error' : 
                       res.statusCode >= 400 ? 'warn' : 
                       res.statusCode >= 300 ? 'debug' : 'debug';
    
    logWithTimestamp(statusColor, `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// ✅ SECURITY: Security headers middleware (helmet)
// Must be early in middleware chain
logWithTimestamp('debug', 'Configuring security middleware (helmet)...');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", // Allows CSS from same origin (including /src/... paths)
        "'unsafe-inline'", // Allow inline styles for Tailwind and dynamic styles
        "https://fonts.googleapis.com", // Allow Google Fonts
        "https://cdn.jsdelivr.net", // Allow jsDelivr CDN for Quill CSS and other libraries
        "https://cdn.quilljs.com" // Allow Quill.js CDN for rich text editor CSS
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline scripts for ES modules
        "'unsafe-eval'", // Required for some ES module features
        "https://cdn.jsdelivr.net", // Allow jsDelivr CDN for loglevel and other libraries
        "https://cdn.tailwindcss.com", // Allow Tailwind CDN
        "https://accounts.google.com", // Allow Google Sign-In script
        "https://cdn.quilljs.com" // Allow Quill.js CDN for rich text editor
      ],
      imgSrc: ["'self'", "data:", "https:"], // Allow images from any HTTPS source
      connectSrc: [
        "'self'", 
        "https://*.supabase.co", 
        "https://*.supabase.in",
        "wss://*.supabase.co", // Allow Supabase Realtime WebSocket connections
        "wss://*.supabase.in", // Allow Supabase Realtime WebSocket connections
        "https://cdn.jsdelivr.net", // Allow jsDelivr CDN for source maps and module loading
        "http://127.0.0.1:7242", // Allow debug logging endpoint
        "ws://127.0.0.1:7242" // Allow WebSocket debug logging endpoint
      ], // Allow Supabase connections, Realtime WebSockets, and CDN
      fontSrc: [
        "'self'", 
        "data:",
        "https://fonts.gstatic.com" // Allow Google Fonts
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Supabase iframe embeds if needed
}));

// ✅ SECURITY: Rate limiting for API endpoints
logWithTimestamp('debug', 'Configuring rate limiting...');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// ✅ SECURITY: Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply stricter rate limiting to auth-related endpoints
app.use('/api/users', authLimiter);
logWithTimestamp('debug', 'Rate limiting configured: API (100/15min), Auth (5/15min)');

// Cache control middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const url = req.path;
  const isHtml = url.endsWith('.html') || url === '/' || url === '/my-activity' || url === '/analytics' || !!getFilePathFromCleanPath(url);
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  if (isHtml) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${appVersion}"`);
  }
  // Static assets (JS, CSS, images) - cache with version
  else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/)) {
    // In development, avoid immutable caching so route/menu changes show up immediately
    if (!isProd) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${appVersion}"`);
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', `"${appVersion}"`);
    }
  }
  // API endpoints - no cache
  else if (url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// ✅ SECURITY: Middleware to automatically inject auth-checker into HTML responses
// This ensures all pages (except auth-page) are automatically protected
// Runs after routes but before static file serving
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const url = req.path;
  const isHtmlPage = url.endsWith('.html') || url === '/' || url === '/my-activity' || url === '/analytics' || !!getFilePathFromCleanPath(url);

  if (!isHtmlPage) {
    return next();
  }

  if (url.includes('auth-page.html') || url === '/' || url === '/index.html') {
    return next();
  }
  
  // Intercept the response to inject auth-checker and analytics if not already present
  const originalSend = res.send;
  res.send = function(body: any) {
    if (typeof body === 'string' && body.trim().startsWith('<!')) {
      // ✅ PRODUCTION: Silence console output globally without touching huge feature files
      const isProd = (process.env.NODE_ENV || 'development') === 'production';
      if (isProd && !body.includes('console-stub.js') && !body.includes('/js/console-stub.js')) {
        const consoleStubScript =
          '  <!-- Console Stub - Auto-injected to silence console in production -->\n' +
          '  <script src="/js/console-stub.js"></script>\n';

        if (/<head[^>]*>/i.test(body)) {
          body = body.replace(/<head[^>]*>/i, (match) => `${match}\n${consoleStubScript}`);
        } else if (body.includes('</head>')) {
          body = body.replace('</head>', `${consoleStubScript}</head>`);
        } else if (/<body[^>]*>/i.test(body)) {
          body = body.replace(/<body[^>]*>/i, (match) => `${match}\n${consoleStubScript}`);
        } else {
          body = `${consoleStubScript}${body}`;
        }
      }

      let scriptsToInject = '';
      if (!body.includes('auth-checker.js') && !body.includes('/js/auth-checker.js')) {
        scriptsToInject += '  <!-- Authentication Guard - Auto-injected for security -->\n  <script type="module" src="/js/auth-checker.js"></script>\n';
      }
      if (!body.includes('analytics-client.js') && !body.includes('/js/utils/analytics-client.js')) {
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

// ✅ SECURITY: Serve public HTML files with auth-checker injection
// These routes MUST be BEFORE express.static to intercept requests
// Audit Reports route - serve migrated Clean Architecture version
app.get('/audit-reports.html', (req: express.Request, res: express.Response): void => {
  try {
    // injectVersionIntoHTML will automatically find the file in feature directories
    const html = injectVersionIntoHTML('audit-reports.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing audit-reports.html:', error);
    // Fallback: try to serve from feature directory directly
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
    const featurePath = path.join(__dirname, 'features/audit-view.html');
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


// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from the src directory (for auth page and other assets)
app.use('/src', express.static(path.join(__dirname, '../src')));

// Serve auth-page.html with version injection
app.get('/src/auth/presentation/auth-page.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('auth/presentation/auth-page.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing auth-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/auth/presentation/auth-page.html'));
  }
});

// Serve home-page.html with version injection (main home page) - MUST be before generic route
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

// Serve help.html with version injection - Direct route handler for /help
app.get('/help', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/help/help/presentation/help.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing help.html:', error);
    const filePath = path.join(__dirname, '../src/features/help/help/presentation/help.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      logWithTimestamp('error', `Help file not found at: ${filePath}`);
      res.status(404).send('Page not found');
    }
  }
});

// Admin Portal Route (integrated with platform layout)
// The admin portal is now part of the main app with sidebar
app.get('/admin-portal', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/admin-portal/presentation/admin-portal.html', appVersion);
    res.send(html);
  } catch (error) {
    logWithTimestamp('error', 'Error processing admin-portal.html:', error);
    const filePath = path.join(__dirname, '../src/features/admin-portal/presentation/admin-portal.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  }
});

// Redirect old admin portal routes to the new integrated page
app.get('/admin-portal/login', (req: express.Request, res: express.Response): void => {
  res.redirect('/admin-portal');
});

app.get('/admin-portal/dashboard', (req: express.Request, res: express.Response): void => {
  res.redirect('/admin-portal');
});

logWithTimestamp('debug', 'Admin portal route registered: /admin-portal');

// ✅ Clean URL Routes - Serve pages via clean URLs (e.g., /home, /settings/scorecards)
// These routes are checked BEFORE the regex fallback for better performance
// Backward compatibility: Old URLs still work via the regex route below
logWithTimestamp('debug', 'Registering clean URL routes...');
const routeMappings = getRouteMappings();
routeMappings.forEach((mapping) => {
  app.get(mapping.cleanPath, (req: express.Request, res: express.Response): void => {
    const htmlPath = mapping.filePath.replace(/^\//, ''); // Remove leading slash for injectVersionIntoHTML
    
    // Skip auth-page.html (handled separately, no auth-checker needed)
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
      // This will automatically inject auth-checker via injectVersionIntoHTML
      const html = injectVersionIntoHTML(htmlPath, appVersion);
      res.send(html);
    } catch (error) {
      logWithTimestamp('error', `Error processing clean route ${mapping.cleanPath} -> ${htmlPath}:`, error);
      // Fallback: try to serve file directly
      const filePath = path.join(__dirname, '..', mapping.filePath);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).send('Page not found');
      }
    }
  });
});

// ✅ SECURITY: Serve all HTML files from src directory with version injection and auto auth-checker
// This catches all feature pages automatically - route must be BEFORE express.static
// Using a more specific pattern that Express supports
// NOTE: Specific routes above must be defined BEFORE this generic route
app.get(/^\/src\/.*\.html$/, (req: express.Request, res: express.Response): void => {
  const htmlPath = req.path.replace('/src/', 'src/');
  
  // Skip auth-page.html (handled separately, no auth-checker needed)
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
    // This will automatically inject auth-checker via injectVersionIntoHTML
    const html = injectVersionIntoHTML(htmlPath, appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error(`Error processing ${htmlPath}:`, error);
    // Fallback: try to serve file directly (auth-checker middleware will inject it)
    const filePath = path.join(__dirname, '..', htmlPath);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  }
});

// Keep dashboard.html route for backward compatibility (redirects to home)
app.get('/dashboard.html', (req: express.Request, res: express.Response): void => {
  res.redirect('/home');
});

// Parse JSON bodies
app.use(express.json());

// ✅ SECURITY: CSRF Protection
import { csrfProtection, csrfToken } from './api/middleware/csrf.middleware.js';

// Add CSRF token to all responses
app.use('/api', csrfToken);

// Apply CSRF protection to state-changing API routes
app.use('/api', csrfProtection);

// Lightweight CSRF bootstrap endpoint.
// Clients can call this with Authorization header to obtain X-CSRF-Token
// without depending on any auth-protected business route.
app.get('/api/csrf', (_req: express.Request, res: express.Response): void => {
  res.status(204).end();
});

// API Routes
logWithTimestamp('debug', 'Loading API routes...');
import usersRouter from './api/routes/users.routes.js';
import notificationsRouter from './api/routes/notifications.routes.js';
import notificationSubscriptionsRouter from './api/routes/notification-subscriptions.routes.js';
import peopleRouter from './api/routes/people.routes.js';
import permissionsRouter from './api/routes/permissions.routes.js';
import analyticsRouter from './api/routes/analytics.routes.js';
import adminRouter from './api/routes/admin.routes.js';
import platformNotificationsRouter from './api/routes/platform-notifications.routes.js';
import cacheManagementRouter from './api/routes/cache-management.routes.js';
import activeUsersRouter from './api/routes/active-users.routes.js';
import { errorHandler } from './api/middleware/error-handler.middleware.js';

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
logWithTimestamp('debug', 'API routes loaded: /api/users, /api/notifications, /api/people, /api/notification-subscriptions, /api/permissions, /api/analytics, /api/admin, /api/platform-notifications');

// Error handler (must be last)
app.use(errorHandler);


// Serve index.html for root route (with version injection)
// Note: index.html handles auth and redirects authenticated users to /home
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
  
  // Add Supabase configuration (safe to expose - these are public keys)
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

  // Public app URL for OAuth redirects (required when hosting on Vercel etc.)
  const publicAppUrl = process.env.PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (publicAppUrl) {
    safeEnv.PUBLIC_APP_URL = publicAppUrl;
  }

  // Log Supabase configuration status to terminal
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

// Start server
const server = app.listen(PORT, () => {
  logWithTimestamp('info', '═══════════════════════════════════════════════════════');
  logWithTimestamp('info', '✅ Server started successfully!');
  logWithTimestamp('info', '═══════════════════════════════════════════════════════');
  logWithTimestamp('info', `📍 URL: http://localhost:${PORT}`);
  logWithTimestamp('info', `📁 Public directory: ${path.join(__dirname, '../public')}`);
  logWithTimestamp('info', `📦 App version: ${appVersion}`);
  logWithTimestamp('info', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logWithTimestamp('info', `📝 Log level: ${process.env.LOG_LEVEL || 'debug'}`);
  
  // Log route mappings count
  const routeMappings = getRouteMappings();
  logWithTimestamp('info', `🛣️  Registered routes: ${routeMappings.length} clean URL mappings`);
  
  // Log Supabase configuration status
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY;
  if (hasSupabaseUrl && hasSupabaseKey) {
    logWithTimestamp('info', '🔐 Supabase: Configuration loaded');
  } else {
    logWithTimestamp('warn', '⚠️  Supabase: Configuration incomplete');
  }
  
  logWithTimestamp('info', '═══════════════════════════════════════════════════════');
  logWithTimestamp('info', '📡 Server ready to accept connections');
  logWithTimestamp('info', '═══════════════════════════════════════════════════════');
});

// Handle server errors (e.g., port already in use)
server.on('error', (error: NodeJS.ErrnoException) => {
  logWithTimestamp('error', '═══════════════════════════════════════════════════════');
  logWithTimestamp('error', '❌ Server startup failed!');
  logWithTimestamp('error', '═══════════════════════════════════════════════════════');
  
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp('error', `Port ${PORT} is already in use.`);
    logWithTimestamp('error', '');
    logWithTimestamp('error', 'Solutions:');
    logWithTimestamp('error', `  1. Stop the other process using port ${PORT}`);
    logWithTimestamp('error', `  2. Set a different PORT in your .env file`);
    logWithTimestamp('error', '');
    logWithTimestamp('error', 'To find and kill the process on Windows:');
    logWithTimestamp('error', `  netstat -ano | findstr :${PORT}`);
    logWithTimestamp('error', `  taskkill /PID <PID> /F`);
  } else {
    logWithTimestamp('error', 'Server error:', error);
  }
  
  logWithTimestamp('error', '═══════════════════════════════════════════════════════');
  process.exit(1);
});

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  logWithTimestamp('info', `${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logWithTimestamp('info', 'Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log when nodemon restarts (if running in nodemon)
if (process.env.nodemon) {
  logWithTimestamp('info', '🔄 Running under nodemon - server will auto-restart on file changes');
}

