/**
 * Presentation Layer - Auditor Dashboard Event Handlers
 * Handles all user interactions and events
 */

import type { AuditorDashboardState } from '../application/auditor-dashboard-state.js';
import type { AuditorDashboardService } from '../application/auditor-dashboard-service.js';
import type { AuditorDashboardRenderer } from './auditor-dashboard-renderer.js';
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';

export class AuditorDashboardEventHandlers {
  constructor(
    private state: AuditorDashboardState,
    private service: AuditorDashboardService,
    private renderer: AuditorDashboardRenderer
  ) {}

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    this.setupWeekNavigation();
    this.setupDatePicker();
    this.setupFilterDropdown();
    this.setupTabSwitching();
    this.setupClickOutside();
  }

  /**
   * Setup week navigation
   */
  private setupWeekNavigation(): void {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');

    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
        }
        this.navigateWeek(-1);
      });
    }

    if (nextWeekBtn) {
      nextWeekBtn.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
        }
        this.navigateWeek(1);
      });
    }

    if (weekDisplay) {
      weekDisplay.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
          this.refreshData();
        }
      });
    }
  }

  /**
   * Setup date picker
   */
  private setupDatePicker(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:68',message:'setupDatePicker entry',data:{dateBtnExists:!!document.getElementById('dateBtn')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const dateBtn = document.getElementById('dateBtn');
    if (dateBtn) {
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) {
          dropdown.classList.toggle('active');
          // Update date inputs when dropdown opens
          if (dropdown.classList.contains('active')) {
            this.updateDateInputs();
          }
        }
      });
    }
    
    // Attach direct event listeners to Apply/Clear buttons by ID (more reliable than onclick)
    const attachButtonListeners = () => {
      const applyBtn = document.getElementById('applyDateBtn');
      const clearBtn = document.getElementById('clearDateBtn');
      
      if (applyBtn && !(applyBtn as any).__applyListenerAttached) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:87',message:'Apply button found by ID, attaching listener',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        (applyBtn as any).__applyListenerAttached = true;
        applyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:92',message:'Apply button click handler fired',data:{hasFunction:typeof(window as any).applyDateFilter==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          const dropdown = document.getElementById('dateDropdown');
          if (dropdown) dropdown.classList.remove('active');
          if (typeof (window as any).applyDateFilter === 'function') {
            (window as any).applyDateFilter();
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:99',message:'applyDateFilter function not available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.error('[DEBUG] applyDateFilter function not available');
          }
        });
      }
      
      if (clearBtn && !(clearBtn as any).__clearListenerAttached) {
        (clearBtn as any).__clearListenerAttached = true;
        clearBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const dropdown = document.getElementById('dateDropdown');
          if (dropdown) dropdown.classList.remove('active');
          if (typeof (window as any).clearDateFilter === 'function') {
            (window as any).clearDateFilter();
          }
        });
      }
    };
    
    // Use MutationObserver to detect when buttons are added to DOM
    const observer = new MutationObserver((mutations) => {
      attachButtonListeners();
    });
    
    // Observe the filters container for changes
    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer) {
      observer.observe(filtersContainer, { childList: true, subtree: true });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:120',message:'MutationObserver set up for filters container',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
    
    // Try to attach listeners immediately and with delays
    attachButtonListeners();
    setTimeout(attachButtonListeners, 100);
    setTimeout(attachButtonListeners, 500);
    setTimeout(attachButtonListeners, 1000);

    // Setup Apply and Clear buttons - use event delegation since components are loaded dynamically
    // Check if button is clicked by finding the button element that was clicked
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:84',message:'setting up click event listener with capture',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Add a simple test listener first to see if ANY clicks are detected
    document.addEventListener('click', (e) => {
      // Log ALL clicks to see if events are being detected
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:89',message:'ANY button click detected',data:{targetTag:target.tagName,targetText:(target.textContent?.trim()||'').substring(0,30),targetId:target.id||'',hasOnclick:!!target.getAttribute('onclick')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }, true);
    
    document.addEventListener('click', (e) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:88',message:'click event delegation entry',data:{targetTag:((e.target as HTMLElement)?.tagName||''),targetText:((e.target as HTMLElement)?.textContent?.trim()||'').substring(0,20),targetId:((e.target as HTMLElement)?.id||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const target = e.target as HTMLElement;
      
      // Find the button element (could be the button itself or a child element)
      const button = target.closest('button');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:91',message:'button closest check',data:{buttonFound:!!button,buttonText:(button?.textContent?.trim()||'').substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!button) return;
      
      // Check if button is inside the date dropdown
      const dateDropdown = document.getElementById('dateDropdown');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:95',message:'dateDropdown check',data:{dropdownFound:!!dateDropdown,inDropdown:dateDropdown?.contains(button)||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!dateDropdown || !dateDropdown.contains(button)) return;
      
      // Get button text (handle nested elements)
      const buttonText = button.textContent?.trim() || '';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:98',message:'button text check',data:{buttonText,isApply:buttonText==='Apply',isClear:buttonText==='Clear',applyDateFilterExists:typeof(window as any).applyDateFilter==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Check if it's the Apply button
      if (buttonText === 'Apply' && typeof (window as any).applyDateFilter === 'function') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:103',message:'Apply button detected, calling applyDateFilter',data:{buttonText,hasFunction:typeof(window as any).applyDateFilter==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[DEBUG] Apply button clicked via event delegation');
        // Close dropdown immediately
        if (dateDropdown) {
          dateDropdown.classList.remove('active');
        }
        (window as any).applyDateFilter();
        return;
      }
      
      // Check if it's the Clear button
      if (buttonText === 'Clear' && typeof (window as any).clearDateFilter === 'function') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:131',message:'Clear button detected, calling clearDateFilter',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.log('[DEBUG] Clear button clicked via event delegation');
        if (dateDropdown) {
          dateDropdown.classList.remove('active');
        }
        (window as any).clearDateFilter();
        return;
      }
    });

    // Initialize date inputs with current filter values
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.updateDateInputs();
      this.updateDateButtonText();
    }, 100);
  }

  /**
   * Setup filter dropdown
   */
  private setupFilterDropdown(): void {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFilters();
      });
    }
  }

  /**
   * Setup tab switching
   */
  private setupTabSwitching(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        this.switchTab(index);
      });
    });
  }

  /**
   * Setup click outside handlers
   */
  private setupClickOutside(): void {
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.date-picker-dropdown')) {
        const dateDropdown = document.getElementById('dateDropdown');
        if (dateDropdown) {
          dateDropdown.classList.remove('active');
        }
      }
      if (!(e.target as HTMLElement).closest('.filter-dropdown')) {
        const filterDropdown = document.getElementById('filterDropdown');
        const filterBtn = document.getElementById('filterBtn');
        if (filterDropdown) {
          filterDropdown.classList.remove('active');
        }
        if (filterBtn) {
          filterBtn.classList.remove('active');
        }
      }
    });
  }

  /**
   * Update date inputs with current filter values
   */
  updateDateInputs(): void {
    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;

    if (startDateInput) {
      if (this.state.dateFilter.start) {
        startDateInput.value = this.state.dateFilter.start;
      } else {
        // Initialize with today if no filter is set
        const today = window.getDhakaNow?.() || new Date();
        const startOfDay = window.getDhakaStartOfDay?.(today) || today;
        const startStr = window.formatDhakaDateForInput?.(startOfDay) || '';
        startDateInput.value = startStr;
      }
    }
    if (endDateInput) {
      if (this.state.dateFilter.end) {
        endDateInput.value = this.state.dateFilter.end;
      } else {
        // Initialize with today if no filter is set
        const today = window.getDhakaNow?.() || new Date();
        const endOfDay = window.getDhakaEndOfDay?.(today) || today;
        const endStr = window.formatDhakaDateForInput?.(endOfDay) || '';
        endDateInput.value = endStr;
      }
    }
  }

  /**
   * Update date button text based on current filter
   */
  updateDateButtonText(): void {
    const dateBtnText = document.getElementById('dateBtnText');
    if (!dateBtnText) return;

    if (this.state.dateFilter.start && this.state.dateFilter.end) {
      const startDate = window.parseDhakaDate?.(this.state.dateFilter.start);
      const endDate = window.parseDhakaDate?.(this.state.dateFilter.end);
      
      if (startDate && endDate && window.formatDhakaDate) {
        const startStr = window.formatDhakaDate(startDate);
        const endStr = window.formatDhakaDate(endDate);
        if (startStr === endStr) {
          dateBtnText.textContent = startStr;
        } else {
          dateBtnText.textContent = `${startStr} - ${endStr}`;
        }
      } else {
        dateBtnText.textContent = 'Date Range';
      }
    } else {
      dateBtnText.textContent = 'Date Range';
    }
  }

  /**
   * Navigate week
   */
  private navigateWeek(direction: number): void {
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.navigateWeek(direction);
    this.updateWeekDisplay();
    this.refreshData();
  }

  /**
   * Switch tab
   */
  private switchTab(index: number): void {
    this.state.currentTab = index === 0 ? 'team-stats' : 'standup-view';
    this.updateTabUI();
    this.refreshData();
  }

  /**
   * Update tab UI
   */
  private updateTabUI(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    const slider = document.querySelector('.tab-slider');
    const tabBar = document.querySelector('.tab-navigation');

    tabButtons.forEach((btn, idx) => {
      if (idx === (this.state.currentTab === 'team-stats' ? 0 : 1)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (slider && tabBar) {
      const containerPadding = 5;
      const tabWidth = ((tabBar as HTMLElement).offsetWidth - (containerPadding * 2)) / 2;
      const index = this.state.currentTab === 'team-stats' ? 0 : 1;
      (slider as HTMLElement).style.left = `${containerPadding + (index * tabWidth)}px`;
      (slider as HTMLElement).style.width = `${tabWidth}px`;
    }
  }

  /**
   * Update week display
   */
  updateWeekDisplay(): void {
    const weekTextEl = document.getElementById('weekText');
    const weekDisplay = document.getElementById('weekDisplay');

    if (this.state.currentWeek === null) {
      const today = window.getDhakaNow?.() || new Date();
      this.state.currentWeek = window.getDhakaWeekNumber?.(today) || 1;
      this.state.currentWeekYear = today.getFullYear();
    }

    if (weekTextEl) {
      weekTextEl.textContent = `Week ${this.state.currentWeek || '-'}`;
    }

    if (weekDisplay) {
      if (this.state.useWeekFilter) {
        (weekDisplay as HTMLElement).style.backgroundColor = 'var(--primary-color)';
        (weekDisplay as HTMLElement).style.color = 'var(--white)';
        (weekDisplay as HTMLElement).style.borderColor = 'var(--primary-color)';
        (weekDisplay as HTMLElement).style.cursor = 'default';
      } else {
        (weekDisplay as HTMLElement).style.backgroundColor = '#f3f4f6';
        (weekDisplay as HTMLElement).style.color = '#6b7280';
        (weekDisplay as HTMLElement).style.borderColor = '#e5e7eb';
        (weekDisplay as HTMLElement).style.cursor = 'pointer';
      }
    }
  }

  /**
   * Toggle filters dropdown
   */
  private toggleFilters(): void {
    const dropdown = document.getElementById('filterDropdown');
    const filterBtn = document.getElementById('filterBtn');
    if (dropdown && filterBtn) {
      dropdown.classList.toggle('active');
      filterBtn.classList.toggle('active');
    }
  }

  /**
   * Refresh data based on current tab
   */
  private async refreshData(): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:222',message:'refreshData entry',data:{currentTab:this.state.currentTab,filters:this.state.currentFilters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    this.renderer.showLoadingState();
    
    try {
      if (this.state.currentTab === 'team-stats') {
        const stats = await this.service.calculateTeamStats();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:227',message:'refreshData stats calculated',data:{auditorStatsCount:stats.auditorStats.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        this.state.teamStats = stats;
        this.renderer.renderTeamStats(stats);
      } else {
        const data = await this.service.calculateStandupViewData();
        this.state.standupViewData = data;
        this.renderer.renderStandupView(data);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:236',message:'refreshData error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      logError('Error refreshing data:', error);
    } finally {
      this.renderer.hideLoadingState();
    }
  }
}

// Global functions for inline event handlers
// Ensure this is defined immediately when the module loads
// #region agent log
fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:397',message:'defining global applyDateFilter function',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion
(window as any).applyDateFilter = async function() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:400',message:'global applyDateFilter entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  console.log('[DEBUG] applyDateFilter called');
  
  const startDateEl = document.getElementById('startDate') as HTMLInputElement;
  const endDateEl = document.getElementById('endDate') as HTMLInputElement;
  const startDate = startDateEl?.value || null;
  const endDate = endDateEl?.value || null;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:363',message:'date inputs read',data:{startDateElFound:!!startDateEl,endDateElFound:!!endDateEl,startDate,endDate,hasController:!!(window as any).auditorDashboardController},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  console.log('[DEBUG] applyDateFilter dates', { startDate, endDate, hasController: !!(window as any).auditorDashboardController });

  // Close dropdown
  const dropdown = document.getElementById('dateDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }

  // Validate dates
  if (!startDate && !endDate) {
    console.warn('[DEBUG] No dates selected, using today');
    // If no dates selected, use today
    const today = window.getDhakaNow?.() || new Date();
    const startOfDay = window.getDhakaStartOfDay?.(today) || today;
    const endOfDay = window.getDhakaEndOfDay?.(today) || today;
    const startStr = window.formatDhakaDateForInput?.(startOfDay) || '';
    const endStr = window.formatDhakaDateForInput?.(endOfDay) || '';
    
    console.log('[DEBUG] Using today dates', { startStr, endStr });
    
    // Update inputs
    if (startDateEl) startDateEl.value = startStr;
    if (endDateEl) endDateEl.value = endStr;
    
    // Apply filter with today's dates
    if ((window as any).auditorDashboardController) {
      console.log('[DEBUG] Calling controller.applyDateFilter with today');
      await (window as any).auditorDashboardController.applyDateFilter(startStr, endStr);
      console.log('[DEBUG] Controller.applyDateFilter completed');
      // Update button text after filter is applied
      if ((window as any).auditorDashboardEventHandlers) {
        (window as any).auditorDashboardEventHandlers.updateDateButtonText();
        (window as any).auditorDashboardEventHandlers.updateDateInputs();
      }
    } else {
      console.error('[DEBUG] auditorDashboardController not available');
    }
    return;
  }

  // This will be handled by the controller
  if ((window as any).auditorDashboardController) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:363',message:'calling controller.applyDateFilter',data:{startDate,endDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('[DEBUG] Calling controller.applyDateFilter', { startDate, endDate });
    try {
      await (window as any).auditorDashboardController.applyDateFilter(startDate, endDate);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:368',message:'controller.applyDateFilter completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('[DEBUG] Controller.applyDateFilter completed successfully');
      // Update button text after filter is applied
      if ((window as any).auditorDashboardEventHandlers) {
        (window as any).auditorDashboardEventHandlers.updateDateButtonText();
        (window as any).auditorDashboardEventHandlers.updateDateInputs();
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:375',message:'error in applyDateFilter',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('[DEBUG] Error in applyDateFilter:', error);
    }
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:380',message:'controller not available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('[DEBUG] auditorDashboardController not available');
  }
};

(window as any).clearDateFilter = async function() {
  // Close dropdown
  const dropdown = document.getElementById('dateDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }

  // Clear date inputs
  const startDateEl = document.getElementById('startDate') as HTMLInputElement;
  const endDateEl = document.getElementById('endDate') as HTMLInputElement;
  if (startDateEl) startDateEl.value = '';
  if (endDateEl) endDateEl.value = '';

  if ((window as any).auditorDashboardController) {
    await (window as any).auditorDashboardController.clearDateFilter();
    // Update button text after filter is cleared
    if ((window as any).auditorDashboardEventHandlers) {
      (window as any).auditorDashboardEventHandlers.updateDateButtonText();
    }
  }
};

(window as any).applyQuickDateFilter = async function(option: string) {
  console.log('[DEBUG] applyQuickDateFilter called with option:', option);
  
  const today = window.getDhakaNow?.() || new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (option) {
    case 'today':
      startDate = window.getDhakaStartOfDay?.(today) || today;
      endDate = window.getDhakaEndOfDay?.(today) || today;
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = window.getDhakaStartOfDay?.(yesterday) || yesterday;
      endDate = window.getDhakaEndOfDay?.(yesterday) || yesterday;
      break;
    case 'thisMonth':
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = window.getDhakaStartOfDay?.(thisMonthStart) || thisMonthStart;
      endDate = window.getDhakaEndOfDay?.(thisMonthEnd) || thisMonthEnd;
      break;
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = window.getDhakaStartOfDay?.(lastMonthStart) || lastMonthStart;
      endDate = window.getDhakaEndOfDay?.(lastMonthEnd) || lastMonthEnd;
      break;
    default:
      console.warn('[DEBUG] Unknown quick date filter option:', option);
      return;
  }

  // Format dates for input
  const startDateStr = window.formatDhakaDateForInput?.(startDate) || '';
  const endDateStr = window.formatDhakaDateForInput?.(endDate) || '';

  // Update date inputs
  const startDateEl = document.getElementById('startDate') as HTMLInputElement;
  const endDateEl = document.getElementById('endDate') as HTMLInputElement;
  if (startDateEl) startDateEl.value = startDateStr;
  if (endDateEl) endDateEl.value = endDateStr;

  // Update active button state
  document.querySelectorAll('[id$="Btn"]').forEach((btn: any) => {
    if (btn.id === option + 'Btn') {
      btn.classList.add('bg-primary', 'text-white', 'border-primary');
      btn.classList.remove('bg-white', 'text-gray-900', 'border-gray-300');
    } else if (btn.id && btn.id.endsWith('Btn') && ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'].includes(btn.id)) {
      btn.classList.remove('bg-primary', 'text-white', 'border-primary');
      btn.classList.add('bg-white', 'text-gray-900', 'border-gray-300');
    }
  });

  // Apply the filter
  if ((window as any).auditorDashboardController) {
    await (window as any).auditorDashboardController.applyDateFilter(startDateStr, endDateStr);
    // Update button text after filter is applied
    if ((window as any).auditorDashboardEventHandlers) {
      (window as any).auditorDashboardEventHandlers.updateDateButtonText();
    }
  }
};

(window as any).applyFilters = function() {
  // #region agent log
  console.log('[DEBUG] applyFilters global function called');
  fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:262',message:'applyFilters global function called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch((e)=>console.warn('[DEBUG] Fetch failed:',e));
  // #endregion
  const statusEl = document.getElementById('statusFilter') as HTMLSelectElement;
  const channelEl = document.getElementById('channelFilter') as HTMLSelectElement;
  const auditorEl = document.getElementById('auditorFilter') as HTMLSelectElement;
  const employeeEl = document.getElementById('employeeFilter') as HTMLSelectElement;
  const scorecardEl = document.getElementById('scorecardFilter') as HTMLSelectElement;

  const filterValues = {
    status: statusEl?.value || '',
    channel: channelEl?.value || '',
    auditor: auditorEl?.value || '',
    employee: employeeEl?.value || '',
    scorecard: scorecardEl?.value || ''
  };
  
  // #region agent log
  console.log('[DEBUG] applyFilters filter values:', filterValues);
  fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:270',message:'applyFilters filter values',data:{...filterValues,hasState:!!(window as any).auditorDashboardState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch((e)=>console.warn('[DEBUG] Fetch failed:',e));
  // #endregion

  if ((window as any).auditorDashboardState) {
    (window as any).auditorDashboardState.currentFilters = filterValues;
    console.log('[DEBUG] applyFilters - state filters updated:', { filters: (window as any).auditorDashboardState.currentFilters });
    (window as any).auditorDashboardState.applyFilters();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:277',message:'applyFilters state updated, should refresh',data:{hasController:!!(window as any).auditorDashboardController},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch((e)=>console.warn('[DEBUG] Fetch failed:',e));
    // #endregion
    // Trigger data refresh with new filters
    if ((window as any).auditorDashboardController) {
      console.log('[DEBUG] applyFilters calling loadTeamStats to refresh data');
      (window as any).auditorDashboardController.loadTeamStats();
    } else {
      console.warn('[DEBUG] applyFilters - controller not available');
    }
  } else {
    console.warn('[DEBUG] applyFilters - state not available');
  }
};

(window as any).clearFilters = async function() {
  console.log('[DEBUG] clearFilters called');
  
  // Clear filter dropdowns
  const statusEl = document.getElementById('statusFilter') as HTMLSelectElement;
  const channelEl = document.getElementById('channelFilter') as HTMLSelectElement;
  const auditorEl = document.getElementById('auditorFilter') as HTMLSelectElement;
  const employeeEl = document.getElementById('employeeFilter') as HTMLSelectElement;
  const scorecardEl = document.getElementById('scorecardFilter') as HTMLSelectElement;

  if (statusEl) statusEl.value = '';
  if (channelEl) channelEl.value = '';
  if (auditorEl) auditorEl.value = '';
  if (employeeEl) employeeEl.value = '';
  if (scorecardEl) scorecardEl.value = '';

  if ((window as any).auditorDashboardState) {
    (window as any).auditorDashboardState.clearFilters();
    // Trigger refresh after clearing filters
    if ((window as any).auditorDashboardController) {
      await (window as any).auditorDashboardController.loadTeamStats();
    }
  }
};

(window as any).switchTab = async function(tabElement: HTMLElement, index: number) {
  if ((window as any).auditorDashboardController) {
    await (window as any).auditorDashboardController.switchTab(index);
  }
};

// Export event handlers instance to window for global functions
export function exposeEventHandlers(handlers: AuditorDashboardEventHandlers): void {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-events.ts:485',message:'exposeEventHandlers called',data:{hasHandlers:!!handlers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  (window as any).auditorDashboardEventHandlers = handlers;
}
