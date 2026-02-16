/**
 * Dropdown Loader
 * Utilities for loading dropdown options (channels, employees)
 * Migrated from audit-form.html
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';

/**
 * Get Supabase client with session verification
 * Waits for client to be ready and verifies session exists
 */
async function getReadySupabaseClient(): Promise<any> {
  // Wait for window.supabaseClient to be available
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max

  while (attempts < maxAttempts) {
    const client = (window as any).supabaseClient;
    if (client) {
      // Verify we have a session
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (session) {
          console.log('[DropdownLoader] Got authenticated client with session');
          return client;
        } else if (error) {
          console.warn('[DropdownLoader] Session error:', error.message);
        } else {
          console.warn('[DropdownLoader] No session found, waiting...');
        }
      } catch (e) {
        console.warn('[DropdownLoader] Error checking session:', e);
      }
    }
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Fallback to raw client even without session (for debugging)
  const fallbackClient = (window as any).supabaseClient;
  if (fallbackClient) {
    console.warn('[DropdownLoader] Using client without verified session');
    return fallbackClient;
  }

  throw new Error('Supabase client not available');
}

export class DropdownLoader {
  /**
   * Load channels dropdown
   */
  async loadChannels(): Promise<void> {
    try {
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;

      if (!channelSelect) {
        console.warn('[DropdownLoader] Channel select element not found');
        return;
      }

      console.log('[DropdownLoader] Loading channels...');

      // Get authenticated client with session
      const supabase = await getReadySupabaseClient();

      console.log('[DropdownLoader] Executing channels query...');
      const result = await supabase
        .from('channels')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // Debug: Log the raw result
      console.log('[DropdownLoader] Channels result:', result);

      // Extract data and error
      const data = result?.data;
      const error = result?.error;

      if (error) {
        console.error('[DropdownLoader] Channels query error:', error);
        return;
      }

      console.log('[DropdownLoader] Channels data received:', data?.length, 'items');

      // Clear existing options (except first)
      while (channelSelect.options.length > 1) {
        channelSelect.remove(1);
      }

      // Add channel options
      const channels = data || [];
      if (channels.length > 0) {
        channels.forEach((channel: any) => {
          const option = document.createElement('option');
          option.value = channel.id;
          option.textContent = channel.name;
          channelSelect.appendChild(option);
        });

        // Attach change listener if not already attached
        if (!channelSelect.hasAttribute('data-listener-attached')) {
          channelSelect.setAttribute('data-listener-attached', 'true');
          channelSelect.addEventListener('change', async () => {
            const selectedChannel = channelSelect.value;
            if (!selectedChannel) {
              if (typeof (window as any).loadScorecards === 'function') {
                await (window as any).loadScorecards(null, null, true);
              }
              return;
            }
            
            // Resolve channel ID to name from selected option text
            const selectedOption = channelSelect.options[channelSelect.selectedIndex];
            const channelName = selectedOption?.textContent?.trim() || selectedChannel;
            
            // Auto-select default scorecard for this channel
            if (typeof (window as any).autoSelectScorecardByChannel === 'function') {
              await (window as any).autoSelectScorecardByChannel(selectedChannel);
            } else if (typeof (window as any).loadScorecards === 'function') {
              await (window as any).loadScorecards(channelName, null, false);
            }
          });
        }

        console.log(`[DropdownLoader] Channels loaded successfully: ${channels.length}`);
        logInfo(`Channels loaded: ${channels.length}`);
      } else {
        console.log('[DropdownLoader] No channels found in data');
      }
    } catch (error: any) {
      console.error('[DropdownLoader] Exception loading channels:', error);
      console.error('[DropdownLoader] Exception message:', error?.message);
      console.error('[DropdownLoader] Exception stack:', error?.stack);
    }
  }

  /**
   * Load employees dropdown
   */
  async loadEmployees(): Promise<void> {
    try {
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;

      if (!employeeSelect) {
        console.warn('[DropdownLoader] Employee select element not found');
        return;
      }

      console.log('[DropdownLoader] Loading employees...');

      // Get authenticated client with session
      const supabase = await getReadySupabaseClient();

      console.log('[DropdownLoader] Executing employees query...');
      const result = await supabase
        .from('people')
        .select('email, name, role, department, designation, employee_id, country, channel')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // Debug: Log the raw result
      console.log('[DropdownLoader] Employees result:', result);

      // Extract data and error
      const data = result?.data;
      const error = result?.error;

      if (error) {
        console.error('[DropdownLoader] Employees query error:', error);
        return;
      }

      console.log('[DropdownLoader] Employees data received:', data?.length, 'items');

      // Clear existing options (except first)
      while (employeeSelect.options.length > 1) {
        employeeSelect.remove(1);
      }

      // Store all employees globally for filtering
      const employees = data || [];
      (window as any).allEmployees = employees;

      // Add employee options with data attributes
      if (employees.length > 0) {
        employees.forEach((employee: any) => {
          if (!employee || !employee.email) {
            console.warn('[DropdownLoader] Skipping invalid employee:', employee);
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

        // Attach change listener if not already attached
        if (!employeeSelect.hasAttribute('data-listener-attached')) {
          employeeSelect.setAttribute('data-listener-attached', 'true');
          employeeSelect.addEventListener('change', async () => {
            await this.handleEmployeeChange(employeeSelect.value);
          });
        }

        console.log(`[DropdownLoader] Employees loaded successfully: ${employees.length}`);
        logInfo(`Employees loaded: ${employees.length}`);
      } else {
        console.log('[DropdownLoader] No employees found in data');
      }
    } catch (error: any) {
      console.error('[DropdownLoader] Exception loading employees:', error);
      console.error('[DropdownLoader] Exception message:', error?.message);
      console.error('[DropdownLoader] Exception stack:', error?.stack);
    }
  }

  /**
   * Handle employee selection change
   */
  private async handleEmployeeChange(employeeEmail: string): Promise<void> {
    if (!employeeEmail) return;

    try {
      const supabase = await getReadySupabaseClient();

      // Load employee details securely using authenticated Supabase client
      const result = await supabase
        .from('people')
        .select('email, name, role, department, country, designation, channel')
        .eq('email', employeeEmail)
        .eq('is_active', true)
        .single();

      const employee = result?.data;
      const error = result?.error;

      if (error || !employee) {
        logWarn('Employee not found:', { email: employeeEmail, error });
        return;
      }

      console.log('📋 [handleEmployeeChange] Employee data loaded:', {
        email: employee.email,
        channel: employee.channel,
        department: employee.department,
        designation: employee.designation
      });

      // Update form fields
      const employeeEmailField = document.getElementById('employeeEmail') as HTMLInputElement;
      const employeeTypeField = document.getElementById('employeeType') as HTMLInputElement;
      const employeeDepartmentField = document.getElementById('employeeDepartment') as HTMLInputElement;
      const employeeChannelField = document.getElementById('employeeChannel') as HTMLInputElement;
      const countryField = document.getElementById('countryOfEmployee') as HTMLInputElement;

      if (employeeEmailField) {
        employeeEmailField.value = employee.email || '';
      }
      // Use designation for employee type (since employee_type doesn't exist in people table)
      if (employeeTypeField && employee.designation) {
        employeeTypeField.value = employee.designation;
      }
      if (employeeDepartmentField && employee.department) {
        employeeDepartmentField.value = employee.department;
      }
      if (employeeChannelField) {
        employeeChannelField.value = employee.channel || '';
        console.log('✅ [handleEmployeeChange] Channel field populated:', employee.channel);
      } else {
        console.warn('⚠️ [handleEmployeeChange] employeeChannel field not found in DOM');
      }
      
      // Also populate channel dropdown in Error Details section
      const channelSelect = document.getElementById('channel') as HTMLSelectElement;
      if (channelSelect && employee.channel) {
        // Ensure channels are loaded first
        if (channelSelect.options.length <= 1) {
          console.log('⏳ [handleEmployeeChange] Channels not loaded yet, loading...');
          await this.loadChannels();
          // Wait a bit for DOM to update
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Find channel by name (text content) since dropdown uses IDs as values
        let channelFound = false;
        for (let i = 0; i < channelSelect.options.length; i++) {
          const option = channelSelect.options[i];
          // Match by text content (channel name) since employee.channel is a name, not an ID
          if (option.textContent && option.textContent.trim() === employee.channel.trim()) {
            channelSelect.selectedIndex = i;
            channelSelect.value = option.value;
            channelFound = true;
            console.log('✅ [handleEmployeeChange] Channel dropdown set to:', option.textContent, 'ID:', option.value);
            // Trigger change event to auto-select matching scorecard
            channelSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
        
        if (!channelFound) {
          console.warn('⚠️ [handleEmployeeChange] Channel not found in dropdown:', employee.channel, 'Available:', Array.from(channelSelect.options).map(opt => opt.textContent));
        }
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
  console.log('[DropdownLoader] loadChannels() called');
  await getDropdownLoader().loadChannels();
}

/**
 * Load employees (global function for backward compatibility)
 */
export async function loadEmployees(): Promise<void> {
  console.log('[DropdownLoader] loadEmployees() called');
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

