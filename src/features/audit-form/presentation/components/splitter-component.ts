/**
 * Splitter Component
 * Handles the resizable splitter between left and right columns
 */

export class SplitterComponent {
  private container: HTMLElement | null = null;
  private leftColumn: HTMLElement | null = null;
  private rightColumn: HTMLElement | null = null;
  private isResizing: boolean = false;

  /**
   * Render the splitter component
   */
  render(container: HTMLElement, leftColumn: HTMLElement, rightColumn: HTMLElement): void {
    this.container = container;
    this.leftColumn = leftColumn;
    this.rightColumn = rightColumn;
    
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    return `
      <div id="splitter" style="width: 0.2425rem; background: #e5e7eb; cursor: col-resize; position: relative; flex-shrink: 0; transition: background 0.2s; z-index: 1;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.1213rem; height: 1.2128rem; background: #9ca3af; border-radius: 0.0606rem;"></div>
      </div>
    `;
  }

  /**
   * Attach event listeners for resizing
   */
  private attachEventListeners(): void {
    const splitter = document.getElementById('splitter');
    if (!splitter || !this.leftColumn || !this.rightColumn) return;

    splitter.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      splitter.style.background = '#9ca3af';
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isResizing || !this.leftColumn || !this.rightColumn) return;

      const container = this.leftColumn.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const minLeftWidth = 200; // Minimum width for left column in pixels
      const maxLeftWidth = containerRect.width * 0.75; // Maximum 75% of container width

      if (mouseX >= minLeftWidth && mouseX <= maxLeftWidth) {
        const leftPercent = (mouseX / containerRect.width) * 100;
        this.leftColumn.style.flex = `0 0 ${leftPercent}%`;
        this.leftColumn.style.maxWidth = `${leftPercent}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isResizing) {
        this.isResizing = false;
        const splitter = document.getElementById('splitter');
        if (splitter) {
          splitter.style.background = '#e5e7eb';
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
