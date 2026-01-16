/**
 * Audit Form Loader
 * Initializes all controllers and sets up the audit form
 * Migrated from audit-form.html inline script
 */

import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { AuditFormRepository } from '../infrastructure/audit-form-repository.js';
import { AuditFormService } from '../application/audit-form-service.js';
import { ScorecardController, setGlobalScorecardController } from './controllers/scorecard-controller.js';
import { AssignmentController } from './controllers/assignment-controller.js';
import { AuditFormController } from './controllers/audit-form-controller.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import { getSupabaseClient, waitForSupabaseReady } from './utils/supabase-client-helper.js';
import { loadChannels, loadEmployees, loadAllDropdowns } from './utils/dropdown-loader.js';
import { loadScorecards } from './controllers/scorecard-controller.js';

export class AuditFormLoader {
  private scorecardController: ScorecardController | null = null;
  private assignmentController: AssignmentController | null = null;
  private formController: AuditFormController | null = null;
  private service: AuditFormService | null = null;

  /**
   * Initialize the audit form
   */
  async initialize(): Promise<void> {
    try {
      logInfo('Initializing audit form...');

      // Check page access
      if (!this.checkPageAccess()) {
        return;
      }

      // Wait for Supabase to be ready
      const ready = await waitForSupabaseReady(10000);
      if (!ready) {
        logError('Supabase client not ready after timeout');
        return;
      }

      // Initialize services
      await this.initializeServices();

      // Initialize controllers
      this.initializeControllers();

      // Load initial data
      await this.loadInitialData();

      // Attach event listeners
      this.attachEventListeners();

      logInfo('Audit form initialized successfully');
    } catch (error) {
      logError('Error initializing audit form:', error);
    }
  }

  /**
   * Check page access using centralized access control
   */
  private checkPageAccess(): boolean {
    if (typeof window !== 'undefined' && 
        (window as any).accessControl && 
        typeof (window as any).accessControl.enforcePageAccess === 'function') {
      return (window as any).accessControl.enforcePageAccess('audit-form.html');
    }
    return true; // Allow if access control not available
  }

  /**
   * Initialize services
   */
  private async initializeServices(): Promise<void> {
    const db = DatabaseFactory.createClient();
    const repository = new AuditFormRepository(db);
    this.service = new AuditFormService(repository);
  }

  /**
   * Initialize controllers
   */
  private initializeControllers(): void {
    if (!this.service) {
      throw new Error('Service not initialized');
    }

    // Initialize scorecard controller
    this.scorecardController = new ScorecardController(this.service);
    
    // Set global instance for window exposure
    setGlobalScorecardController(this.scorecardController);
    
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audit-form-loader.ts:94',message:'Before exposing functions',data:{hasScorecardController:!!this.scorecardController},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion
    
    // Expose functions to window for backward compatibility
    if (typeof window !== 'undefined') {
      (window as any).loadScorecards = loadScorecards;
      (window as any).loadChannels = loadChannels;
      (window as any).loadEmployees = loadEmployees;
      (window as any).loadAllDropdowns = loadAllDropdowns;
      
      // Store loader instance for access
      (window as any).auditFormLoader = this;
      
      // #region agent log
      if ((window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audit-form-loader.ts:105',message:'Functions exposed to window',data:{loadScorecards:typeof loadScorecards,loadChannels:typeof loadChannels,loadEmployees:typeof loadEmployees},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
    }

    // Initialize assignment controller
    this.assignmentController = new AssignmentController(this.service);

    // Initialize form controller
    const form = document.getElementById('auditForm') as HTMLFormElement;
    if (!form) {
      throw new Error('Audit form element not found');
    }
    this.formController = new AuditFormController(this.service, form);
    this.formController.initialize();
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    if (!this.scorecardController || !this.assignmentController) {
      return;
    }

    try {
      // Load scorecards
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;
      const channelFilter = channelSelect?.value || null;
      await this.scorecardController.loadScorecards(channelFilter, null, true);

      // Load assignment stats
      await this.assignmentController.updateYourStats();

      // Load other dropdowns (channels, employees)
      await this.loadDropdowns();
    } catch (error) {
      logError('Error loading initial data:', error);
    }
  }

  /**
   * Load dropdowns (channels, employees)
   */
  private async loadDropdowns(): Promise<void> {
    try {
      await this.loadChannels();
      await this.loadEmployees();
    } catch (error) {
      logError('Error loading dropdowns:', error);
    }
  }

  /**
   * Load channels dropdown
   */
  private async loadChannels(): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;
      
      if (!channelSelect) {
        logError('Channel select element not found');
        return;
      }

      const { data: channels, error } = await supabase
        .from('channels')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute();

      if (error) {
        logError('Error loading channels:', error);
        return;
      }

      // Clear existing options (except first)
      while (channelSelect.options.length > 1) {
        channelSelect.remove(1);
      }

      // Add channel options
      if (channels && channels.length > 0) {
        channels.forEach((channel: any) => {
          const option = document.createElement('option');
          option.value = channel.id;
          option.textContent = channel.name;
          channelSelect.appendChild(option);
        });

        // Attach change listener
        if (!channelSelect.hasAttribute('data-listener-attached')) {
          channelSelect.setAttribute('data-listener-attached', 'true');
          channelSelect.addEventListener('change', async () => {
            const selectedChannel = channelSelect.value;
            if (this.scorecardController) {
              await this.scorecardController.loadScorecards(selectedChannel || null, null, true);
            }
          });
        }
      }
    } catch (error) {
      logError('Error loading channels:', error);
    }
  }

  /**
   * Load employees dropdown
   */
  private async loadEmployees(): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
      
      if (!employeeSelect) {
        logError('Employee select element not found');
        return;
      }

      const { data: employees, error } = await supabase
        .from('people')
        .select('email, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute();

      if (error) {
        logError('Error loading employees:', error);
        return;
      }

      // Clear existing options (except first)
      while (employeeSelect.options.length > 1) {
        employeeSelect.remove(1);
      }

      // Add employee options
      if (employees && employees.length > 0) {
        employees.forEach((employee: any) => {
          const option = document.createElement('option');
          option.value = employee.email;
          option.textContent = employee.name || employee.email;
          employeeSelect.appendChild(option);
        });
      }
    } catch (error) {
      logError('Error loading employees:', error);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Scorecard selection change
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
    if (scorecardSelect && !scorecardSelect.hasAttribute('data-listener-attached')) {
      scorecardSelect.setAttribute('data-listener-attached', 'true');
      scorecardSelect.addEventListener('change', async () => {
        const selectedValue = scorecardSelect.value;
        if (selectedValue && this.scorecardController) {
          const { scorecard, parameters } = await this.service!.loadScorecardWithParameters(selectedValue);
          if (this.formController) {
            this.formController.setScorecardData(scorecard, parameters);
            // Validation will be set up automatically in setScorecardData
          }
          await this.scorecardController.loadScorecardParameters(selectedValue);
        }
      });
    }

    // Channel selection change
    const channelSelect = document.getElementById('channel') as HTMLSelectElement;
    if (channelSelect && !channelSelect.hasAttribute('data-listener-attached')) {
      channelSelect.setAttribute('data-listener-attached', 'true');
      channelSelect.addEventListener('change', async () => {
        const selectedChannel = channelSelect.value;
        if (this.scorecardController) {
          await this.scorecardController.loadScorecards(selectedChannel || null, null, true);
        }
      });
    }
  }

  /**
   * Get scorecard controller
   */
  getScorecardController(): ScorecardController | null {
    return this.scorecardController;
  }

  /**
   * Get assignment controller
   */
  getAssignmentController(): AssignmentController | null {
    return this.assignmentController;
  }

  /**
   * Get form controller
   */
  getFormController(): AuditFormController | null {
    return this.formController;
  }
}

/**
 * Initialize audit form when DOM is ready
 */
export async function initializeAuditForm(): Promise<void> {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      const loader = new AuditFormLoader();
      await loader.initialize();
      // Store loader globally for access
      (window as any).auditFormLoader = loader;
    });
  } else {
    const loader = new AuditFormLoader();
    await loader.initialize();
    (window as any).auditFormLoader = loader;
  }
}

