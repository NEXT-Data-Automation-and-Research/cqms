/**
 * Event Listeners Module
 * Sets up all event listeners for the home dashboard
 */

import { DateFilterManager } from '../date-filter-manager.js';
import { homeState } from '../state.js';

export class EventListenersManager {
  constructor(
    private dateFilterManager: DateFilterManager
  ) {}

  setup(): void {
    this.setupWeekNavigation();
    this.setupDateFilter();
    this.setupFilterPanel();
    this.setupHoverModals();
  }

  private setupWeekNavigation(): void {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');
    
    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => this.dateFilterManager.navigateWeek(-1));
    }
    if (nextWeekBtn) {
      nextWeekBtn.addEventListener('click', () => this.dateFilterManager.navigateWeek(1));
    }
    
    if (weekDisplay) {
      weekDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.dateFilterManager.getUseWeekFilter()) {
          this.dateFilterManager.switchToWeekView();
        }
      });
      weekDisplay.style.pointerEvents = 'auto';
    }
  }

  private setupDateFilter(): void {
    const dateBtn = document.getElementById('dateBtn');
    if (dateBtn) {
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) dropdown.classList.toggle('active');
      });
    }

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.date-picker-dropdown')) {
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) dropdown.classList.remove('active');
      }
    });
  }

  private setupFilterPanel(): void {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        const panel = document.getElementById('filterPanel');
        if (panel) {
          panel.classList.toggle('active');
          filterBtn.classList.toggle('active');
        }
      });
    }
  }

  private setupHoverModals(): void {
    this.setupNotificationHover();
    this.setupCalendarHover();
    this.setupGridHover();
    this.setupAvatarHover();
  }

  private setupNotificationHover(): void {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationModal = document.getElementById('notificationsModal');
    
    if (notificationBtn && notificationModal) {
      let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
      
      notificationBtn.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        (window as any).showNotifications?.();
      });
      
      notificationBtn.addEventListener('mouseleave', (e: MouseEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (relatedTarget && notificationModal.contains(relatedTarget)) return;
        
        hoverTimeout = setTimeout(() => {
          (window as any).hideNotifications?.();
        }, 200);
      });
      
      notificationModal.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
      });
      
      notificationModal.addEventListener('mouseleave', () => {
        (window as any).hideNotifications?.();
      });
    }
  }

  private setupCalendarHover(): void {
    const calendarBtn = document.getElementById('calendarBtn');
    const calendarModal = document.getElementById('calendarModal');
    
    if (calendarBtn && calendarModal) {
      let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
      
      calendarBtn.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        (window as any).showCalendar?.();
      });
      
      calendarBtn.addEventListener('mouseleave', (e: MouseEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (relatedTarget && calendarModal.contains(relatedTarget)) return;
        
        hoverTimeout = setTimeout(() => {
          (window as any).hideCalendar?.();
        }, 200);
      });
      
      calendarModal.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
      });
      
      calendarModal.addEventListener('mouseleave', () => {
        (window as any).hideCalendar?.();
      });
    }
  }

  private setupGridHover(): void {
    const gridBtn = document.getElementById('gridBtn');
    const gridModal = document.getElementById('gridModal');
    
    if (gridBtn && gridModal) {
      let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
      
      gridBtn.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        (window as any).showGrid?.();
      });
      
      gridBtn.addEventListener('mouseleave', (e: MouseEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (relatedTarget && gridModal.contains(relatedTarget)) return;
        
        hoverTimeout = setTimeout(() => {
          (window as any).hideGrid?.();
        }, 200);
      });
      
      gridModal.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
      });
      
      gridModal.addEventListener('mouseleave', () => {
        (window as any).hideGrid?.();
      });
    }
  }

  private setupAvatarHover(): void {
    const userProfileContainer = document.getElementById('userProfileContainer');
    const avatarLogoutMenu = document.getElementById('avatarLogoutMenu');
    
    if (userProfileContainer && avatarLogoutMenu) {
      let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
      
      userProfileContainer.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        avatarLogoutMenu.classList.remove('opacity-0', 'invisible');
        avatarLogoutMenu.classList.add('opacity-100', 'visible');
      });
      
      userProfileContainer.addEventListener('mouseleave', (e: MouseEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (relatedTarget && avatarLogoutMenu.contains(relatedTarget)) return;
        
        hoverTimeout = setTimeout(() => {
          (window as any).hideAvatarLogout?.();
        }, 200);
      });
      
      avatarLogoutMenu.addEventListener('mouseenter', () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
      });
      
      avatarLogoutMenu.addEventListener('mouseleave', () => {
        (window as any).hideAvatarLogout?.();
      });
    }
  }
}

