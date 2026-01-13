/**
 * Score Calculator
 * Calculates audit scores and updates UI badges
 * Migrated from audit-form.html calculateAverageScore()
 */

import { logInfo, logError } from '../../../../utils/logging-helper.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

interface ScorecardParameter {
  field_id: string;
  field_type: string;
  parameter_type?: string;
  penalty_points: number | string;
  error_category?: string;
  points_direction?: string;
  is_fail_all?: boolean;
}

interface Scorecard {
  scoring_type?: string;
  passing_threshold?: number | string;
  max_bonus_points?: number | string;
  allow_over_100?: boolean;
}

export class ScoreCalculator {
  /**
   * Calculate average score based on current parameters
   */
  calculateAverageScore(
    parameters: ScorecardParameter[],
    scorecard: Scorecard | null
  ): number {
    if (!parameters || parameters.length === 0 || !scorecard) {
      const averageScoreField = document.getElementById('averageScore') as HTMLInputElement;
      if (averageScoreField) {
        averageScoreField.value = '100';
      }
      return 100;
    }

    const scoringType = scorecard.scoring_type || 'deductive';
    let score = 0;

    switch(scoringType) {
      case 'deductive':
        score = this.calculateDeductiveScore(parameters, scorecard);
        break;
      case 'additive':
        score = this.calculateAdditiveScore(parameters, scorecard);
        break;
      case 'hybrid':
        score = this.calculateHybridScore(parameters, scorecard);
        break;
      default:
        score = this.calculateDeductiveScore(parameters, scorecard);
    }

    // Update average score field
    const averageScoreField = document.getElementById('averageScore') as HTMLInputElement;
    if (averageScoreField) {
      averageScoreField.value = score.toFixed(2);
    }

    // Calculate and update error counts
    const errorCounts = this.calculateErrorsByCategory(parameters);
    this.updateErrorCounts(errorCounts);

    // Update passing status
    this.updatePassingStatus(score, scorecard);

    return score;
  }

  /**
   * Calculate deductive score: Start at 100, subtract for errors
   */
  private calculateDeductiveScore(parameters: ScorecardParameter[], scorecard: Scorecard): number {
    let totalDeduction = 0;
    
    parameters.forEach(param => {
      const paramType = param.parameter_type || 'error';
      const pointsDirection = param.points_direction;
      
      // Skip achievement/bonus types that don't have subtract direction
      if ((paramType === 'achievement' || paramType === 'bonus') && pointsDirection !== 'subtract') {
        return;
      }
      
      const value = this.getParameterValue(param);
      const penalty = parseFloat(String(param.penalty_points)) || 0;
      totalDeduction += value * penalty;
    });
    
    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Calculate additive score: Start at 0, add for achievements
   */
  private calculateAdditiveScore(parameters: ScorecardParameter[], scorecard: Scorecard): number {
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    
    parameters.forEach(param => {
      if (param.parameter_type !== 'achievement' && param.points_direction !== 'add') return;
      
      const points = parseFloat(String(param.penalty_points)) || 0;
      maxPossiblePoints += points;
      
      const value = this.getParameterValue(param);
      totalPoints += value * points;
    });
    
    if (maxPossiblePoints === 0) return 0;
    return Math.min(100, (totalPoints / maxPossiblePoints) * 100);
  }

  /**
   * Calculate hybrid score: Deduct for errors, add for achievements
   */
  private calculateHybridScore(parameters: ScorecardParameter[], scorecard: Scorecard): number {
    let baseScore = 100;
    let bonusPoints = 0;
    
    parameters.forEach(param => {
      const value = this.getParameterValue(param);
      const points = parseFloat(String(param.penalty_points)) || 0;
      const paramType = param.parameter_type || 'error';
      const pointsDirection = param.points_direction;
      
      if (paramType === 'error' || pointsDirection === 'subtract') {
        baseScore -= value * points;
      } else if (paramType === 'achievement' || paramType === 'bonus' || pointsDirection === 'add') {
        bonusPoints += value * points;
      }
    });
    
    // Apply max bonus cap if set
    const maxBonus = parseFloat(String(scorecard.max_bonus_points)) || 0;
    if (maxBonus > 0) {
      bonusPoints = Math.min(bonusPoints, maxBonus);
    }
    
    let finalScore = baseScore + bonusPoints;
    
    // Apply over 100% cap if not allowed
    const allowOver100 = scorecard.allow_over_100 || false;
    if (!allowOver100) {
      finalScore = Math.min(100, finalScore);
    }
    
    return Math.max(0, finalScore);
  }

  /**
   * Get parameter value from form field
   */
  private getParameterValue(param: ScorecardParameter): number {
    if (param.field_type === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${param.field_id}"]:checked`) as HTMLInputElement;
      return selectedRadio ? (parseInt(selectedRadio.value) || 0) : 0;
    } else {
      const field = document.getElementById(param.field_id) as HTMLInputElement;
      return field ? (parseInt(field.value) || 0) : 0;
    }
  }

  /**
   * Calculate errors by category
   */
  calculateErrorsByCategory(parameters: ScorecardParameter[]): {
    criticalFail: number;
    critical: number;
    significant: number;
    major: number;
    minor: number;
    total: number;
  } {
    let criticalFailCount = 0;
    let criticalCount = 0;
    let significantCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let totalErrorsCount = 0;
    
    parameters.forEach(param => {
      const paramType = param.parameter_type || 'error';
      
      // Only count error parameters, not achievements/bonuses
      if (paramType === 'achievement' || paramType === 'bonus') {
        return;
      }
      
      const errorCount = this.getParameterErrorCount(param);
      
      if (errorCount > 0) {
        const category = param.error_category || '';
        let severity = 'Significant';
        
        if (category.includes('Fail')) {
          severity = 'Critical Fail';
        } else if (category.includes('Critical')) {
          severity = 'Critical';
        } else if (category.includes('Significant')) {
          severity = 'Significant';
        } else if (category.includes('Major')) {
          severity = 'Major';
        } else if (category.includes('Minor')) {
          severity = 'Minor';
        }
        
        if (severity === 'Critical Fail') {
          criticalFailCount += errorCount;
        } else if (severity === 'Critical') {
          criticalCount += errorCount;
        } else if (severity === 'Significant') {
          significantCount += errorCount;
        } else if (severity === 'Major') {
          majorCount += errorCount;
        } else if (severity === 'Minor') {
          minorCount += errorCount;
        }
        
        totalErrorsCount += errorCount;
      }
    });
    
    return {
      criticalFail: criticalFailCount,
      critical: criticalCount,
      significant: significantCount,
      major: majorCount,
      minor: minorCount,
      total: totalErrorsCount
    };
  }

  /**
   * Get parameter error count
   */
  private getParameterErrorCount(param: ScorecardParameter): number {
    if (param.field_type === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${param.field_id}"]:checked`) as HTMLInputElement;
      return selectedRadio ? (parseInt(selectedRadio.value) || 0) : 0;
    } else {
      const field = document.getElementById(param.field_id) as HTMLInputElement;
      return field ? (parseInt(field.value) || 0) : 0;
    }
  }

  /**
   * Update error counts in UI
   */
  private updateErrorCounts(counts: {
    criticalFail: number;
    critical: number;
    significant: number;
    major: number;
    minor: number;
    total: number;
  }): void {
    // Update hidden fields for form submission
    const criticalErrorsField = document.getElementById('criticalErrors') as HTMLInputElement;
    const criticalFailErrorField = document.getElementById('criticalFailError') as HTMLInputElement;
    const significantErrorField = document.getElementById('significantError') as HTMLInputElement;
    const totalErrorsField = document.getElementById('totalErrorsCount') as HTMLInputElement;
    
    if (criticalErrorsField) criticalErrorsField.value = counts.critical.toString();
    if (criticalFailErrorField) criticalFailErrorField.value = counts.criticalFail.toString();
    if (significantErrorField) significantErrorField.value = counts.significant.toString();
    if (totalErrorsField) totalErrorsField.value = counts.total.toString();
    
    // Update display divs
    const totalErrorsDisplay = document.getElementById('totalErrorsCountDisplay');
    const criticalFailErrorDisplay = document.getElementById('criticalFailErrorDisplay');
    const criticalErrorsDisplay = document.getElementById('criticalErrorsDisplay');
    const significantErrorDisplay = document.getElementById('significantErrorDisplay');
    const majorErrorDisplay = document.getElementById('majorErrorDisplay');
    const minorErrorDisplay = document.getElementById('minorErrorDisplay');
    
    if (totalErrorsDisplay) totalErrorsDisplay.textContent = counts.total.toString();
    if (criticalFailErrorDisplay) criticalFailErrorDisplay.textContent = counts.criticalFail.toString();
    if (criticalErrorsDisplay) criticalErrorsDisplay.textContent = counts.critical.toString();
    if (significantErrorDisplay) significantErrorDisplay.textContent = counts.significant.toString();
    if (majorErrorDisplay) majorErrorDisplay.textContent = counts.major.toString();
    if (minorErrorDisplay) minorErrorDisplay.textContent = counts.minor.toString();
    
    // Update Error Counts section background color
    const errorCountsSection = document.getElementById('errorCountsSection');
    if (errorCountsSection) {
      const hasErrors = counts.total > 0;
      const bgColor = hasErrors ? '#fee2e2' : '#d1fae5';
      const borderColor = hasErrors ? '#fecaca' : '#a7f3d0';
      const textColor = hasErrors ? '#991b1b' : '#065f46';
      
      errorCountsSection.style.background = bgColor;
      errorCountsSection.style.borderColor = borderColor;
      
      const labels = errorCountsSection.querySelectorAll('p');
      labels.forEach(label => {
        (label as HTMLElement).style.color = textColor;
      });
    }
  }

  /**
   * Update passing status based on score
   */
  private updatePassingStatus(score: number, scorecard: Scorecard): void {
    const passingStatusField = document.getElementById('passingStatus') as HTMLInputElement;
    const headerElement = document.getElementById('auditFormHeader');
    
    if (passingStatusField) {
      const threshold = scorecard ? parseFloat(String(scorecard.passing_threshold)) : 85;
      
      // Check if any "fail all" parameters have errors
      let failAllErrorCount = 0;
      const currentParameters = (window as any).currentParameters || [];
      
      currentParameters.forEach((param: ScorecardParameter) => {
        if (param.is_fail_all) {
          const paramType = param.parameter_type || 'error';
          let errorCount = 0;
          
          if (param.field_type === 'radio') {
            const selectedRadio = document.querySelector(`input[name="${param.field_id}"]:checked`) as HTMLInputElement;
            const value = selectedRadio ? parseInt(selectedRadio.value) : 0;
            
            if (paramType === 'achievement' || paramType === 'bonus') {
              errorCount = value === 0 ? 1 : 0;
            } else {
              errorCount = value;
            }
          } else {
            const field = document.getElementById(param.field_id) as HTMLInputElement;
            errorCount = field ? (parseInt(field.value) || 0) : 0;
          }
          
          failAllErrorCount += errorCount;
        }
      });
      
      let passingStatus = 'PASS';
      if (failAllErrorCount > 0 || score < threshold) {
        passingStatus = 'FAIL';
      }
      
      passingStatusField.value = passingStatus;
      
      // Update header background color
      if (headerElement) {
        if (passingStatus === 'PASS') {
          headerElement.style.background = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)';
        } else {
          headerElement.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
        }
      }
    }
  }

  /**
   * Set initial average score based on scoring type
   */
  setInitialAverageScore(scorecard: Scorecard | null): void {
    if (!scorecard) return;
    
    const averageScoreField = document.getElementById('averageScore') as HTMLInputElement;
    if (!averageScoreField) return;
    
    const scoringType = scorecard.scoring_type || 'deductive';
    let initialScore = 0;
    
    switch(scoringType) {
      case 'deductive':
        initialScore = 100;
        break;
      case 'additive':
        initialScore = 0;
        break;
      case 'hybrid':
        initialScore = 100;
        break;
      default:
        initialScore = 100;
    }
    
    averageScoreField.value = initialScore.toFixed(2);
    
    // Update passing status
    this.updatePassingStatus(initialScore, scorecard);
  }

  /**
   * Calculate total errors count (Dynamic)
   */
  calculateTotalErrorsCount(parameters: ScorecardParameter[]): number {
    let totalCount = 0;
    
    parameters.forEach(param => {
      const paramType = param.parameter_type || 'error';
      
      // Only count error parameters, not achievements/bonuses
      if (paramType === 'achievement' || paramType === 'bonus') {
        return;
      }
      
      let count = 0;
      
      if (param.field_type === 'radio') {
        const selectedRadio = document.querySelector(`input[name="${param.field_id}"]:checked`) as HTMLInputElement;
        if (selectedRadio) {
          const selectedValue = parseInt(selectedRadio.value);
          count = selectedValue;
        }
      } else {
        const field = document.getElementById(param.field_id) as HTMLInputElement;
        count = field ? (parseInt(field.value) || 0) : 0;
      }
      
      totalCount += count;
    });
    
    // Update total errors count field (hidden input for form submission)
    const totalErrorsField = document.getElementById('totalErrorsCount') as HTMLInputElement;
    if (totalErrorsField) {
      totalErrorsField.value = totalCount.toString();
    }
    
    // Update display div
    const totalErrorsDisplay = document.getElementById('totalErrorsCountDisplay');
    if (totalErrorsDisplay) {
      totalErrorsDisplay.textContent = totalCount.toString();
    }
    
    // Update Error Counts section background color dynamically
    const errorCountsSection = document.getElementById('errorCountsSection');
    if (errorCountsSection) {
      const hasErrors = totalCount > 0;
      const bgColor = hasErrors ? '#fee2e2' : '#d1fae5';
      const borderColor = hasErrors ? '#fecaca' : '#a7f3d0';
      const textColor = hasErrors ? '#991b1b' : '#065f46';
      
      errorCountsSection.style.background = bgColor;
      errorCountsSection.style.borderColor = borderColor;
      
      const labels = errorCountsSection.querySelectorAll('p');
      labels.forEach(label => {
        (label as HTMLElement).style.color = textColor;
      });
    }
    
    return totalCount;
  }
}

// Singleton instance
let scoreCalculatorInstance: ScoreCalculator | null = null;

/**
 * Get score calculator instance
 */
export function getScoreCalculator(): ScoreCalculator {
  if (!scoreCalculatorInstance) {
    scoreCalculatorInstance = new ScoreCalculator();
  }
  return scoreCalculatorInstance;
}

/**
 * Calculate average score (global function for backward compatibility)
 */
export function calculateAverageScore(): void {
  const calculator = getScoreCalculator();
  const currentScorecard = (window as any).currentScorecard;
  const currentParameters = (window as any).currentParameters || [];
  
  calculator.calculateAverageScore(currentParameters, currentScorecard);
}

/**
 * Calculate total errors count (global function for backward compatibility)
 */
export function calculateTotalErrorsCount(): void {
  const calculator = getScoreCalculator();
  const currentParameters = (window as any).currentParameters || [];
  calculator.calculateTotalErrorsCount(currentParameters);
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).calculateAverageScore = calculateAverageScore;
  
  (window as any).setInitialAverageScore = () => {
    const calculator = getScoreCalculator();
    const currentScorecard = (window as any).currentScorecard;
    calculator.setInitialAverageScore(currentScorecard);
  };
  
  (window as any).calculateTotalErrorsCount = calculateTotalErrorsCount;
}

