/**
 * Unified Audit Page Configuration
 * Controls feature flags and migration settings
 */

export interface UnifiedAuditConfig {
  /** Enable the unified audit page for new audits */
  enableForCreate: boolean;
  /** Enable the unified audit page for editing audits */
  enableForEdit: boolean;
  /** Enable the unified audit page for viewing audits */
  enableForView: boolean;
  /** List of user emails that should use the unified page (for gradual rollout) */
  enabledForUsers: string[];
  /** Enable for all users */
  enableForAll: boolean;
}

// Default configuration - disabled by default for safe rollout
const defaultConfig: UnifiedAuditConfig = {
  enableForCreate: false,
  enableForEdit: false,
  enableForView: false,
  enabledForUsers: [],
  enableForAll: false
};

// Current configuration (can be overridden via localStorage or server config)
let currentConfig: UnifiedAuditConfig = { ...defaultConfig };

/**
 * Initialize configuration from localStorage or server
 */
export function initializeUnifiedAuditConfig(): void {
  // Check localStorage for overrides
  try {
    const storedConfig = localStorage.getItem('unifiedAuditConfig');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      currentConfig = { ...defaultConfig, ...parsed };
      console.log('[UnifiedAuditConfig] Loaded from localStorage:', currentConfig);
    }
  } catch (e) {
    console.warn('[UnifiedAuditConfig] Failed to load from localStorage:', e);
  }

  // Check URL parameter for testing
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('useUnifiedAudit')) {
    currentConfig.enableForAll = urlParams.get('useUnifiedAudit') === 'true';
    console.log('[UnifiedAuditConfig] URL override - enableForAll:', currentConfig.enableForAll);
  }
}

/**
 * Get current configuration
 */
export function getUnifiedAuditConfig(): UnifiedAuditConfig {
  return { ...currentConfig };
}

/**
 * Update configuration
 */
export function setUnifiedAuditConfig(config: Partial<UnifiedAuditConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  
  // Persist to localStorage
  try {
    localStorage.setItem('unifiedAuditConfig', JSON.stringify(currentConfig));
  } catch (e) {
    console.warn('[UnifiedAuditConfig] Failed to save to localStorage:', e);
  }
}

/**
 * Check if unified page should be used for a specific mode
 */
export function shouldUseUnifiedPage(mode: 'create' | 'edit' | 'view', userEmail?: string): boolean {
  // Check if enabled for all users
  if (currentConfig.enableForAll) {
    return true;
  }

  // Check if enabled for specific user
  if (userEmail && currentConfig.enabledForUsers.includes(userEmail.toLowerCase())) {
    return true;
  }

  // Check mode-specific flags
  switch (mode) {
    case 'create':
      return currentConfig.enableForCreate;
    case 'edit':
      return currentConfig.enableForEdit;
    case 'view':
      return currentConfig.enableForView;
    default:
      return false;
  }
}

/**
 * Get the URL for the audit page based on mode and configuration
 */
export function getAuditPageUrl(
  mode: 'create' | 'edit' | 'view',
  auditId?: string,
  scorecardId?: string,
  tableName?: string,
  userEmail?: string
): string {
  const useUnified = shouldUseUnifiedPage(mode, userEmail);
  
  if (useUnified) {
    // New unified page
    const params = new URLSearchParams();
    if (mode !== 'create') params.set('mode', mode);
    if (auditId) params.set('id', auditId);
    if (scorecardId) params.set('scorecard', scorecardId);
    if (tableName) params.set('table', tableName);
    
    const queryString = params.toString();
    return `/src/features/audit/presentation/unified-audit.html${queryString ? '?' + queryString : ''}`;
  } else {
    // Legacy pages
    if (mode === 'create') {
      return '/src/features/audit-form/presentation/new-audit-form.html';
    } else if (mode === 'edit') {
      return `/src/features/audit-form/presentation/new-audit-form.html?edit=${auditId}&scorecard=${scorecardId}&table=${tableName}`;
    } else {
      return `/audit-view.html?id=${auditId}&scorecard=${scorecardId}&table=${tableName}`;
    }
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  initializeUnifiedAuditConfig();
  
  // Expose for debugging
  (window as any).unifiedAuditConfig = {
    get: getUnifiedAuditConfig,
    set: setUnifiedAuditConfig,
    shouldUse: shouldUseUnifiedPage,
    getUrl: getAuditPageUrl,
    enableAll: () => setUnifiedAuditConfig({ enableForAll: true }),
    disableAll: () => setUnifiedAuditConfig({ enableForAll: false })
  };
}
