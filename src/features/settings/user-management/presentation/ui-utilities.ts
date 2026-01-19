/**
 * UI Utilities
 * Client-side utilities for dropdowns, navigation, and fallback handlers
 */

/**
 * Toggle dropdown visibility
 * @param dropdownId - The ID of the dropdown element to toggle
 */
export function toggleDropdown(dropdownId: string): void {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const isShowing = dropdown.classList.contains('show');

  // Close all other dropdowns
  document.querySelectorAll('.dropdown-menu.show, .action-dropdown-menu.show').forEach((menu) => {
    if (menu.id !== dropdownId) {
      menu.classList.remove('show');
      const button = document.querySelector(`[data-dropdown-toggle="${menu.id}"]`);
      if (button) {
        button.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Toggle current dropdown
  if (isShowing) {
    dropdown.classList.remove('show');
    const button = document.querySelector(`[data-dropdown-toggle="${dropdownId}"]`);
    if (button) {
      button.setAttribute('aria-expanded', 'false');
    }
  } else {
    dropdown.classList.add('show');
    const button = document.querySelector(`[data-dropdown-toggle="${dropdownId}"]`);
    if (button) {
      button.setAttribute('aria-expanded', 'true');
    }
  }
}

/**
 * Close dropdowns when clicking outside
 */
export function setupDropdownCloseOnOutsideClick(): void {
  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.dropdown-wrapper') &&
      !target.closest('.action-dropdown-wrapper')
    ) {
      document.querySelectorAll('.dropdown-menu.show, .action-dropdown-menu.show').forEach((menu) => {
        menu.classList.remove('show');
        const button = document.querySelector(`[data-dropdown-toggle="${menu.id}"]`);
        if (button) {
          button.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
}

/**
 * Edit user function - opens edit modal for a user
 * @param email - The email of the user to edit
 */
export function editUser(email: string): void {
  const win = window as any;
  if (win.openEditModal) {
    win.openEditModal(email);
  } else {
    // Fallback: wait for handlers to be set up
    setTimeout(() => {
      if (win.openEditModal) {
        win.openEditModal(email);
      }
    }, 100);
  }
}

/**
 * Pagination function - navigates to a specific page
 * @param page - The page number to navigate to
 */
export function goToPage(page: number): void {
  // TODO: Implement pagination state management
}

/**
 * Setup fallback event handlers for buttons that may not be loaded yet
 * This ensures buttons work even if TypeScript modules load with delays
 */
export function setupFallbackHandlers(): void {
  // Search form - prevent default submission
  const searchForm = document.querySelector('.search-form');
  if (searchForm && !searchForm.hasAttribute('data-listener-added')) {
    searchForm.setAttribute('data-listener-added', 'true');
    searchForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      return false;
    });
  }

  // Create User button fallback
  const createBtn = document.querySelector('.btn-create-modern');
  if (createBtn && !createBtn.hasAttribute('data-listener-added')) {
    createBtn.setAttribute('data-listener-added', 'true');
    createBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const win = window as any;
      if (win.openCreateUserModal) {
        win.openCreateUserModal();
      } else {
        console.warn('openCreateUserModal not available yet');
        // Retry after a short delay
        setTimeout(() => {
          if (win.openCreateUserModal) {
            win.openCreateUserModal();
          }
        }, 500);
      }
    });
  }

  // Actions dropdown items fallback
  document.querySelectorAll('.dropdown-item').forEach((item) => {
    if (!item.hasAttribute('data-listener-added')) {
      item.setAttribute('data-listener-added', 'true');
      item.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
        const text = target.textContent?.trim();
        const win = window as any;

        if (action === 'bulk-upload' || text === 'Bulk Upload CSV') {
          if (win.openBulkUploadModal) {
            win.openBulkUploadModal();
          }
        } else if (action === 'refresh' || text === 'Refresh List') {
          if (win.refreshUsers) {
            win.refreshUsers();
          }
        }
      });
    }
  });

  // Bulk apply button fallback
  const bulkApplyBtn = document.getElementById('bulkApplyButton') || document.querySelector('.btn-bulk-apply');
  if (bulkApplyBtn && !bulkApplyBtn.hasAttribute('data-listener-added')) {
    bulkApplyBtn.setAttribute('data-listener-added', 'true');
    bulkApplyBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const win = window as any;
      if (win.applyBulkEdit) {
        win.applyBulkEdit();
      }
    });
  }
}

/**
 * Initialize all UI utilities and expose functions to window
 */
export function initializeUIUtilities(): void {
  // Setup dropdown close on outside click
  setupDropdownCloseOnOutsideClick();

  // Setup fallback handlers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupFallbackHandlers();
    });
  } else {
    setupFallbackHandlers();
  }

  // Expose functions globally for inline onclick handlers
  const win = window as any;
  win.toggleDropdown = toggleDropdown;
  win.editUser = editUser;
  win.goToPage = goToPage;
}

// Auto-initialize when module loads
initializeUIUtilities();
