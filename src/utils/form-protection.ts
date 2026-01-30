/**
 * Form Data Protection Utility
 * 
 * Protects form data during auth transitions to prevent data loss.
 * This addresses scenarios:
 * - Audit Form Save During Auth Issue (Scenario 55)
 * - Navigation During Long Form (Scenario 56)
 * - Session Expiry During Audit (Scenario 10)
 * 
 * Features:
 * - Auto-save form data periodically
 * - Save before auth redirects
 * - Restore after successful login
 * - Page-specific storage
 */

import { logInfo, logWarn } from './logging-helper.js';

// ============================================================================
// Types
// ============================================================================

interface FormDataSnapshot {
  timestamp: number;
  page: string;
  formId: string;
  data: Record<string, any>;
  isDirty: boolean;
}

interface FormProtectionConfig {
  autoSaveIntervalMs: number;
  maxSnapshotsPerForm: number;
  expiryMs: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: FormProtectionConfig = {
  autoSaveIntervalMs: 30000, // 30 seconds
  maxSnapshotsPerForm: 3,
  expiryMs: 30 * 60 * 1000, // 30 minutes
};

const STORAGE_KEY = 'formProtectionData';

// ============================================================================
// State
// ============================================================================

const trackedForms: Map<string, {
  form: HTMLFormElement;
  initialData: Record<string, any>;
  autoSaveInterval?: number;
}> = new Map();

let config = { ...DEFAULT_CONFIG };

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get form data as a plain object
 */
function getFormData(form: HTMLFormElement): Record<string, any> {
  const data: Record<string, any> = {};
  const formData = new FormData(form);
  
  // Use forEach instead of entries() for better compatibility
  formData.forEach((value, key) => {
    if (data[key]) {
      // Handle multiple values (e.g., checkboxes)
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  });
  
  // Also capture unchecked checkboxes (they don't appear in FormData)
  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox: Element) => {
    const input = checkbox as HTMLInputElement;
    if (input.name && !data.hasOwnProperty(input.name)) {
      data[input.name] = input.checked;
    } else if (input.name && typeof data[input.name] !== 'boolean') {
      // Already has a value, it's a multi-checkbox
    } else if (input.name) {
      data[input.name] = input.checked;
    }
  });
  
  return data;
}

/**
 * Check if form data has changed from initial state
 */
function isFormDirty(formId: string): boolean {
  const tracked = trackedForms.get(formId);
  if (!tracked) return false;
  
  const currentData = getFormData(tracked.form);
  const initialData = tracked.initialData;
  
  return JSON.stringify(currentData) !== JSON.stringify(initialData);
}

/**
 * Save form data to localStorage
 */
function saveFormSnapshot(formId: string, form: HTMLFormElement): void {
  try {
    const data = getFormData(form);
    const snapshot: FormDataSnapshot = {
      timestamp: Date.now(),
      page: window.location.pathname,
      formId,
      data,
      isDirty: isFormDirty(formId),
    };
    
    // Load existing snapshots
    const existingStr = localStorage.getItem(STORAGE_KEY);
    const existing: FormDataSnapshot[] = existingStr ? JSON.parse(existingStr) : [];
    
    // Remove old snapshots for this form
    const filtered = existing.filter(s => 
      s.formId !== formId || s.page !== window.location.pathname
    );
    
    // Add new snapshot
    filtered.push(snapshot);
    
    // Keep only recent snapshots (per form limit)
    const formSnapshots = filtered.filter(s => s.formId === formId);
    if (formSnapshots.length > config.maxSnapshotsPerForm) {
      const oldestToRemove = formSnapshots
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, formSnapshots.length - config.maxSnapshotsPerForm);
      
      oldestToRemove.forEach(old => {
        const idx = filtered.findIndex(s => s === old);
        if (idx >= 0) filtered.splice(idx, 1);
      });
    }
    
    // Remove expired snapshots
    const now = Date.now();
    const valid = filtered.filter(s => now - s.timestamp < config.expiryMs);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    logInfo(`[FormProtection] Saved snapshot for ${formId}`);
  } catch (error) {
    logWarn('[FormProtection] Error saving form snapshot:', error);
  }
}

/**
 * Get saved snapshot for a form
 */
function getFormSnapshot(formId: string, page?: string): FormDataSnapshot | null {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY);
    if (!existingStr) return null;
    
    const snapshots: FormDataSnapshot[] = JSON.parse(existingStr);
    const targetPage = page || window.location.pathname;
    
    // Find most recent snapshot for this form on this page
    const matching = snapshots
      .filter(s => s.formId === formId && s.page === targetPage)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (matching.length === 0) return null;
    
    const snapshot = matching[0];
    
    // Check if expired
    if (Date.now() - snapshot.timestamp > config.expiryMs) {
      removeFormSnapshot(formId, targetPage);
      return null;
    }
    
    return snapshot;
  } catch (error) {
    logWarn('[FormProtection] Error getting form snapshot:', error);
    return null;
  }
}

/**
 * Remove snapshot for a form
 */
function removeFormSnapshot(formId: string, page?: string): void {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY);
    if (!existingStr) return;
    
    const snapshots: FormDataSnapshot[] = JSON.parse(existingStr);
    const targetPage = page || window.location.pathname;
    
    const filtered = snapshots.filter(s => 
      !(s.formId === formId && s.page === targetPage)
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logWarn('[FormProtection] Error removing form snapshot:', error);
  }
}

/**
 * Restore form data from snapshot
 */
function restoreFormData(form: HTMLFormElement, snapshot: FormDataSnapshot): void {
  try {
    Object.entries(snapshot.data).forEach(([key, value]) => {
      const elements = form.querySelectorAll(`[name="${key}"]`);
      
      elements.forEach((element) => {
        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox') {
            element.checked = Boolean(value);
          } else if (element.type === 'radio') {
            element.checked = element.value === value;
          } else {
            element.value = String(value);
          }
        } else if (element instanceof HTMLTextAreaElement) {
          element.value = String(value);
        } else if (element instanceof HTMLSelectElement) {
          element.value = String(value);
        }
      });
    });
    
    logInfo(`[FormProtection] Restored data for form ${snapshot.formId}`);
  } catch (error) {
    logWarn('[FormProtection] Error restoring form data:', error);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start tracking a form for auto-save
 */
export function trackForm(form: HTMLFormElement, formId?: string): void {
  const id = formId || form.id || `form-${trackedForms.size}`;
  
  if (trackedForms.has(id)) {
    logInfo(`[FormProtection] Form ${id} already tracked`);
    return;
  }
  
  const initialData = getFormData(form);
  
  trackedForms.set(id, {
    form,
    initialData,
  });
  
  logInfo(`[FormProtection] Started tracking form ${id}`);
}

/**
 * Start auto-save for a form
 */
export function startAutoSave(formId: string): void {
  const tracked = trackedForms.get(formId);
  if (!tracked) {
    logWarn(`[FormProtection] Form ${formId} not tracked`);
    return;
  }
  
  if (tracked.autoSaveInterval) {
    return; // Already auto-saving
  }
  
  tracked.autoSaveInterval = window.setInterval(() => {
    if (isFormDirty(formId)) {
      saveFormSnapshot(formId, tracked.form);
    }
  }, config.autoSaveIntervalMs);
  
  logInfo(`[FormProtection] Started auto-save for ${formId}`);
}

/**
 * Stop auto-save for a form
 */
export function stopAutoSave(formId: string): void {
  const tracked = trackedForms.get(formId);
  if (tracked?.autoSaveInterval) {
    clearInterval(tracked.autoSaveInterval);
    tracked.autoSaveInterval = undefined;
    logInfo(`[FormProtection] Stopped auto-save for ${formId}`);
  }
}

/**
 * Stop tracking a form
 */
export function untrackForm(formId: string): void {
  stopAutoSave(formId);
  trackedForms.delete(formId);
  logInfo(`[FormProtection] Stopped tracking form ${formId}`);
}

/**
 * Save all tracked forms immediately
 * Call this before auth redirects
 */
export function saveAllForms(): void {
  trackedForms.forEach((tracked, formId) => {
    if (isFormDirty(formId)) {
      saveFormSnapshot(formId, tracked.form);
    }
  });
  logInfo('[FormProtection] Saved all dirty forms');
}

/**
 * Check if there's saved data for a form
 */
export function hasSavedData(formId: string): boolean {
  return getFormSnapshot(formId) !== null;
}

/**
 * Restore saved data for a form
 */
export function restoreSavedData(form: HTMLFormElement, formId?: string): boolean {
  const id = formId || form.id;
  const snapshot = getFormSnapshot(id);
  
  if (!snapshot) {
    return false;
  }
  
  restoreFormData(form, snapshot);
  return true;
}

/**
 * Clear saved data for a form (after successful save)
 */
export function clearSavedData(formId: string): void {
  removeFormSnapshot(formId);
  logInfo(`[FormProtection] Cleared saved data for ${formId}`);
}

/**
 * Check if any form has unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  let hasChanges = false;
  trackedForms.forEach((_, formId) => {
    if (isFormDirty(formId)) {
      hasChanges = true;
    }
  });
  return hasChanges;
}

/**
 * Show notification about restored data
 */
export function showRestoredNotification(): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #dbeafe;
    border: 1px solid #3b82f6;
    color: #1e40af;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: slideIn 0.3s ease-out;
  `;
  toast.innerHTML = `
    <style>
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } }
    </style>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <span>Your previous work has been restored</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0 0.25rem;
    ">×</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ============================================================================
// Integration with Auth System
// ============================================================================

/**
 * Set up beforeunload handler to save forms
 */
export function setupBeforeUnloadProtection(): void {
  window.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges()) {
      // Save all forms before leaving
      saveAllForms();
      
      // Show browser warning
      event.preventDefault();
      event.returnValue = '';
    }
  });
  
  logInfo('[FormProtection] Set up beforeunload protection');
}

/**
 * Configure form protection
 */
export function configure(options: Partial<FormProtectionConfig>): void {
  config = { ...config, ...options };
}

// ============================================================================
// Global Export for Debugging
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).formProtection = {
    trackForm,
    startAutoSave,
    stopAutoSave,
    saveAllForms,
    hasSavedData,
    restoreSavedData,
    clearSavedData,
    hasUnsavedChanges,
  };
}
