import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { injectVersionIntoHTML, getAppVersion } from './utils/html-processor.js';

// Load environment variables
dotenv.config();

// Initialize logger
const serverLogger = createLogger('Server');

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
    serverLogger.info(`App version: ${appVersion}`);
  }
} catch (error) {
  serverLogger.warn('Version file not found, using default version');
}

// Define which env vars are safe to expose to client
const SAFE_ENV_VARS: string[] = [
  'NODE_ENV',
  'APP_NAME',
  'API_URL',
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

// ✅ SECURITY: Security headers middleware (helmet)
// Must be early in middleware chain
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", // Allows CSS from same origin (including /src/... paths)
        "'unsafe-inline'", // Allow inline styles for Tailwind and dynamic styles
        "https://fonts.googleapis.com", // Allow Google Fonts
        "https://cdn.jsdelivr.net" // Allow jsDelivr CDN for Quill CSS and other libraries
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline scripts for ES modules
        "'unsafe-eval'", // Required for some ES module features
        "https://cdn.jsdelivr.net", // Allow jsDelivr CDN for loglevel and other libraries
        "https://cdn.tailwindcss.com", // Allow Tailwind CDN
        "https://accounts.google.com" // Allow Google Sign-In script
      ],
      imgSrc: ["'self'", "data:", "https:"], // Allow images from any HTTPS source
      connectSrc: [
        "'self'", 
        "https://*.supabase.co", 
        "https://*.supabase.in",
        "https://cdn.jsdelivr.net", // Allow jsDelivr CDN for source maps and module loading
        "http://127.0.0.1:7242" // Allow debug logging endpoint
      ], // Allow Supabase connections and CDN
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

// Cache control middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const url = req.path;
  
  // HTML files - never cache (always fresh)
  if (url.endsWith('.html') || url === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${appVersion}"`);
  }
  // Static assets (JS, CSS, images) - cache with version
  else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${appVersion}"`);
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
  
  // Only intercept HTML file requests
  if (!url.endsWith('.html') && url !== '/') {
    return next();
  }
  
  // Skip auth-page.html and index.html (they're handled by specific routes)
  if (url.includes('auth-page.html') || url === '/' || url === '/index.html') {
    return next();
  }
  
  // Intercept the response to inject auth-checker if not already present
  const originalSend = res.send;
  res.send = function(body: any) {
    // Only process if it's HTML content
    if (typeof body === 'string' && body.trim().startsWith('<!')) {
      // Check if auth-checker is already present
      if (!body.includes('auth-checker.js') && !body.includes('/js/auth-checker.js')) {
        // Inject auth-checker before closing body tag
        const authCheckerScript = '  <!-- Authentication Guard - Auto-injected for security -->\n  <script type="module" src="/js/auth-checker.js"></script>\n';
        
        if (body.includes('</body>')) {
          body = body.replace('</body>', `${authCheckerScript}</body>`);
        } else if (body.includes('</html>')) {
          body = body.replace('</html>', `${authCheckerScript}</html>`);
        } else {
          body = body + '\n' + authCheckerScript;
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
    serverLogger.error('Error processing audit-reports.html:', error);
    // Fallback: try to serve from feature directory directly
    const featurePath = path.join(__dirname, '../src/features/audit-reports/presentation/audit-reports.html');
    if (fs.existsSync(featurePath)) {
      res.sendFile(featurePath);
    } else {
      res.status(404).send('Audit Reports page not found');
    }
  }
});

app.get('/event-management.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('event-management.html', appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error('Error processing event-management.html:', error);
    res.sendFile(path.join(__dirname, '../public', 'event-management.html'));
  }
});

app.get('/profile.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('profile.html', appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error('Error processing profile.html:', error);
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
    serverLogger.error('Error processing auth-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/auth/presentation/auth-page.html'));
  }
});

// ✅ SECURITY: Serve all HTML files from src directory with version injection and auto auth-checker
// This catches all feature pages automatically - route must be BEFORE express.static
// Using a more specific pattern that Express supports
app.get(/^\/src\/.*\.html$/, (req: express.Request, res: express.Response): void => {
  const htmlPath = req.path.replace('/src/', 'src/');
  
  // Skip auth-page.html (handled separately, no auth-checker needed)
  if (htmlPath.includes('auth-page.html')) {
    try {
      const html = injectVersionIntoHTML(htmlPath, appVersion);
      res.send(html);
    } catch (error) {
      serverLogger.error(`Error processing ${htmlPath}:`, error);
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

// Serve legacy-home-page.html with version injection (main home page)
app.get('/src/features/home/presentation/legacy-home-page.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/home/presentation/legacy-home-page.html', appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error('Error processing legacy-home-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/features/home/presentation/legacy-home-page.html'));
  }
});

// Serve legacy-home-page.html via home-page.html route (backward compatibility)
app.get('/src/features/home/presentation/home-page.html', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('src/features/home/presentation/legacy-home-page.html', appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error('Error processing legacy-home-page.html:', error);
    res.sendFile(path.join(__dirname, '../src/features/home/presentation/legacy-home-page.html'));
  }
});

// Keep dashboard.html route for backward compatibility (redirects to home)
app.get('/dashboard.html', (req: express.Request, res: express.Response): void => {
  res.redirect('/src/features/home/presentation/legacy-home-page.html');
});

// Parse JSON bodies
app.use(express.json());

// ✅ SECURITY: CSRF Protection
import { csrfProtection, csrfToken } from './api/middleware/csrf.middleware.js';

// Add CSRF token to all responses
app.use('/api', csrfToken);

// Apply CSRF protection to state-changing API routes
app.use('/api', csrfProtection);

// API Routes
import usersRouter from './api/routes/users.routes.js';
import notificationsRouter from './api/routes/notifications.routes.js';
import notificationSubscriptionsRouter from './api/routes/notification-subscriptions.routes.js';
import peopleRouter from './api/routes/people.routes.js';
import { errorHandler } from './api/middleware/error-handler.middleware.js';

app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/people', peopleRouter);
app.use('/api/notification-subscriptions', notificationSubscriptionsRouter);

// Error handler (must be last)
app.use(errorHandler);


// Serve index.html for root route (with version injection)
app.get('/', (req: express.Request, res: express.Response): void => {
  try {
    const html = injectVersionIntoHTML('index.html', appVersion);
    res.send(html);
  } catch (error) {
    serverLogger.error('Error processing index.html:', error);
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
  
  // Log Supabase configuration status to terminal
  if (hasSupabaseUrl && hasSupabaseKey) {
    serverLogger.info('Supabase: Configuration available - Client can initialize');
  } else {
    serverLogger.warn('Supabase: Configuration incomplete - Missing URL or Anon Key');
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
    serverLogger.error('Error reading version:', error);
    res.json({ 
      version: appVersion, 
      timestamp: Date.now(),
      hash: appVersion
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  serverLogger.info(`Server running on http://localhost:${PORT}`);
  serverLogger.info(`Serving files from: ${path.join(__dirname, '../public')}`);
  serverLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors (e.g., port already in use)
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    serverLogger.error(`Port ${PORT} is already in use. Please:`);
    serverLogger.error(`  1. Stop the other process using port ${PORT}`);
    serverLogger.error(`  2. Or set a different PORT in your .env file`);
    serverLogger.error(`\nTo find and kill the process on Windows, run:`);
    serverLogger.error(`  netstat -ano | findstr :${PORT}`);
    serverLogger.error(`  taskkill /PID <PID> /F`);
    process.exit(1);
  } else {
    serverLogger.error('Server error:', error);
    process.exit(1);
  }
});

