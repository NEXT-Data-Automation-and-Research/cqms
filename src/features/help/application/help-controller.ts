/**
 * Help Controller
 * Simple controller for help page
 */

import { logInfo } from '../../../utils/logging-helper.js';

export class HelpController {
  /**
   * Initialize help page
   */
  async initialize(): Promise<void> {
    // Simple initialization
    logInfo('Help page initialized');
  }
}

