/**
 * Device Information Utility
 * Collects comprehensive device and browser information for analytics
 */

/**
 * Get comprehensive device information for analytics
 * This collects production-ready device data for user tracking
 */
export function getDeviceInfo(): Record<string, any> {
  const nav = navigator;
  const screen = window.screen;
  const connection = (nav as any).connection || (nav as any).mozConnection || (nav as any).webkitConnection;
  
  // Parse user agent to extract browser and OS info
  const ua = nav.userAgent;
  const browserInfo = parseUserAgent(ua);
  
  // Get timezone information
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOffset = new Date().getTimezoneOffset();
  
  // Get screen information
  const screenInfo = {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    resolution: `${screen.width}x${screen.height}`,
  };
  
  // Get connection information (if available)
  const connectionInfo: Record<string, any> = {};
  if (connection) {
    connectionInfo.effectiveType = connection.effectiveType;
    connectionInfo.downlink = connection.downlink;
    connectionInfo.rtt = connection.rtt;
    connectionInfo.saveData = connection.saveData;
  }
  
  // Determine device type
  const deviceType = getDeviceType(screen, ua);
  
  // Get language information
  const languages = nav.languages || [nav.language];
  
  // Get platform information
  const platform = nav.platform || 'unknown';
  
  // Get hardware concurrency (CPU cores)
  const hardwareConcurrency = nav.hardwareConcurrency || null;
  
  // Get memory information (if available)
  const deviceMemory = (nav as any).deviceMemory || null;
  
  // Get max touch points (for touch devices)
  const maxTouchPoints = nav.maxTouchPoints || 0;
  
  // Get cookie enabled
  const cookieEnabled = nav.cookieEnabled;
  
  // Get do not track preference
  const doNotTrack = nav.doNotTrack || null;
  
  // Get vendor information
  const vendor = nav.vendor || '';
  
  // Get referrer (if available)
  const referrer = document.referrer || '';
  
  // Get current URL
  const currentUrl = window.location.href;
  
  // Get viewport information
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  
  return {
    // User agent and browser info
    user_agent: ua,
    browser: browserInfo.browser,
    browser_version: browserInfo.browserVersion,
    engine: browserInfo.engine,
    engine_version: browserInfo.engineVersion,
    
    // Operating system info
    os: browserInfo.os,
    os_version: browserInfo.osVersion,
    platform: platform,
    
    // Device information
    device_type: deviceType,
    is_mobile: /Mobile|Android|iPhone|iPad/.test(ua),
    is_tablet: /iPad|Android/.test(ua) && !/Mobile/.test(ua),
    is_desktop: !(/Mobile|Android|iPhone|iPad/.test(ua)),
    
    // Screen information
    screen: screenInfo,
    viewport: viewport,
    
    // Language and locale
    language: nav.language,
    languages: languages,
    timezone: timezone,
    timezone_offset: timezoneOffset,
    
    // Hardware information
    hardware_concurrency: hardwareConcurrency,
    device_memory: deviceMemory,
    max_touch_points: maxTouchPoints,
    
    // Network information
    connection: connectionInfo,
    online: nav.onLine,
    
    // Browser capabilities
    cookie_enabled: cookieEnabled,
    do_not_track: doNotTrack,
    vendor: vendor,
    
    // Page information
    referrer: referrer,
    current_url: currentUrl,
    origin: window.location.origin,
    
    // Timestamp
    collected_at: new Date().toISOString(),
  };
}

/**
 * Parse user agent string to extract browser and OS information
 */
function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  engine: string;
  engineVersion: string;
  os: string;
  osVersion: string;
} {
  let browser = 'unknown';
  let browserVersion = 'unknown';
  let engine = 'unknown';
  let engineVersion = 'unknown';
  let os = 'unknown';
  let osVersion = 'unknown';
  
  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (ua.includes('OPR')) {
    browser = 'Opera';
    const match = ua.match(/OPR\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  }
  
  // Detect engine
  if (ua.includes('Gecko')) {
    engine = 'Gecko';
  } else if (ua.includes('WebKit')) {
    engine = 'WebKit';
  } else if (ua.includes('Blink')) {
    engine = 'Blink';
  }
  
  // Detect OS
  if (ua.includes('Windows')) {
    os = 'Windows';
    const match = ua.match(/Windows NT ([\d.]+)/);
    if (match) {
      const version = match[1];
      if (version === '10.0') osVersion = '10';
      else if (version === '6.3') osVersion = '8.1';
      else if (version === '6.2') osVersion = '8';
      else if (version === '6.1') osVersion = '7';
      else osVersion = version;
    }
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android ([\d.]+)/);
    osVersion = match ? match[1] : 'unknown';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const match = ua.match(/OS ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  
  return {
    browser,
    browserVersion,
    engine,
    engineVersion,
    os,
    osVersion,
  };
}

/**
 * Determine device type based on screen and user agent
 */
function getDeviceType(screen: Screen, ua: string): string {
  // Check for mobile
  if (/Mobile|Android|iPhone/.test(ua) && !/iPad/.test(ua)) {
    return 'mobile';
  }
  
  // Check for tablet
  if (/iPad|Android/.test(ua) && !/Mobile/.test(ua)) {
    return 'tablet';
  }
  
  // Check screen size for tablets
  if (screen.width >= 768 && screen.width <= 1024) {
    if (/Android|iPad/.test(ua)) {
      return 'tablet';
    }
  }
  
  // Default to desktop
  return 'desktop';
}

