/**
 * Header Component TypeScript
 * Handles header interactions: notifications, calendar, quick actions, logout
 */

/**
 * Hide notifications modal
 */
export function hideNotifications(): void {
  const modal = document.getElementById('notificationsModal');
  if (modal) {
    modal.classList.remove('opacity-100', 'visible');
    modal.classList.add('opacity-0', 'invisible');
  }
}

/**
 * Hide calendar modal
 */
export function hideCalendar(): void {
  const modal = document.getElementById('calendarModal');
  if (modal) {
    modal.classList.remove('opacity-100', 'visible');
    modal.classList.add('opacity-0', 'invisible');
  }
}

/**
 * Hide grid quick actions modal
 */
export function hideGrid(): void {
  const modal = document.getElementById('gridModal');
  if (modal) {
    modal.classList.remove('opacity-100', 'visible');
    modal.classList.add('opacity-0', 'invisible');
  }
}

/**
 * Hide avatar logout menu
 */
export function hideAvatarLogout(): void {
  const menu = document.getElementById('avatarLogoutMenu');
  if (menu) {
    menu.classList.remove('opacity-100', 'visible');
    menu.classList.add('opacity-0', 'invisible');
  }
}

// Make functions globally available for inline event handlers
declare global {
  interface Window {
    hideNotifications?: typeof hideNotifications;
    hideCalendar?: typeof hideCalendar;
    hideGrid?: typeof hideGrid;
    hideAvatarLogout?: typeof hideAvatarLogout;
  }
}

window.hideNotifications = hideNotifications;
window.hideCalendar = hideCalendar;
window.hideGrid = hideGrid;
window.hideAvatarLogout = hideAvatarLogout;






