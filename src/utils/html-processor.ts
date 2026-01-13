/**
 * HTML Processor
 * Injects version numbers into HTML files for cache busting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a page should have auth-checker injected
 * Excludes auth-page.html and index.html (which already has auth-checker)
 */
function shouldInjectAuthChecker(htmlPath: string): boolean {
  // Don't inject into auth page
  if (htmlPath.includes('auth-page.html') || htmlPath.includes('auth/presentation')) {
    return false;
  }
  
  // Don't inject into index.html (it already has auth-checker)
  if (htmlPath === 'index.html' || htmlPath.endsWith('/index.html')) {
    return false;
  }
  
  // Inject into all other HTML pages
  return true;
}

/**
 * Inject auth-checker script into HTML if needed
 * @param html - HTML content
 * @param htmlPath - Path to HTML file (for checking if injection is needed)
 * @returns HTML with auth-checker injected if needed
 */
function injectAuthChecker(html: string, htmlPath: string): string {
  // Check if auth-checker should be injected
  if (!shouldInjectAuthChecker(htmlPath)) {
    return html;
  }
  
  // Check if auth-checker is already present
  if (html.includes('auth-checker.js') || html.includes('/js/auth-checker.js')) {
    // Already has auth-checker, don't inject again
    return html;
  }
  
  // Find the best place to inject - before closing </body> tag
  // Or if no body tag, inject before closing </html>
  const authCheckerScript = '  <!-- Authentication Guard - Auto-injected for security -->\n  <script type="module" src="/js/auth-checker.js"></script>\n';
  
  if (html.includes('</body>')) {
    // Inject before closing body tag
    html = html.replace('</body>', `${authCheckerScript}</body>`);
  } else if (html.includes('</html>')) {
    // Inject before closing html tag if no body tag
    html = html.replace('</html>', `${authCheckerScript}</html>`);
  } else {
    // Append at the end if no closing tags found
    html = html + '\n' + authCheckerScript;
  }
  
  return html;
}

/**
 * Inject page transition script into HTML if needed
 * @param html - HTML content
 * @param htmlPath - Path to HTML file (for checking if injection is needed)
 * @returns HTML with page transition injected if needed
 */
function injectPageTransition(html: string, htmlPath: string): string {
  // Don't inject into auth page or index
  if (htmlPath.includes('auth-page.html') || 
      htmlPath === 'index.html' || 
      htmlPath.endsWith('/index.html')) {
    return html;
  }
  
  // Check if page transition is already present
  if (html.includes('page-transition.js') || html.includes('/js/utils/page-transition.js')) {
    return html;
  }
  
  // Inject early in head or at start of body to intercept navigation immediately
  const pageTransitionScript = '  <!-- Page Transition - Auto-injected for smooth navigation -->\n  <script type="module">\n    import { setupSmoothNavigation, hideTransitionOnLoad } from \'/js/utils/page-transition.js\';\n    setupSmoothNavigation();\n    hideTransitionOnLoad();\n  </script>\n';
  
  // Try to inject in head first (before other scripts)
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${pageTransitionScript}</head>`);
  } else if (html.includes('<body')) {
    // Inject right after opening body tag
    html = html.replace(/<body[^>]*>/, (match) => `${match}\n${pageTransitionScript}`);
  } else {
    // Fallback: inject at the end
    html = html + '\n' + pageTransitionScript;
  }
  
  return html;
}

/**
 * Inject version into HTML file
 * @param htmlPath - Relative path from public directory
 * @param version - Version hash to inject
 * @returns Processed HTML string
 */
export function injectVersionIntoHTML(htmlPath: string, version: string): string {
  const baseDir = path.join(__dirname, '../..');
  let fullPath: string;
  
  // If htmlPath already includes a full path (starts with 'src/' or '../'), use it directly
  if (htmlPath.startsWith('src/') || htmlPath.startsWith('../')) {
    fullPath = path.join(baseDir, htmlPath);
  } else {
    // Try public directory first
    fullPath = path.join(baseDir, 'public', htmlPath);
    
    // If not found, try src directory (for auth-page.html)
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(baseDir, 'src', htmlPath);
    }
    
    // If not found, try feature directories (for migrated HTML files)
    if (!fs.existsSync(fullPath)) {
      const srcDir = path.join(baseDir, 'src');
      const featuresDir = path.join(srcDir, 'features');
      
      if (fs.existsSync(featuresDir)) {
        // Extract just the filename
        const filename = path.basename(htmlPath);
        
        // Search through feature directories for the HTML file
        const features = fs.readdirSync(featuresDir, { withFileTypes: true });
        for (const feature of features) {
          if (feature.isDirectory()) {
            const presentationDir = path.join(featuresDir, feature.name, 'presentation');
            if (fs.existsSync(presentationDir)) {
              const featureHtmlPath = path.join(presentationDir, filename);
              if (fs.existsSync(featureHtmlPath)) {
                fullPath = featureHtmlPath;
                break;
              }
            }
          }
        }
      }
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }
  
  let html = fs.readFileSync(fullPath, 'utf-8');
  
  // Replace asset URLs with versioned URLs (js, css files)
  html = html.replace(
    /(href|src)=["']([^"']+\.(js|css))["']/g,
    (match, attr, url) => {
      // Skip CDN URLs and already versioned URLs
      if (url.startsWith('http') || url.includes('?v=') || url.includes('&v=')) {
        return match;
      }
      const separator = url.includes('?') ? '&' : '?';
      return `${attr}="${url}${separator}v=${version}"`;
    }
  );
  
  // Add version meta tag if not present
  if (!html.includes('<meta name="app-version"')) {
    html = html.replace(
      '</head>',
      `    <meta name="app-version" content="${version}">\n    </head>`
    );
  } else {
    // Update existing version meta tag
    html = html.replace(
      /<meta name="app-version" content="[^"]*">/,
      `<meta name="app-version" content="${version}">`
    );
  }
  
  // ✅ SECURITY: Automatically inject auth-checker into all pages except auth-page
  html = injectAuthChecker(html, htmlPath);
  
  // ✅ UX: Automatically inject page transition for smooth navigation
  html = injectPageTransition(html, htmlPath);
  
  return html;
}

/**
 * Get version from version.json file
 * @returns Version hash or default
 */
export function getAppVersion(): string {
  try {
    const versionPath = path.join(__dirname, '../../public/version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      return versionData.hash || versionData.version || '1.0.0';
    }
  } catch (error) {
    // Silent fail
  }
  return '1.0.0';
}

