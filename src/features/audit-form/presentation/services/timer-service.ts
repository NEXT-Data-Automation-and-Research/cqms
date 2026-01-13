/**
 * Timer Service
 * Manages audit timer with persistent state
 * Migrated from audit-form.html
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';

interface TimerState {
  elapsedTime: number;
  auditStartTimestamp: number | null;
  lastPauseTime: number | null;
  isRunning: boolean;
  sessionId: string;
  savedAt: number;
  interactionId: string | null;
  assignmentId: string | null;
}

export class TimerService {
  private timerInterval: NodeJS.Timeout | null = null;
  private startTime: number | null = null;
  private elapsedTime = 0;
  private isRunning = false;
  private auditStartTimestamp: number | null = null;
  private lastPauseTime: number | null = null;
  private sessionId: string | null = null;
  
  private timerDisplay: HTMLElement | null = null;
  private timerControlBtn: HTMLElement | null = null;
  private timerStatusIndicator: HTMLElement | null = null;
  
  private readonly STORAGE_PREFIX = 'audit_timer_';
  private readonly SESSION_LIST_KEY = 'audit_active_sessions';
  private readonly AUTO_SAVE_INTERVAL = 5000;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize timer elements
   */
  initializeElements(): void {
    const timerEl = document.querySelector('#auditTimer');
    if (!timerEl) {
      logWarn('Timer element not found');
      return;
    }

    this.timerDisplay = timerEl.querySelector('span');
    if (!this.timerDisplay) {
      const spans = timerEl.querySelectorAll('span');
      if (spans.length > 0) {
        this.timerDisplay = spans[0] as HTMLElement;
      }
    }

    this.timerControlBtn = document.querySelector('#timerControlBtn') as HTMLElement;
    
    // Create status indicator if it doesn't exist
    if (!timerEl.querySelector('.timer-status')) {
      this.timerStatusIndicator = document.createElement('div');
      this.timerStatusIndicator.className = 'timer-status';
      this.timerStatusIndicator.style.cssText = 'width: 0.3234rem; height: 0.3234rem; border-radius: 50%; background: #10b981; margin-left: 0.1617rem; display: inline-block; animation: pulse 2s infinite;';
      timerEl.appendChild(this.timerStatusIndicator);
    } else {
      this.timerStatusIndicator = timerEl.querySelector('.timer-status') as HTMLElement;
    }
  }

  /**
   * Format time in HH:MM:SS or MM:SS format
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get or generate session ID
   */
  getSessionId(): string {
    if (this.sessionId) return this.sessionId;
    
    const interactionIdField = document.getElementById('interactionId') as HTMLInputElement;
    const interactionId = interactionIdField?.value?.trim();
    
    const assignmentId = (window as any).currentAssignmentId || null;
    const editingAuditId = (window as any).currentEditingAuditId || null;
    
    if (editingAuditId) {
      this.sessionId = `edit_${editingAuditId}`;
    } else if (assignmentId) {
      this.sessionId = `assignment_${assignmentId}`;
    } else if (interactionId) {
      this.sessionId = `interaction_${interactionId}`;
    } else {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return this.sessionId;
  }

  /**
   * Get storage key for this session
   */
  private getStorageKey(): string {
    return this.STORAGE_PREFIX + this.getSessionId();
  }

  /**
   * Get current elapsed time
   */
  private getCurrentElapsedTime(): number {
    if (!this.isRunning || !this.startTime) {
      return this.elapsedTime;
    }
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - this.startTime) / 1000);
    return this.elapsedTime + elapsedSinceStart;
  }

  /**
   * Save timer state to localStorage
   */
  saveTimerState(): void {
    try {
      const currentElapsed = this.getCurrentElapsedTime();
      const state: TimerState = {
        elapsedTime: currentElapsed,
        auditStartTimestamp: this.auditStartTimestamp,
        lastPauseTime: this.isRunning ? null : Date.now(),
        isRunning: false, // Always save as paused
        sessionId: this.getSessionId(),
        savedAt: Date.now(),
        interactionId: document.getElementById('interactionId')?.getAttribute('value')?.trim() || null,
        assignmentId: (window as any).currentAssignmentId || null
      };
      
      localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
      this.updateActiveSessionsList();
      this.updateStatusIndicator('saved');
      
      logInfo('Timer state saved');
    } catch (error) {
      logError('Error saving timer state:', error);
    }
  }

  /**
   * Restore timer state from localStorage
   */
  restoreTimerState(): boolean {
    try {
      const savedState = localStorage.getItem(this.getStorageKey());
      if (!savedState) {
        logInfo('No saved timer state found');
        return false;
      }
      
      const state: TimerState = JSON.parse(savedState);
      logInfo('Restoring timer state');
      
      this.elapsedTime = state.elapsedTime || 0;
      this.auditStartTimestamp = state.auditStartTimestamp || null;
      this.sessionId = state.sessionId || null;
      
      // If timer was running, add time that passed since save
      if (!state.lastPauseTime && state.savedAt) {
        const timeSinceSave = Math.floor((Date.now() - state.savedAt) / 1000);
        this.elapsedTime += timeSinceSave;
      }
      
      // Update display
      this.updateDisplay();
      this.updateAuditDuration();
      
      return true;
    } catch (error) {
      logError('Error restoring timer state:', error);
      return false;
    }
  }

  /**
   * Start timer
   */
  startTimer(): void {
    if (this.isRunning) {
      logWarn('Timer is already running');
      return;
    }

    if (!this.auditStartTimestamp) {
      this.auditStartTimestamp = Date.now();
    }

    this.startTime = Date.now();
    this.isRunning = true;
    this.lastPauseTime = null;

    // Update display immediately
    this.updateDisplay();

    // Start interval
    this.timerInterval = setInterval(() => {
      this.updateDisplay();
      this.updateAuditDuration();
    }, 1000);

    // Start auto-save
    this.startAutoSave();

    // Update UI
    this.updateControlButton('pause');
    this.updateStatusIndicator('running');

    logInfo('Timer started');
  }

  /**
   * Pause timer
   */
  pauseTimer(): void {
    if (!this.isRunning) {
      logWarn('Timer is not running');
      return;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const now = Date.now();
    if (this.startTime) {
      const elapsedSinceStart = Math.floor((now - this.startTime) / 1000);
      this.elapsedTime += elapsedSinceStart;
    }

    this.isRunning = false;
    this.lastPauseTime = now;
    this.startTime = null;

    // Stop auto-save
    this.stopAutoSave();

    // Save state
    this.saveTimerState();

    // Update UI
    this.updateControlButton('play');
    this.updateStatusIndicator('paused');

    logInfo('Timer paused');
  }

  /**
   * Reset timer
   */
  resetTimer(): void {
    this.pauseTimer();
    
    this.elapsedTime = 0;
    this.auditStartTimestamp = null;
    this.startTime = null;
    this.lastPauseTime = null;

    // Clear saved state
    try {
      localStorage.removeItem(this.getStorageKey());
      this.updateActiveSessionsList();
    } catch (error) {
      logError('Error clearing timer state:', error);
    }

    // Update display
    this.updateDisplay();
    this.updateAuditDuration();

    // Update UI
    this.updateControlButton('play');
    this.updateStatusIndicator('stopped');

    logInfo('Timer reset');
  }

  /**
   * Update display
   */
  private updateDisplay(): void {
    const currentElapsed = this.getCurrentElapsedTime();
    if (this.timerDisplay) {
      this.timerDisplay.textContent = this.formatTime(currentElapsed);
    }
  }

  /**
   * Update audit duration hidden field
   */
  updateAuditDuration(): void {
    const durationField = document.getElementById('auditDuration') as HTMLInputElement;
    if (durationField) {
      const currentElapsed = this.getCurrentElapsedTime();
      durationField.value = currentElapsed.toString();
    }
  }

  /**
   * Update control button
   */
  private updateControlButton(state: 'play' | 'pause'): void {
    if (!this.timerControlBtn) return;

    const playIcon = '<path d="M8 5v14l11-7z"/>';
    const pauseIcon = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';

    if (state === 'play') {
      this.timerControlBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">${playIcon}</svg>`;
      this.timerControlBtn.setAttribute('title', 'Start Timer');
    } else {
      this.timerControlBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">${pauseIcon}</svg>`;
      this.timerControlBtn.setAttribute('title', 'Pause Timer');
    }
  }

  /**
   * Update status indicator
   */
  private updateStatusIndicator(status: 'running' | 'paused' | 'stopped' | 'saved'): void {
    if (!this.timerStatusIndicator) return;

    const colors: Record<string, string> = {
      running: '#10b981',
      paused: '#f59e0b',
      stopped: '#6b7280',
      saved: '#3b82f6'
    };

    this.timerStatusIndicator.style.background = colors[status] || '#6b7280';
  }

  /**
   * Start auto-save
   */
  private startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.saveTimerState();
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Update active sessions list
   */
  private updateActiveSessionsList(): void {
    try {
      const sessions = JSON.parse(localStorage.getItem(this.SESSION_LIST_KEY) || '[]');
      const sessionId = this.getSessionId();
      
      if (!sessions.includes(sessionId)) {
        sessions.push(sessionId);
        localStorage.setItem(this.SESSION_LIST_KEY, JSON.stringify(sessions));
      }
    } catch (error) {
      logError('Error updating active sessions list:', error);
    }
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    return this.getCurrentElapsedTime();
  }

  /**
   * Check if timer is running
   */
  isTimerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.pauseTimer();
    this.stopAutoSave();
  }
}

// Singleton instance
let timerServiceInstance: TimerService | null = null;

/**
 * Get timer service instance
 */
export function getTimerService(): TimerService {
  if (!timerServiceInstance) {
    timerServiceInstance = new TimerService();
  }
  return timerServiceInstance;
}

/**
 * Initialize timer with persistence
 */
export function initializeTimerWithPersistence(): void {
  const timer = getTimerService();
  timer.initializeElements();
  timer.restoreTimerState();
  
  // Attach control button handler
  const controlBtn = document.querySelector('#timerControlBtn');
  if (controlBtn) {
    controlBtn.addEventListener('click', () => {
      if (timer.isTimerRunning()) {
        timer.pauseTimer();
      } else {
        timer.startTimer();
      }
    });
  }

  // Expose to window for backward compatibility
  (window as any).startTimer = () => timer.startTimer();
  (window as any).pauseTimer = () => timer.pauseTimer();
  (window as any).resetTimer = () => timer.resetTimer();
  (window as any).updateAuditDuration = () => timer.updateAuditDuration();
}

