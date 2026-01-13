/**
 * Dropdown Loader
 * Utilities for loading dropdown options (channels, employees)
 * Migrated from audit-form.html
 */

import { getSupabaseClient } from './supabase-client-helper.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { CHANNEL_MINIMAL_FIELDS, PEOPLE_MINIMAL_FIELDS } from '../../../../core/constants/field-whitelists.js';

export class DropdownLoader {
  /**
   * Load channels dropdown
   */
  async loadChannels(): Promise<void> {
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:16',message:'loadChannels start',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    try {
      const supabase = await getSupabaseClient();
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;
      
      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:20',message:'DOM element check',data:{hasElement:!!channelSelect,elementId:'channel'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      
      if (!channelSelect) {
        logError('Channel select element not found');
        return;
      }

      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:26',message:'Querying channels',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      const { data: channels, error } = await supabase
        .from('channels')
        .select(CHANNEL_MINIMAL_FIELDS)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute();

      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:32',message:'Channels query result',data:{hasError:!!error,errorMessage:error?.message,channelsCount:channels?.length||0,hasChannels:!!channels},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      if (error) {
        logError('Error loading channels:', error);
        safeSetHTML(channelSelect, '<option value="">Error loading channels</option>');
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
        
        // #region agent log
        if (typeof window !== 'undefined' && (window as any).fetch) {
          (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:52',message:'Channel options added',data:{optionsCount:channelSelect.options.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        }
        // #endregion

        // Attach change listener if not already attached
        if (!channelSelect.hasAttribute('data-listener-attached')) {
          channelSelect.setAttribute('data-listener-attached', 'true');
          channelSelect.addEventListener('change', async () => {
            const selectedChannel = channelSelect.value;
            // Trigger scorecard reload with channel filter
            if (typeof (window as any).reloadScorecards === 'function') {
              await (window as any).reloadScorecards(selectedChannel || null);
            }
          });
        }

        logInfo(`Channels loaded: ${channels.length}`);
      } else {
        safeSetHTML(channelSelect, '<option value="">No channels available</option>');
      }
    } catch (error) {
      logError('Error loading channels:', error);
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;
      if (channelSelect) {
        safeSetHTML(channelSelect, '<option value="">Error loading channels</option>');
      }
    }
  }

  /**
   * Load employees dropdown
   */
  async loadEmployees(): Promise<void> {
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:81',message:'loadEmployees start',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    try {
      const supabase = await getSupabaseClient();
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
      
      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:85',message:'DOM element check',data:{hasElement:!!employeeSelect,elementId:'employeeName'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      
      if (!employeeSelect) {
        logError('Employee select element not found');
        return;
      }

      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:91',message:'Querying employees',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      const { data: employees, error } = await supabase
        .from('people')
        .select(PEOPLE_MINIMAL_FIELDS)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute();

      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:139',message:'Employees query result',data:{hasError:!!error,errorMessage:error?.message,employeesCount:employees?.length||0,hasEmployees:!!employees},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      if (error) {
        logError('Error loading employees:', error);
        safeSetHTML(employeeSelect, '<option value="">Error loading employees</option>');
        return;
      }

      // Clear existing options (except first)
      while (employeeSelect.options.length > 1) {
        employeeSelect.remove(1);
      }

      // Store all employees globally for filtering
      (window as any).allEmployees = employees || [];
      
      // Add employee options with data attributes
      if (employees && employees.length > 0) {
        employees.forEach((employee: any) => {
          if (!employee || !employee.email) {
            logWarn('Skipping invalid employee:', employee);
            return;
          }
          const option = document.createElement('option');
          option.value = employee.email;
          option.textContent = employee.name || employee.email;
          option.dataset.email = employee.email;
          option.dataset.role = employee.role || '';
          option.dataset.department = employee.department || '';
          option.dataset.designation = employee.designation || '';
          option.dataset.employeeId = employee.employee_id || '';
          option.dataset.country = employee.country || '';
          option.dataset.channel = employee.channel || '';
          employeeSelect.appendChild(option);
        });
        
        // #region agent log
        if (typeof window !== 'undefined' && (window as any).fetch) {
          (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:178',message:'Employee options added',data:{optionsCount:employeeSelect.options.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        }
        // #endregion

        // Attach change listener if not already attached
        if (!employeeSelect.hasAttribute('data-listener-attached')) {
          employeeSelect.setAttribute('data-listener-attached', 'true');
          employeeSelect.addEventListener('change', async () => {
            await this.handleEmployeeChange(employeeSelect.value);
          });
        }

        logInfo(`Employees loaded: ${employees.length}`);
      } else {
        safeSetHTML(employeeSelect, '<option value="">No employees available</option>');
      }
    } catch (error) {
      logError('Error loading employees:', error);
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
      if (employeeSelect) {
        safeSetHTML(employeeSelect, '<option value="">Error loading employees</option>');
      }
    }
  }

  /**
   * Handle employee selection change
   */
  private async handleEmployeeChange(employeeEmail: string): Promise<void> {
    if (!employeeEmail) return;

    try {
      const supabase = await getSupabaseClient();
      
      // Load employee details
      const { data: employee, error } = await supabase
        .from('people')
        .select('email, name, role, department, country, employee_type')
        .eq('email', employeeEmail)
        .eq('is_active', true)
        .single()
        .execute();

      if (error || !employee) {
        logWarn('Employee not found:', employeeEmail);
        return;
      }

      // Update form fields
      const employeeEmailField = document.getElementById('employeeEmail') as HTMLInputElement;
      const employeeTypeField = document.getElementById('employeeType') as HTMLInputElement;
      const countryField = document.getElementById('countryOfEmployee') as HTMLInputElement;

      if (employeeEmailField) {
        employeeEmailField.value = employee.email || '';
      }
      if (employeeTypeField && employee.employee_type) {
        employeeTypeField.value = employee.employee_type;
      }
      if (countryField && employee.country) {
        countryField.value = employee.country;
      }

      // Update header metadata if function exists
      if (typeof (window as any).updateHeaderMetadata === 'function') {
        (window as any).updateHeaderMetadata();
      }

      logInfo('Employee details loaded:', employeeEmail);
    } catch (error) {
      logError('Error loading employee details:', error);
    }
  }

  /**
   * Load all dropdowns with retry logic
   */
  async loadAllDropdowns(maxAttempts = 5): Promise<void> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        await Promise.all([
          this.loadChannels(),
          this.loadEmployees()
        ]);
        
        // Verify all dropdowns loaded
        const channelSelect = document.getElementById('channel') as HTMLSelectElement;
        const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
        
        const channelsLoaded = channelSelect && channelSelect.options.length > 1;
        const employeesLoaded = employeeSelect && employeeSelect.options.length > 1;
        
        if (channelsLoaded && employeesLoaded) {
          logInfo('All dropdowns loaded successfully');
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logError(`Error loading dropdowns (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    logWarn('Failed to load all dropdowns after retries');
  }
}

// Singleton instance
let dropdownLoaderInstance: DropdownLoader | null = null;

/**
 * Get dropdown loader instance
 */
export function getDropdownLoader(): DropdownLoader {
  if (!dropdownLoaderInstance) {
    dropdownLoaderInstance = new DropdownLoader();
  }
  return dropdownLoaderInstance;
}

/**
 * Load channels (global function for backward compatibility)
 */
export async function loadChannels(): Promise<void> {
  // #region agent log
  if (typeof window !== 'undefined' && (window as any).fetch) {
    (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:260',message:'loadChannels called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  await getDropdownLoader().loadChannels();
}

/**
 * Load employees (global function for backward compatibility)
 */
export async function loadEmployees(): Promise<void> {
  // #region agent log
  if (typeof window !== 'undefined' && (window as any).fetch) {
    (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropdown-loader.ts:267',message:'loadEmployees called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  await getDropdownLoader().loadEmployees();
}

/**
 * Load all dropdowns (global function for backward compatibility)
 */
export async function loadAllDropdowns(): Promise<void> {
  await getDropdownLoader().loadAllDropdowns();
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadChannels = loadChannels;
  (window as any).loadEmployees = loadEmployees;
  (window as any).loadAllDropdowns = loadAllDropdowns;
}

