/**
 * Change Detection Utilities
 * Detects changes between old and new scorecard data
 */

import type { Scorecard, ScorecardParameter } from '../../../domain/entities.js';

/**
 * Normalize parameter for comparison
 */
function normalizeParameter(param: ScorecardParameter): Partial<ScorecardParameter> {
  // Type-safe conversion for parameter_type
  const parameterType = param.parameter_type?.toLowerCase();
  const normalizedParameterType: 'error' | 'achievement' | 'bonus' | undefined = 
    parameterType === 'error' || parameterType === 'achievement' || parameterType === 'bonus'
      ? parameterType
      : undefined;
  
  // Type-safe conversion for field_type
  const fieldType = param.field_type?.toLowerCase();
  const normalizedFieldType: 'counter' | 'radio' | undefined =
    fieldType === 'counter' || fieldType === 'radio'
      ? fieldType
      : undefined;
  
  return {
    error_name: param.error_name?.trim(),
    penalty_points: parseFloat(String(param.penalty_points || 0)),
    parameter_type: normalizedParameterType,
    error_category: param.error_category?.trim(),
    field_type: normalizedFieldType,
    field_id: param.field_id?.toLowerCase(),
    description: param.description?.trim() || null,
    enable_ai_audit: !!param.enable_ai_audit,
    is_fail_all: !!param.is_fail_all
  };
}

/**
 * Check if parameters have changed (excluding descriptions - those don't require new version)
 */
function parametersHaveChanged(
  originalParams: ScorecardParameter[],
  newParams: ScorecardParameter[]
): boolean {
  if (originalParams.length !== newParams.length) return true;
  
  for (let i = 0; i < originalParams.length; i++) {
    const oldParam = normalizeParameter(originalParams[i]);
    const newParam = normalizeParameter(newParams[i]);
    
    // Exclude description from comparison - description changes don't require new version
    if (oldParam.error_name !== newParam.error_name ||
        oldParam.penalty_points !== newParam.penalty_points ||
        oldParam.parameter_type !== newParam.parameter_type ||
        oldParam.error_category !== newParam.error_category ||
        oldParam.field_type !== newParam.field_type ||
        oldParam.field_id !== newParam.field_id ||
        oldParam.is_fail_all !== newParam.is_fail_all) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect what changed between old and new scorecard
 */
export interface ScorecardChanges {
  // Metadata changes (safe to update)
  nameChanged: boolean;
  descriptionChanged: boolean;
  thresholdChanged: boolean;
  
  // Channel changes
  channelsAdded: string[];
  channelsRemoved: string[];
  channelsChanged: boolean;
  
  // Breaking changes (need new version)
  scoringTypeChanged: boolean;
  parametersChanged: boolean;
  
  // Hybrid-specific changes
  maxBonusChanged: boolean;
  allowOver100Changed: boolean;
}

export function detectChanges(
  oldScorecard: Scorecard,
  newData: Partial<Scorecard>,
  newParameters: ScorecardParameter[]
): ScorecardChanges {
  const oldChannels = (oldScorecard.channels || '').split(',').map(c => c.trim()).filter(Boolean);
  const newChannels = (newData.channels || '').split(',').map(c => c.trim()).filter(Boolean);
  
  return {
    // Metadata changes (safe to update)
    nameChanged: oldScorecard.name !== newData.name,
    descriptionChanged: (oldScorecard.description || '') !== (newData.description || ''),
    thresholdChanged: parseFloat(String(oldScorecard.passing_threshold || 0)) !== parseFloat(String(newData.passing_threshold || 0)),
    
    // Channel changes
    channelsAdded: newChannels.filter(c => !oldChannels.includes(c)),
    channelsRemoved: oldChannels.filter(c => !newChannels.includes(c)),
    channelsChanged: oldChannels.sort().join(',') !== newChannels.sort().join(','),
    
    // Breaking changes (need new version)
    scoringTypeChanged: oldScorecard.scoring_type !== newData.scoring_type,
    parametersChanged: false, // Will be set by caller with original parameters
    
    // Hybrid-specific changes
    maxBonusChanged: (oldScorecard.max_bonus_points || 0) !== (newData.max_bonus_points || 0),
    allowOver100Changed: !!oldScorecard.allow_over_100 !== !!newData.allow_over_100
  };
}

/**
 * Check if parameters changed (used with original parameters)
 */
export function checkParametersChanged(
  originalParams: ScorecardParameter[],
  newParams: ScorecardParameter[]
): boolean {
  return parametersHaveChanged(originalParams, newParams);
}

