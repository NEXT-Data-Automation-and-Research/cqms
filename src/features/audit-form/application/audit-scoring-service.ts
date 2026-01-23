/**
 * Audit Scoring Service
 * Business logic for calculating audit scores and error counts
 * Extracted from new-audit-form.html
 */

import type { Scorecard, ScorecardParameter } from '../domain/entities.js';

export interface ErrorCounts {
  criticalFail: number;
  critical: number;
  significant: number;
  major: number;
  minor: number;
  total: number;
}

export interface ParameterValue {
  parameterId: string;
  fieldId: string;
  value: number;
}

/**
 * Calculate average score based on scorecard type and parameter values
 */
export function calculateAverageScore(
  scorecard: Scorecard,
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): number {
  if (!parameters || parameters.length === 0 || !scorecard) {
    return 100; // Default if no parameters loaded
  }

  const scoringType = scorecard.scoringType || 'deductive';

  switch (scoringType) {
    case 'deductive':
      return calculateDeductiveScore(parameters, parameterValues);
    case 'additive':
      return calculateAdditiveScore(parameters, parameterValues);
    case 'hybrid':
      return calculateHybridScore(scorecard, parameters, parameterValues);
    default:
      return calculateDeductiveScore(parameters, parameterValues);
  }
}

/**
 * Deductive scoring: Start at 100, subtract for errors
 */
function calculateDeductiveScore(
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): number {
  let totalDeduction = 0;

  parameters.forEach(param => {
    // Skip only if it's explicitly an achievement or bonus type (not an error type)
    const paramType = param.parameterType || 'error';
    const pointsDirection = param.pointsDirection;

    // Skip achievement/bonus types that don't have subtract direction
    if ((paramType === 'achievement' || paramType === 'bonus') && pointsDirection !== 'subtract') {
      return;
    }

    const value = getParameterValue(param.fieldId, parameterValues);
    const penalty = parseFloat(String(param.penaltyPoints)) || 0;
    totalDeduction += value * penalty;
  });

  return Math.max(0, 100 - totalDeduction);
}

/**
 * Additive scoring: Start at 0, add for achievements
 */
function calculateAdditiveScore(
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): number {
  let totalPoints = 0;
  let maxPossiblePoints = 0;

  parameters.forEach(param => {
    if (param.parameterType !== 'achievement' && param.pointsDirection !== 'add') {
      return;
    }

    const points = parseFloat(String(param.penaltyPoints)) || 0;

    // Max possible is if all achievements were completed
    if (param.fieldType === 'radio') {
      maxPossiblePoints += points;
    } else {
      // For counters in additive, we assume max count of 1 unless specified
      maxPossiblePoints += points;
    }

    const value = getParameterValue(param.fieldId, parameterValues);
    totalPoints += value * points;
  });

  // Convert to percentage
  if (maxPossiblePoints === 0) return 0;
  return Math.min(100, (totalPoints / maxPossiblePoints) * 100);
}

/**
 * Hybrid scoring: Deduct for errors, add for achievements
 */
function calculateHybridScore(
  scorecard: Scorecard,
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): number {
  let baseScore = 100;
  let bonusPoints = 0;

  parameters.forEach(param => {
    const value = getParameterValue(param.fieldId, parameterValues);
    const points = parseFloat(String(param.penaltyPoints)) || 0;

    // Default to 'error' if parameterType is null/undefined/empty
    const paramType = param.parameterType || 'error';
    const pointsDirection = param.pointsDirection;

    if (paramType === 'error' || pointsDirection === 'subtract') {
      // Subtract from base score
      baseScore -= value * points;
    } else if (paramType === 'achievement' || paramType === 'bonus' || pointsDirection === 'add') {
      // Add to bonus
      bonusPoints += value * points;
    }
  });

  // Apply max bonus cap if set
  const maxBonus = parseFloat(String(scorecard.maxBonusPoints)) || 0;
  if (maxBonus > 0) {
    bonusPoints = Math.min(bonusPoints, maxBonus);
  }

  // Calculate final score
  let finalScore = baseScore + bonusPoints;

  // Apply over 100% cap if not allowed
  const allowOver100 = scorecard.allowOver100 || false;
  if (!allowOver100) {
    finalScore = Math.min(100, finalScore);
  }

  // Ensure minimum of 0
  finalScore = Math.max(0, finalScore);

  return finalScore;
}

/**
 * Calculate error counts by category
 */
export function calculateErrorCounts(
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): ErrorCounts {
  const counts: ErrorCounts = {
    criticalFail: 0,
    critical: 0,
    significant: 0,
    major: 0,
    minor: 0,
    total: 0,
  };

  parameters.forEach(param => {
    // Default to 'error' if parameterType is null/undefined/empty
    const paramType = param.parameterType || 'error';

    // Only count error parameters, not achievements/bonuses
    if (paramType === 'achievement' || paramType === 'bonus') {
      return; // Skip achievements/bonuses for error counting
    }

    const value = getParameterValue(param.fieldId, parameterValues);
    const errorCount = value;

    if (errorCount > 0) {
      // Determine severity - properly map all error categories
      const category = param.errorCategory || '';
      let severity = 'Significant'; // default

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
        counts.criticalFail += errorCount;
      } else if (severity === 'Critical') {
        counts.critical += errorCount;
      } else if (severity === 'Significant') {
        counts.significant += errorCount;
      } else if (severity === 'Major') {
        counts.major += errorCount;
      } else if (severity === 'Minor') {
        counts.minor += errorCount;
      }

      counts.total += errorCount;
    }
  });

  return counts;
}

/**
 * Determine passing status based on score, threshold, and fail-all parameters
 */
export function calculatePassingStatus(
  score: number,
  threshold: number,
  parameters: ScorecardParameter[],
  parameterValues: ParameterValue[]
): 'Passing' | 'Not Passing' {
  // Check if any "fail all" parameters have errors
  let failAllErrorCount = 0;

  parameters.forEach(param => {
    // Check if this parameter causes automatic fail
    if (param.isFailAll) {
      const paramType = param.parameterType || 'error';
      const value = getParameterValue(param.fieldId, parameterValues);
      let errorCount = 0;

      // For additive/achievement: NO (0) = error
      // For error parameters: YES (1) = error
      if (paramType === 'achievement' || paramType === 'bonus') {
        errorCount = value === 0 ? 1 : 0;
      } else {
        errorCount = value;
      }

      failAllErrorCount += errorCount;
    }
  });

  // Check for "fail all" conditions first
  if (failAllErrorCount > 0) {
    // Any fail-all parameter has errors = automatic fail
    return 'Not Passing';
  } else if (score >= threshold) {
    // No fail-all errors and score meets threshold = pass
    return 'Passing';
  } else {
    // No fail-all errors but score below threshold = fail
    return 'Not Passing';
  }
}

/**
 * Get parameter value from parameterValues array
 */
function getParameterValue(fieldId: string, parameterValues: ParameterValue[]): number {
  const param = parameterValues.find(p => p.fieldId === fieldId);
  return param ? param.value : 0;
}

/**
 * Calculate quarter from date
 */
export function calculateQuarter(date: Date): string {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  if (month >= 10 && month <= 12) return 'Q4';
  return 'Q1';
}

/**
 * Calculate week number from date
 */
export function calculateWeek(date: Date): number {
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
