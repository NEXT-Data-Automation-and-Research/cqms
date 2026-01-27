/**
 * Audit Timer Component
 * Handles the floating timer display and controls
 */

export interface AuditTimerConfig {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onClose?: () => void;
  initialTime?: number; // seconds
}

export class AuditTimer {
  private container: HTMLElement | null = null;
  private timerDisplay: HTMLElement | null = null;
  private controlBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private config: AuditTimerConfig;
  private isRunning: boolean = false;
  private elapsedTime: number = 0;
  private intervalId: number | null = null;

  constructor(config: AuditTimerConfig = {}) {
    this.config = config;
    this.elapsedTime = config.initialTime || 0;
  }

  /**
   * Render the timer component
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.updateDisplay();
  }

  /**
   * Get HTML template for timer
   */
  private getHTML(): string {
    return `
      <div id="auditTimer" style="position: fixed; top: 0.6469rem; right: 3.2344rem; background:var(--primary-color); padding: 0.1294rem 0.3234rem 0.1294rem 0.1294rem; border-radius: 2.0215rem; font-size: 0.6064rem; font-weight: 600; color: #ffffff; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; letter-spacing: 0.0122rem; flex-shrink: 0; white-space: nowrap; font-variant-numeric: tabular-nums; min-width: 4.8516rem; display: none; align-items: center; gap: 0.3234rem; cursor: grab; user-select: none; z-index: 10001;">
        <button id="timerControlBtn" title="Play/Pause/Reset Timer" style="width: 1.1321rem; height: 1.1321rem; background: rgba(255, 255, 255, 0.2); border: none; border-radius: 50%; color: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; flex-shrink: 0; margin: 0; padding: 0;">
          <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <span id="timerDisplay" style="flex: 1; text-align: center; font-size: 0.6064rem; font-weight: 600; font-variant-numeric: tabular-nums;">00:00</span>
        <button id="timerCloseBtn" class="timer-close-btn" title="Close Timer" style="width: 1.2937rem; height: 1.2937rem; background: var(--primary-color); border: none; border-radius: 0.2425rem; color: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; flex-shrink: 0; margin: 0; padding: 0; font-size: 0.8086rem; font-weight: bold; transition: all 0.2s;">
          ×
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const timerElement = document.getElementById('auditTimer');
    if (!timerElement) return;

    this.timerDisplay = document.getElementById('timerDisplay');
    this.controlBtn = document.getElementById('timerControlBtn') as HTMLButtonElement;
    this.closeBtn = document.getElementById('timerCloseBtn') as HTMLButtonElement;

    // Control button click
    if (this.controlBtn) {
      this.controlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTimer();
      });
    }

    // Close button click
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        if (this.config.onClose) {
          this.config.onClose();
        }
      });
    }

    // Make timer draggable
    this.makeDraggable(timerElement);
  }

  /**
   * Toggle timer play/pause
   */
  toggleTimer(): void {
    if (this.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Start the timer
   */
  play(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    if (this.config.onPlay) {
      this.config.onPlay();
    }

    // Update button icon to pause
    if (this.controlBtn) {
      this.controlBtn.innerHTML = `
        <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
      this.controlBtn.title = 'Pause Timer';
    }

    // Start interval
    this.intervalId = window.setInterval(() => {
      this.elapsedTime++;
      this.updateDisplay();
    }, 1000);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.config.onPause) {
      this.config.onPause();
    }

    // Update button icon to play
    if (this.controlBtn) {
      this.controlBtn.innerHTML = `
        <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      this.controlBtn.title = 'Play Timer';
    }

    // Clear interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.pause();
    this.elapsedTime = 0;
    this.updateDisplay();
    if (this.config.onReset) {
      this.config.onReset();
    }
  }

  /**
   * Update timer display
   */
  private updateDisplay(): void {
    if (!this.timerDisplay) return;
    
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.timerDisplay.textContent = formattedTime;
  }

  /**
   * Show the timer
   */
  show(): void {
    const timerElement = document.getElementById('auditTimer');
    if (timerElement) {
      timerElement.style.display = 'flex';
    }
  }

  /**
   * Hide the timer
   */
  hide(): void {
    this.pause();
    const timerElement = document.getElementById('auditTimer');
    if (timerElement) {
      timerElement.style.display = 'none';
    }
  }

  /**
   * Get current elapsed time in seconds
   */
  getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Set elapsed time
   */
  setElapsedTime(seconds: number): void {
    this.elapsedTime = seconds;
    this.updateDisplay();
  }

  /**
   * Make timer draggable
   */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    element.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking on buttons
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }

      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;

      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'grab';
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.pause();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
