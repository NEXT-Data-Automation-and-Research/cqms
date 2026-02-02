/**
 * Header Metadata Manager
 * Manages header metadata display and scorecard messages
 * Migrated from audit-form.html
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logWarn } from '../../../../utils/logging-helper.js';

export class HeaderMetadataManager {
  /**
   * Update header metadata display
   */
  updateHeaderMetadata(): void {
    const metadataContainer = document.getElementById('headerMetadataCards');
    const backgroundScoreContainer = document.getElementById('headerBackgroundScore');
    const headerScoreValue = document.getElementById('headerScoreValue');
    const headerElement = document.getElementById('auditFormHeader');
    
    if (!metadataContainer) {
      logWarn('headerMetadataCards container not found');
      return;
    }
    
    // Get current values
    const averageScoreField = document.getElementById('averageScore') as HTMLInputElement;
    const passingStatusField = document.getElementById('passingStatus') as HTMLInputElement;
    const totalErrorsField = document.getElementById('totalErrorsCount') as HTMLInputElement;
    const quarterField = document.getElementById('quarter') as HTMLInputElement;
    const weekField = document.getElementById('week') as HTMLInputElement;
    const interactionDateField = document.getElementById('interactionDate') as HTMLInputElement;
    
    const averageScore = averageScoreField ? (parseFloat(averageScoreField.value) || 0) : 0;
    const passingStatus = passingStatusField ? (passingStatusField.value || '') : '';
    const totalErrors = totalErrorsField ? (parseInt(totalErrorsField.value) || 0) : 0;
    
    // Get quarter and week
    let quarter = quarterField ? (quarterField.value || '') : '';
    let week = weekField ? (weekField.value || '') : '';
    
    // Calculate if empty
    if (!quarter || !week) {
      const now = new Date();
      if (!quarter) {
        quarter = this.getQuarter(now);
      }
      if (!week) {
        week = this.getWeekNumber(now).toString();
      }
    }
    
    const interactionDate = interactionDateField ? interactionDateField.value : '';
    const formattedDate = this.formatDate(interactionDate);
    
    // Determine status icon
    let statusIcon = '';
    if (passingStatus) {
      const passingStatusLower = passingStatus.toLowerCase();
      const isPassing = passingStatusLower.includes('pass') && !passingStatusLower.includes('not');
      statusIcon = isPassing ? '✓ ' : '✗ ';
    }
    
    // Format quarter (ensure Q prefix)
    const formattedQuarter = quarter.startsWith('Q') ? quarter : `Q${quarter}`;
    
    // Escape HTML helper
    const escapeHtml = (text: string | null | undefined): string => {
      if (text == null) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    };
    
    // Build metadata cards HTML (matching HTML implementation)
    const metadataCardsHtml = `
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Date</p>
        <p style="font-size: 0.4852rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(formattedDate)}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Qtr</p>
        <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(formattedQuarter)}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Week</p>
        <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(week || 'N/A')}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Errors</p>
        <p style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(totalErrors.toString())}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Status</p>
        <p id="headerStatusDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${statusIcon}${escapeHtml(passingStatus || 'N/A')}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Score</p>
        <p id="headerScoreDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(averageScore.toFixed(0))}%</p>
      </div>
    `;
    
    safeSetHTML(metadataContainer, metadataCardsHtml);
    
    // Update background score (only show when scorecard is loaded)
    const currentScorecard = (window as any).currentScorecard;
    if (currentScorecard && backgroundScoreContainer) {
      const passingStatusLower = passingStatus.toLowerCase();
      const isPassingForScore = passingStatusLower.includes('pass') && !passingStatusLower.includes('not');
      const scoreTextColor = isPassingForScore 
        ? 'rgba(10, 50, 30, 0.4)'
        : 'rgba(100, 10, 10, 0.4)';
      
      if (headerScoreValue) {
        headerScoreValue.textContent = averageScore.toFixed(0);
      }
      
      const scoreSpan = backgroundScoreContainer.querySelector('span');
      if (scoreSpan) {
        (scoreSpan as HTMLElement).style.color = scoreTextColor;
      }
      
      backgroundScoreContainer.style.display = 'flex';
    } else {
      if (backgroundScoreContainer) {
        backgroundScoreContainer.style.display = 'none';
      }
    }
  }

  /**
   * Show no scorecard message
   */
  showNoScorecardMessage(): void {
    const currentParameters = (window as any).currentParameters || [];
    
    // Don't show message if parameters are already loaded
    if (currentParameters && currentParameters.length > 0) {
      return;
    }
    
    const container = document.getElementById('errorParametersContainer');
    if (container) {
      safeSetHTML(container, `
        <div id="noScorecardMessage" style="padding: 1.2937rem; text-align: center; color: #000000; font-size: 0.5659rem;">
          <p style="margin: 0 0 0.3234rem 0; font-weight: 500;">Select a scorecard first so we can load the criteria for this audit.</p>
          <p style="margin: 0; color: #6b7280; font-size: 0.4852rem;">💡 Tip: Select an employee first to filter scorecards by channel, or choose any scorecard from the list.</p>
        </div>
      `);
    }
  }

  /**
   * Hide no scorecard message
   */
  hideNoScorecardMessage(): void {
    const message = document.getElementById('noScorecardMessage');
    if (message) {
      message.style.display = 'none';
    }
  }

  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);
    
    const dateDay = date.getDay();
    const dateDaysToMonday = dateDay === 0 ? -6 : 1 - dateDay;
    const mondayOfDateWeek = new Date(date);
    mondayOfDateWeek.setDate(date.getDate() + dateDaysToMonday);
    mondayOfDateWeek.setHours(0, 0, 0, 0);
    
    const daysSinceWeek1 = Math.floor((mondayOfDateWeek.getTime() - mondayOfWeek1.getTime()) / (24 * 60 * 60 * 1000));
    return Math.floor(daysSinceWeek1 / 7) + 1;
  }

  /**
   * Get quarter for a date
   */
  private getQuarter(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    let dateToFormat = dateString;
    if (!dateToFormat) {
      dateToFormat = new Date().toISOString();
    }
    
    const date = new Date(dateToFormat);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  }
}

// Singleton instance
let headerMetadataManagerInstance: HeaderMetadataManager | null = null;

/**
 * Get header metadata manager instance
 */
export function getHeaderMetadataManager(): HeaderMetadataManager {
  if (!headerMetadataManagerInstance) {
    headerMetadataManagerInstance = new HeaderMetadataManager();
  }
  return headerMetadataManagerInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).updateHeaderMetadata = () => {
    getHeaderMetadataManager().updateHeaderMetadata();
  };
  
  (window as any).showNoScorecardMessage = () => {
    getHeaderMetadataManager().showNoScorecardMessage();
  };
  
  (window as any).hideNoScorecardMessage = () => {
    getHeaderMetadataManager().hideNoScorecardMessage();
  };
}

