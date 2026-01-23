/**
 * Score Updater Utilities
 * Updates UI elements with calculated scores and error counts
 * Extracted from new-audit-form.html
 */

import type { Scorecard, ScorecardParameter } from '../../domain/entities.js';
import { calculateAverageScore, calculateErrorCounts, calculatePassingStatus, type ErrorCounts, type ParameterValue } from '../../application/audit-scoring-service.js';
import { collectParameterValues } from './form-data-collector.js';
import { logInfo } from '../../../../utils/logging-helper.js';

/**
 * Update all score-related UI elements
 */
export function updateScoreDisplay(
  scorecard: Scorecard,
  parameters: ScorecardParameter[]
): void {
  const parameterValues = collectParameterValues(parameters);
  const score = calculateAverageScore(scorecard, parameters, parameterValues);
  const errorCounts = calculateErrorCounts(parameters, parameterValues);
  const threshold = scorecard.passingThreshold || 85;
  const passingStatus = calculatePassingStatus(score, threshold, parameters, parameterValues);

  // Update average score field
  const averageScoreField = document.getElementById('averageScore') as HTMLInputElement;
  if (averageScoreField) {
    averageScoreField.value = score.toFixed(2);
  }

  // Update passing status field
  const passingStatusField = document.getElementById('passingStatus') as HTMLInputElement;
  if (passingStatusField) {
    passingStatusField.value = passingStatus;
  }

  // Update error count fields
  updateErrorCountsDisplay(errorCounts);

  // Update header metadata
  updateHeaderMetadata(score, passingStatus, errorCounts.total);

  // Update header background color based on passing status
  updateHeaderBackgroundColor(passingStatus);

  logInfo(`Score updated: ${score.toFixed(2)}%, Status: ${passingStatus}, Errors: ${errorCounts.total}`);
}

/**
 * Update error counts display
 */
function updateErrorCountsDisplay(errorCounts: ErrorCounts): void {
  // Update hidden fields for form submission
  const criticalErrorsField = document.getElementById('criticalErrors') as HTMLInputElement;
  const criticalFailErrorField = document.getElementById('criticalFailError') as HTMLInputElement;
  const significantErrorField = document.getElementById('significantError') as HTMLInputElement;
  const totalErrorsField = document.getElementById('totalErrorsCount') as HTMLInputElement;

  if (criticalErrorsField) criticalErrorsField.value = errorCounts.critical.toString();
  if (criticalFailErrorField) criticalFailErrorField.value = errorCounts.criticalFail.toString();
  if (significantErrorField) significantErrorField.value = errorCounts.significant.toString();
  if (totalErrorsField) totalErrorsField.value = errorCounts.total.toString();

  // Update display divs
  const totalErrorsDisplay = document.getElementById('totalErrorsCountDisplay');
  const criticalFailErrorDisplay = document.getElementById('criticalFailErrorDisplay');
  const criticalErrorsDisplay = document.getElementById('criticalErrorsDisplay');
  const significantErrorDisplay = document.getElementById('significantErrorDisplay');
  const majorErrorDisplay = document.getElementById('majorErrorDisplay');
  const minorErrorDisplay = document.getElementById('minorErrorDisplay');

  if (totalErrorsDisplay) totalErrorsDisplay.textContent = errorCounts.total.toString();
  if (criticalFailErrorDisplay) criticalFailErrorDisplay.textContent = errorCounts.criticalFail.toString();
  if (criticalErrorsDisplay) criticalErrorsDisplay.textContent = errorCounts.critical.toString();
  if (significantErrorDisplay) significantErrorDisplay.textContent = errorCounts.significant.toString();
  if (majorErrorDisplay) majorErrorDisplay.textContent = errorCounts.major.toString();
  if (minorErrorDisplay) minorErrorDisplay.textContent = errorCounts.minor.toString();

  // Update Error Counts section background color dynamically
  updateErrorCountsSectionColor(errorCounts.total > 0);
}

/**
 * Update error counts section color
 */
function updateErrorCountsSectionColor(hasErrors: boolean): void {
  const errorCountsSection = document.getElementById('errorCountsSection');
  if (!errorCountsSection) return;

  const bgColor = hasErrors ? '#fee2e2' : '#d1fae5';
  const borderColor = hasErrors ? '#fecaca' : '#a7f3d0';
  const textColor = hasErrors ? '#991b1b' : '#065f46';

  errorCountsSection.style.background = bgColor;
  errorCountsSection.style.borderColor = borderColor;

  // Update label colors
  const labels = errorCountsSection.querySelectorAll('p');
  labels.forEach(label => {
    (label as HTMLElement).style.color = textColor;
  });
}

/**
 * Update header metadata cards
 * Can be called with initial values (score: 0, passingStatus: '', totalErrors: 0) for initial display
 */
export function updateHeaderMetadata(score: number = 0, passingStatus: string = '', totalErrors: number = 0): void {
  const metadataContainer = document.getElementById('headerMetadataCards');
  const backgroundScoreContainer = document.getElementById('headerBackgroundScore');
  const headerScoreValue = document.getElementById('headerScoreValue');

  if (!metadataContainer) {
    logInfo('headerMetadataCards container not found');
    return;
  }

  // Get quarter and week
  const quarterField = document.getElementById('quarter') as HTMLInputElement;
  const weekField = document.getElementById('week') as HTMLInputElement;
  const interactionDateField = document.getElementById('interactionDate') as HTMLInputElement;

  // Get interaction date or use current date as fallback
  const interactionDate = interactionDateField?.value || '';
  let dateToUse: Date;
  
  if (interactionDate) {
    const parsedDate = new Date(interactionDate);
    dateToUse = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  } else {
    dateToUse = new Date();
  }

  // Calculate quarter and week from interaction date (or current date if not set)
  let quarter = quarterField?.value || '';
  let week = weekField?.value || '';

  // Calculate quarter from date
  if (!quarter) {
    const month = dateToUse.getMonth() + 1;
    if (month >= 1 && month <= 3) quarter = 'Q1';
    else if (month >= 4 && month <= 6) quarter = 'Q2';
    else if (month >= 7 && month <= 9) quarter = 'Q3';
    else if (month >= 10 && month <= 12) quarter = 'Q4';
    
    // Update hidden field if it exists
    if (quarterField) {
      quarterField.value = quarter;
    }
  }

  // Calculate week from date
  if (!week) {
    const startOfYear = new Date(dateToUse.getFullYear(), 0, 1);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);
    const dateDay = dateToUse.getDay();
    const dateDaysToMonday = dateDay === 0 ? -6 : 1 - dateDay;
    const mondayOfDateWeek = new Date(dateToUse);
    mondayOfDateWeek.setDate(dateToUse.getDate() + dateDaysToMonday);
    mondayOfDateWeek.setHours(0, 0, 0, 0);
    const daysSinceWeek1 = Math.floor((mondayOfDateWeek.getTime() - mondayOfWeek1.getTime()) / (24 * 60 * 60 * 1000));
    week = (Math.floor(daysSinceWeek1 / 7) + 1).toString();
    
    // Update hidden field if it exists
    if (weekField) {
      weekField.value = week;
    }
  }

  // Format date for display
  let formattedDate = 'N/A';
  if (interactionDate) {
    const date = new Date(interactionDate);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      // For date input fields, we only have date, not time, so use 00:00
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      formattedDate = `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    }
  } else {
    // If no interaction date, show current date
    const day = dateToUse.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[dateToUse.getMonth()];
    const year = dateToUse.getFullYear();
    let hours = dateToUse.getHours();
    const minutes = dateToUse.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    formattedDate = `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  }

  // Determine status icon (handle empty status)
  const passingStatusLower = (passingStatus || '').toLowerCase();
  const isPassing = passingStatusLower.includes('pass') && !passingStatusLower.includes('not');
  const statusIcon = passingStatusLower ? (isPassing ? '✓ ' : '✗ ') : '';
  const displayStatus = passingStatus || 'N/A';

  // Format quarter
  const formattedQuarter = quarter ? (quarter.toString().startsWith('Q') ? quarter : 'Q' + quarter) : 'N/A';

  // Build metadata cards HTML
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
      <p id="headerStatusDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${statusIcon}${escapeHtml(displayStatus)}</p>
    </div>
    <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
      <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Score</p>
      <p id="headerScoreDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(score.toFixed(0))}%</p>
    </div>
  `;

  metadataContainer.innerHTML = metadataCardsHtml;

  // Update background score
  if (backgroundScoreContainer && headerScoreValue) {
    const scoreTextColor = isPassing
      ? 'rgba(10, 50, 30, 0.4)' // Darker green for passing
      : 'rgba(100, 10, 10, 0.4)'; // Darker red for not passing

    headerScoreValue.textContent = score.toFixed(0);

    const scoreSpan = backgroundScoreContainer.querySelector('span');
    if (scoreSpan) {
      (scoreSpan as HTMLElement).style.color = scoreTextColor;
    }

    backgroundScoreContainer.style.display = 'flex';
  }
}

/**
 * Update header background color based on passing status
 */
function updateHeaderBackgroundColor(passingStatus: string): void {
  const headerElement = document.getElementById('auditFormHeader');
  if (!headerElement) return;

  const passingStatusLower = passingStatus.toLowerCase();
  const isPassing = passingStatusLower.includes('pass') && !passingStatusLower.includes('not');

  if (isPassing) {
    headerElement.style.background = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)';
  } else {
    headerElement.style.background = 'linear-gradient(135deg, #d41212 0%, #b91c1c 100%)';
  }
}

/**
 * Escape HTML helper
 */
function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
