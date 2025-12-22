/**
 * Theme Manager
 * Utility functions for managing theme (light/dark mode)
 */

export type Theme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'app-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Get current theme from localStorage or system preference
 */
export function getCurrentTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
    return stored;
  }
  return 'auto';
}

/**
 * Get effective theme (resolves 'auto' to 'light' or 'dark')
 */
export function getEffectiveTheme(): 'light' | 'dark' {
  const theme = getCurrentTheme();
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const effectiveTheme = theme === 'auto' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  
  root.setAttribute(THEME_ATTRIBUTE, effectiveTheme);
  root.classList.toggle('dark', effectiveTheme === 'dark');
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Initialize theme on page load
 */
export function initTheme(): void {
  const theme = getCurrentTheme();
  applyTheme(theme);
  
  // Listen for system theme changes if using 'auto'
  if (theme === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      applyTheme('auto');
    });
  }
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): void {
  const current = getCurrentTheme();
  const newTheme: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

/**
 * Set specific theme
 */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
}

// Initialize theme when module loads
if (typeof window !== 'undefined') {
  initTheme();
}

