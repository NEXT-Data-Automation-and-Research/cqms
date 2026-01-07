/**
 * Pagination Component
 * Reusable pagination controls
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showItemsPerPage?: boolean;
}

export class Pagination {
  private container: HTMLElement;
  private config: PaginationConfig;

  constructor(container: HTMLElement, config: PaginationConfig) {
    this.container = container;
    this.config = {
      showItemsPerPage: true,
      ...config
    };
    this.render();
  }

  private render(): void {
    const { currentPage, itemsPerPage, totalItems, showItemsPerPage } = this.config;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) {
      safeSetHTML(this.container, '');
      return;
    }

    const pageButtons = this.renderPageButtons(totalPages);
    const itemsPerPageSelect = showItemsPerPage ? this.renderItemsPerPageSelect() : '';

    safeSetHTML(this.container, `
      <div class="flex justify-between items-center flex-wrap gap-1.5 py-1.5">
        ${showItemsPerPage ? `
          <div class="flex items-center gap-1.5">
            <label class="text-xs text-gray-700 font-medium">Items per page:</label>
            ${itemsPerPageSelect}
          </div>
        ` : ''}
        <div class="text-xs text-gray-500">Showing ${startIndex}-${endIndex} of ${totalItems}</div>
        <div class="flex gap-0.5 items-center">
          ${pageButtons}
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private renderPageButtons(totalPages: number): string {
    const { currentPage } = this.config;
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let buttons = '';

    // Previous button
    buttons += `
      <button
        class="pagination-btn px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-xs transition-all hover:bg-gray-50 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[30px] text-center"
        ${currentPage === 1 ? 'disabled' : ''}
        data-page="${currentPage - 1}"
      >
        ‹
      </button>
    `;

    // First page
    if (startPage > 1) {
      buttons += `
        <button
          class="pagination-btn px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-xs transition-all hover:bg-gray-50 hover:border-primary hover:text-primary min-w-[30px] text-center"
          data-page="1"
        >
          1
        </button>
      `;
      if (startPage > 2) {
        buttons += `<span class="px-1.5 text-gray-500 text-xs">...</span>`;
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;
      buttons += `
        <button
          class="pagination-btn px-2 py-1 border rounded text-xs transition-all min-w-[30px] text-center ${
            isActive
              ? 'bg-primary text-white border-primary hover:bg-primary-dark'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-primary hover:text-primary'
          }"
          data-page="${i}"
        >
          ${i}
        </button>
      `;
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons += `<span class="px-1.5 text-gray-500 text-xs">...</span>`;
      }
      buttons += `
        <button
          class="pagination-btn px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-xs transition-all hover:bg-gray-50 hover:border-primary hover:text-primary min-w-[30px] text-center"
          data-page="${totalPages}"
        >
          ${totalPages}
        </button>
      `;
    }

    // Next button
    buttons += `
      <button
        class="pagination-btn px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-xs transition-all hover:bg-gray-50 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[30px] text-center"
        ${currentPage === totalPages ? 'disabled' : ''}
        data-page="${currentPage + 1}"
      >
        ›
      </button>
    `;

    return buttons;
  }

  private renderItemsPerPageSelect(): string {
    const { itemsPerPage } = this.config;
    const options = [10, 20, 50, 100];

    return `
      <select
        class="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        value="${itemsPerPage}"
      >
        ${options.map(opt => `
          <option value="${opt}" ${opt === itemsPerPage ? 'selected' : ''}>${opt}</option>
        `).join('')}
      </select>
    `;
  }

  private attachEventListeners(): void {
    const pageButtons = this.container.querySelectorAll('.pagination-btn[data-page]');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page') || '1');
        this.config.onPageChange(page);
      });
    });

    const itemsPerPageSelect = this.container.querySelector('select');
    if (itemsPerPageSelect && this.config.onItemsPerPageChange) {
      itemsPerPageSelect.addEventListener('change', () => {
        const value = parseInt((itemsPerPageSelect as HTMLSelectElement).value);
        this.config.onItemsPerPageChange!(value);
      });
    }
  }

  update(config: Partial<PaginationConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

