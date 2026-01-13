/**
 * Calibration Mode Utility
 * Handles calibration mode detection and state
 * Migrated from audit-form.html checkCalibrationMode()
 */

import { logInfo } from '../../../../utils/logging-helper.js';

interface CalibrationState {
  isCalibrationMode: boolean;
  sessionId: string | null;
  sampleAuditId: string | null;
  interactionId: string | null;
  scorecardId: string | null;
  tableName: string | null;
}

class CalibrationModeManager {
  private state: CalibrationState = {
    isCalibrationMode: false,
    sessionId: null,
    sampleAuditId: null,
    interactionId: null,
    scorecardId: null,
    tableName: null
  };

  /**
   * Check if calibration mode is enabled from URL parameters
   */
  checkCalibrationMode(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const calibration = urlParams.get('calibration');
    
    if (calibration === 'true') {
      this.state.isCalibrationMode = true;
      this.state.sessionId = urlParams.get('sessionId');
      this.state.sampleAuditId = urlParams.get('auditId');
      this.state.interactionId = urlParams.get('interactionId');
      this.state.scorecardId = urlParams.get('scorecardId');
      this.state.tableName = urlParams.get('tableName');
      
      logInfo('Calibration mode detected:', {
        sessionId: this.state.sessionId,
        auditId: this.state.sampleAuditId,
        interactionId: this.state.interactionId,
        scorecardId: this.state.scorecardId,
        tableName: this.state.tableName
      });
      
      // Store in window for backward compatibility
      (window as any).isCalibrationMode = true;
      (window as any).calibrationSessionId = this.state.sessionId;
      (window as any).calibrationSampleAuditId = this.state.sampleAuditId;
      (window as any).calibrationInteractionId = this.state.interactionId;
      (window as any).calibrationScorecardId = this.state.scorecardId;
      (window as any).calibrationTableName = this.state.tableName;
      
      return true;
    }
    
    this.state.isCalibrationMode = false;
    return false;
  }

  /**
   * Get calibration state
   */
  getState(): CalibrationState {
    return { ...this.state };
  }

  /**
   * Check if calibration mode is active
   */
  isActive(): boolean {
    return this.state.isCalibrationMode;
  }
}

// Singleton instance
let calibrationModeInstance: CalibrationModeManager | null = null;

/**
 * Get calibration mode manager instance
 */
export function getCalibrationModeManager(): CalibrationModeManager {
  if (!calibrationModeInstance) {
    calibrationModeInstance = new CalibrationModeManager();
  }
  return calibrationModeInstance;
}

/**
 * Check calibration mode (global function for backward compatibility)
 */
export function checkCalibrationMode(): boolean {
  return getCalibrationModeManager().checkCalibrationMode();
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).checkCalibrationMode = checkCalibrationMode;
}

