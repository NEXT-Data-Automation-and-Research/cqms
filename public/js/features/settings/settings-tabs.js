/**
 * Settings Tab Bar
 * Shared tab navigation for all settings sub-pages.
 * Each settings page imports this module to render the tab bar.
 */

const SETTINGS_TABS = [
  { label: 'Scorecards', slug: 'scorecards', resource: 'settings/scorecards' },
  { label: 'User Management', slug: 'user-management', resource: 'settings/user-management' },
  { label: 'Supervisor Assignments', slug: 'supervisor-assignments', resource: 'settings/supervisor-assignments' },
  { label: 'Permission Management', slug: 'permissions', resource: 'settings/permissions' },
  { label: 'Access Control', slug: 'access-control', resource: 'settings/access-control' },
  { label: 'View as User', slug: 'impersonation', resource: 'settings/impersonation' },
  { label: 'Profile', slug: 'profile', resource: 'profile' }
];

function injectSettingsTabStyles() {
  if (document.getElementById('settings-tab-styles')) return;
  const style = document.createElement('style');
  style.id = 'settings-tab-styles';
  style.textContent = `
    .settings-tab-bar {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border-light, #e5e7eb);
      margin-bottom: 1.25rem;
      padding: 0 1.5rem;
      background: var(--background-white, #fff);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .settings-tab-bar::-webkit-scrollbar { display: none; }
    .settings-tab-item {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: var(--font-family, 'Poppins', sans-serif);
      color: var(--text-muted, #6b7280);
      text-decoration: none;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      cursor: pointer;
      display: inline-block;
    }
    .settings-tab-item:hover {
      color: var(--text-color, #111827);
    }
    .settings-tab-item.active {
      color: #1a733e;
      border-bottom-color: #1a733e;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

function getCurrentSettingsSlug() {
  const path = window.location.pathname;
  // Match /settings/<slug> or check for profile
  const match = path.match(/\/settings\/([^/?#]+)/);
  if (match) return match[1];
  if (path.includes('/profile')) return 'profile';
  return null;
}

export function initSettingsTabs() {
  injectSettingsTabStyles();

  const currentSlug = getCurrentSettingsSlug();

  // Find the page heading to insert tab bar after it
  const heading = document.querySelector('.page-heading-global') || document.querySelector('.page-heading');
  if (!heading) return;

  // Replace heading text with "Settings"
  heading.textContent = 'Settings';

  const tabBar = document.createElement('nav');
  tabBar.className = 'settings-tab-bar';
  tabBar.setAttribute('aria-label', 'Settings navigation');

  SETTINGS_TABS.forEach(tab => {
    const a = document.createElement('a');
    a.className = 'settings-tab-item';
    a.textContent = tab.label;
    const href = tab.slug === 'profile' ? '/profile' : `/settings/${tab.slug}`;
    a.href = href;
    if (tab.slug === currentSlug) {
      a.classList.add('active');
    }
    tabBar.appendChild(a);
  });

  heading.insertAdjacentElement('afterend', tabBar);
}
