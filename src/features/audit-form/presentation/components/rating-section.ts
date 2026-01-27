/**
 * Rating Section Component
 * Handles the audit rating stars and feedback display
 * Used in view mode for employees to rate the audit after acknowledgement
 */

export interface RatingSectionConfig {
  /** Called when a rating is submitted */
  onRateSubmit?: (rating: number, feedback: string) => void | Promise<void>;
  /** Whether rating is enabled (employee has acknowledged) */
  enabled?: boolean;
  /** Current rating value (1-5) */
  currentRating?: number;
  /** Current feedback text */
  currentFeedback?: string;
  /** When the audit was rated */
  ratedAt?: string;
}

export class RatingSection {
  private container: HTMLElement | null = null;
  private config: RatingSectionConfig;
  private selectedRating: number = 0;

  constructor(config: RatingSectionConfig = {}) {
    this.config = config;
    this.selectedRating = config.currentRating || 0;
  }

  /**
   * Render the rating section
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM
   */
  initializeWithExistingDOM(): void {
    this.container = document.getElementById('ratingSection');
    if (this.container) {
      this.attachEventListeners();
      
      // Set initial rating if provided
      if (this.config.currentRating) {
        this.setRating(this.config.currentRating);
      }
    }
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    const isEnabled = this.config.enabled !== false;
    const hasRating = !!this.config.currentRating;
    
    return `
      <div id="ratingSection" style="background: #f9fafb; border-radius: 0.3234rem; padding: 0.6469rem; border: 0.0304rem solid #e5e7eb; margin-top: 0.6469rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4852rem;">
          <h3 style="font-size: 0.6064rem; font-weight: 600; color: #374151; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
            <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Rate This Audit
          </h3>
          ${hasRating && this.config.ratedAt ? `
            <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif;">
              Rated on ${new Date(this.config.ratedAt).toLocaleDateString()}
            </span>
          ` : ''}
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.4852rem;">
          <!-- Star Rating -->
          <div id="starRatingContainer" style="display: flex; gap: 0.2425rem; ${!isEnabled ? 'opacity: 0.6; pointer-events: none;' : ''}">
            ${this.getStarsHTML()}
          </div>
          
          <!-- Feedback -->
          <div style="display: ${isEnabled || hasRating ? 'block' : 'none'};">
            <textarea 
              id="ratingFeedback" 
              placeholder="Share your feedback about this audit..." 
              ${!isEnabled ? 'readonly' : ''}
              style="width: 100%; padding: 0.4852rem; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; resize: vertical; min-height: 2.4258rem; box-sizing: border-box; ${!isEnabled ? 'background: #f3f4f6;' : ''}"
            >${this.config.currentFeedback || ''}</textarea>
          </div>
          
          <!-- Submit Button -->
          <div style="display: ${isEnabled && !hasRating ? 'flex' : 'none'}; justify-content: flex-end;">
            <button 
              type="button" 
              id="submitRatingBtn"
              disabled
              style="padding: 0.3234rem 0.6469rem; background: #f59e0b; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; opacity: 0.5;"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get stars HTML
   */
  private getStarsHTML(): string {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= this.selectedRating;
      stars.push(`
        <button 
          type="button" 
          class="rating-star" 
          data-rating="${i}"
          style="background: none; border: none; cursor: pointer; padding: 0.1617rem; transition: transform 0.2s;"
        >
          <svg style="width: 1.2937rem; height: 1.2937rem;" viewBox="0 0 24 24" fill="${isFilled ? '#f59e0b' : 'none'}" stroke="${isFilled ? '#f59e0b' : '#d1d5db'}" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      `);
    }
    return stars.join('');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Star click handlers
    const stars = this.container.querySelectorAll('.rating-star');
    stars.forEach((star) => {
      star.addEventListener('click', (e) => {
        const rating = parseInt((e.currentTarget as HTMLElement).dataset.rating || '0');
        this.setRating(rating);
      });

      // Hover effects
      star.addEventListener('mouseenter', (e) => {
        const rating = parseInt((e.currentTarget as HTMLElement).dataset.rating || '0');
        this.highlightStars(rating);
      });

      star.addEventListener('mouseleave', () => {
        this.highlightStars(this.selectedRating);
      });
    });

    // Submit button
    const submitBtn = document.getElementById('submitRatingBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmit());
    }
  }

  /**
   * Set the current rating
   */
  setRating(rating: number): void {
    this.selectedRating = rating;
    this.highlightStars(rating);
    
    // Enable submit button
    const submitBtn = document.getElementById('submitRatingBtn') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = rating === 0;
      submitBtn.style.opacity = rating === 0 ? '0.5' : '1';
    }
  }

  /**
   * Highlight stars up to the given rating
   */
  private highlightStars(rating: number): void {
    if (!this.container) return;

    const stars = this.container.querySelectorAll('.rating-star svg');
    stars.forEach((svg, index) => {
      const isFilled = index < rating;
      svg.setAttribute('fill', isFilled ? '#f59e0b' : 'none');
      svg.setAttribute('stroke', isFilled ? '#f59e0b' : '#d1d5db');
    });
  }

  /**
   * Handle rating submission
   */
  private async handleSubmit(): Promise<void> {
    if (this.selectedRating === 0) return;

    const feedbackEl = document.getElementById('ratingFeedback') as HTMLTextAreaElement;
    const feedback = feedbackEl?.value || '';

    if (this.config.onRateSubmit) {
      await this.config.onRateSubmit(this.selectedRating, feedback);
    }
  }

  /**
   * Get current rating value
   */
  getRating(): number {
    return this.selectedRating;
  }

  /**
   * Get current feedback text
   */
  getFeedback(): string {
    const feedbackEl = document.getElementById('ratingFeedback') as HTMLTextAreaElement;
    return feedbackEl?.value || '';
  }

  /**
   * Enable/disable the rating section
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    const container = document.getElementById('starRatingContainer');
    if (container) {
      container.style.opacity = enabled ? '1' : '0.6';
      container.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    const feedback = document.getElementById('ratingFeedback') as HTMLTextAreaElement;
    if (feedback) {
      feedback.readOnly = !enabled;
      feedback.style.background = enabled ? '' : '#f3f4f6';
    }
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
