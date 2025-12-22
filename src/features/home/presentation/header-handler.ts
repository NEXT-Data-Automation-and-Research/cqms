/**
 * Header Handler
 * This file handles header interactions like showing and hiding modals
 */

/**
 * This class handles header UI interactions
 */
export class HeaderHandler {
  /**
   * Hide the notifications modal
   */
  hideNotifications(): void {
    const modal = document.getElementById('notificationsModal')
    if (modal) {
      modal.classList.remove('opacity-100', 'visible')
      modal.classList.add('opacity-0', 'invisible')
    }
  }

  /**
   * Hide the calendar modal
   */
  hideCalendar(): void {
    const modal = document.getElementById('calendarModal')
    if (modal) {
      modal.classList.remove('opacity-100', 'visible')
      modal.classList.add('opacity-0', 'invisible')
    }
  }

  /**
   * Hide the grid quick actions modal
   */
  hideGrid(): void {
    const modal = document.getElementById('gridModal')
    if (modal) {
      modal.classList.remove('opacity-100', 'visible')
      modal.classList.add('opacity-0', 'invisible')
    }
  }

  /**
   * Hide the avatar logout menu
   */
  hideAvatarLogout(): void {
    const menu = document.getElementById('avatarLogoutMenu')
    if (menu) {
      menu.classList.remove('opacity-100', 'visible')
      menu.classList.add('opacity-0', 'invisible')
    }
  }

  /**
   * Set up all header event handlers
   */
  setupEventHandlers(): void {
    // Make functions globally available for inline event handlers
    ;(window as any).hideNotifications = () => this.hideNotifications()
    ;(window as any).hideCalendar = () => this.hideCalendar()
    ;(window as any).hideGrid = () => this.hideGrid()
    ;(window as any).hideAvatarLogout = () => this.hideAvatarLogout()
  }
}

// Create a single instance to share
export const headerHandler = new HeaderHandler()

// Auto-setup when module loads
headerHandler.setupEventHandlers()

