/**
 * Virtual Scrolling Utility
 * Only renders visible items in large lists for better performance
 */

interface VirtualScrollOptions {
  container: HTMLElement;
  itemHeight: number;
  renderItem: (item: any, index: number) => string;
  items: any[];
  buffer?: number; // Number of items to render outside viewport
}

/**
 * Simple virtual scrolling implementation
 * Only renders items visible in viewport + buffer
 */
export class VirtualScroll {
  private container: HTMLElement;
  private itemHeight: number;
  private renderItem: (item: any, index: number) => string;
  private items: any[];
  private buffer: number;
  private scrollTop: number = 0;
  private containerHeight: number = 0;
  private visibleStart: number = 0;
  private visibleEnd: number = 0;

  constructor(options: VirtualScrollOptions) {
    this.container = options.container;
    this.itemHeight = options.itemHeight;
    this.renderItem = options.renderItem;
    this.items = options.items;
    this.buffer = options.buffer || 5;

    this.init();
  }

  private init(): void {
    this.containerHeight = this.container.clientHeight;
    this.updateVisibleRange();
    this.render();

    // Listen to scroll events
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop;
      this.updateVisibleRange();
      this.render();
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.containerHeight = this.container.clientHeight;
      this.updateVisibleRange();
      this.render();
    });
    resizeObserver.observe(this.container);
  }

  private updateVisibleRange(): void {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);

    this.visibleStart = Math.max(0, start - this.buffer);
    this.visibleEnd = Math.min(this.items.length, end + this.buffer);
  }

  private render(): void {
    const visibleItems = this.items.slice(this.visibleStart, this.visibleEnd);
    const offsetY = this.visibleStart * this.itemHeight;
    const totalHeight = this.items.length * this.itemHeight;

    // Create wrapper with proper height
    const wrapper = document.createElement('div');
    wrapper.style.height = `${totalHeight}px`;
    wrapper.style.position = 'relative';

    // Create visible items container
    const itemsContainer = document.createElement('div');
    itemsContainer.style.position = 'absolute';
    itemsContainer.style.top = `${offsetY}px`;
    itemsContainer.style.width = '100%';

    // Render visible items
    visibleItems.forEach((item, index) => {
      const actualIndex = this.visibleStart + index;
      const itemElement = document.createElement('div');
      itemElement.innerHTML = this.renderItem(item, actualIndex);
      itemsContainer.appendChild(itemElement.firstElementChild || itemElement);
    });

    wrapper.appendChild(itemsContainer);
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
  }

  /**
   * Update items and re-render
   */
  updateItems(items: any[]): void {
    this.items = items;
    this.updateVisibleRange();
    this.render();
  }

  /**
   * Scroll to specific item
   */
  scrollToIndex(index: number): void {
    const scrollTop = index * this.itemHeight;
    this.container.scrollTop = scrollTop;
  }
}

/**
 * Simple pagination-based virtual scrolling
 * Better for very large lists - loads more as user scrolls
 */
export class PaginatedVirtualScroll {
  private container: HTMLElement;
  private loadMoreFn: (page: number) => Promise<any[]>;
  private renderItem: (item: any, index: number) => string;
  private items: any[] = [];
  private currentPage: number = 0;
  private isLoading: boolean = false;
  private hasMore: boolean = true;
  private pageSize: number;

  constructor(
    container: HTMLElement,
    loadMoreFn: (page: number) => Promise<any[]>,
    renderItem: (item: any, index: number) => string,
    pageSize: number = 20
  ) {
    this.container = container;
    this.loadMoreFn = loadMoreFn;
    this.renderItem = renderItem;
    this.pageSize = pageSize;

    this.init();
  }

  private async init(): Promise<void> {
    await this.loadPage(0);
    this.setupScrollListener();
  }

  private async loadPage(page: number): Promise<void> {
    if (this.isLoading || (!this.hasMore && page > 0)) return;

    this.isLoading = true;
    try {
      const newItems = await this.loadMoreFn(page);
      if (newItems.length < this.pageSize) {
        this.hasMore = false;
      }
      this.items = this.items.concat(newItems);
      this.currentPage = page;
      this.render();
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private render(): void {
    this.container.innerHTML = this.items
      .map((item, index) => this.renderItem(item, index))
      .join('');

    // Add load more button if there's more data
    if (this.hasMore && !this.isLoading) {
      const loadMoreBtn = document.createElement('div');
      loadMoreBtn.className = 'px-4 py-3 text-center';
      loadMoreBtn.innerHTML = `
        <button onclick="this.parentElement.dispatchEvent(new CustomEvent('loadmore'))" 
                class="px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors">
          Load More
        </button>
      `;
      loadMoreBtn.addEventListener('loadmore', () => {
        this.loadPage(this.currentPage + 1);
      });
      this.container.appendChild(loadMoreBtn);
    }
  }

  private setupScrollListener(): void {
    let lastScrollTop = 0;
    this.container.addEventListener('scroll', () => {
      const scrollTop = this.container.scrollTop;
      const scrollHeight = this.container.scrollHeight;
      const clientHeight = this.container.clientHeight;

      // Load more when near bottom (80% scrolled)
      if (scrollTop + clientHeight >= scrollHeight * 0.8 && this.hasMore && !this.isLoading) {
        this.loadPage(this.currentPage + 1);
      }

      lastScrollTop = scrollTop;
    });
  }

  /**
   * Reset and reload from beginning
   */
  async reset(): Promise<void> {
    this.items = [];
    this.currentPage = 0;
    this.hasMore = true;
    await this.loadPage(0);
  }
}
