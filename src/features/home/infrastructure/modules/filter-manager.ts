/**
 * Filter Management Module
 * Handles filter population and rendering
 */

import type { Audit, FiltersData, Scorecard } from '../types.js';
import { homeState } from '../state.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logWarn, logInfo } from '../../../../utils/logging-helper.js';
import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';

export class FilterManager {
  /**
   * Populate filter options
   */
  async populateFilters(): Promise<void> {
    try {
      await this.fetchAndCacheFilters();
    } catch (error) {
      logError('Error populating filters:', error);
    }
  }

  /**
   * Fetch and cache filter data
   */
  private async fetchAndCacheFilters(): Promise<void> {
    try {
      const supabase = await getAuthenticatedSupabase();
      let allAssignmentsForFilters: Audit[] = [];
      
      if (homeState.isAgent) {
        const { data: scorecards, error: scError } = await supabase
          .from('scorecards')
          .select('table_name')
          .eq('is_active', true);
        
        if (!scError && scorecards) {
          for (const scorecard of scorecards) {
            try {
              const { data: audits, error } = await supabase
                .from(scorecard.table_name)
                .select('channel, employee_email')
                .eq('employee_email', homeState.currentUserEmail);
              
              if (!error && audits) {
                allAssignmentsForFilters = allAssignmentsForFilters.concat(audits);
              }
            } catch (err) {
              logWarn(`Error loading audits for filters from ${scorecard.table_name}:`, err);
            }
          }
        }
      } else {
        const { data: scorecards, error: scError } = await supabase
          .from('scorecards')
          .select('table_name')
          .eq('is_active', true);
        
        if (!scError && scorecards) {
          const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
            try {
              let { data: audits, error } = await supabase
                .from(scorecard.table_name)
                .select('channel, employee_email')
                .eq('auditor_email', homeState.currentUserEmail);
              
              if (error) return [];
              return audits || [];
            } catch (err) {
              logWarn(`Error loading from ${scorecard.table_name}:`, err);
              return [];
            }
          });
          
          const assignmentResults = await Promise.all(assignmentPromises);
          allAssignmentsForFilters = assignmentResults.flat();
        }
      }
      
      const channels = [...new Set(allAssignmentsForFilters.map((a: Audit) => a.channel).filter((ch): ch is string => Boolean(ch)))].sort();
      const agents = !homeState.isAgent ? [...new Set(allAssignmentsForFilters.map((a: Audit) => a.employee_email).filter((em): em is string => Boolean(em)))].sort() : [];
      
      const filtersData: FiltersData = { channels, agents };
      logInfo('Updating UI with fresh filters');
      this.renderFiltersFromData(filtersData);
    } catch (error) {
      logError('Error populating filters:', error);
    }
  }

  /**
   * Render filters from data
   */
  renderFiltersFromData(filtersData: FiltersData): void {
    const { channels, agents } = filtersData;
    
    const channelSelect = document.getElementById('filterChannel') as HTMLSelectElement | null;
    if (channelSelect) {
      const existingValue = channelSelect.value;
      safeSetHTML(channelSelect, '<option value="">All Channels</option>');
      channels.forEach((channel: string) => {
        const option = document.createElement('option');
        option.value = channel;
        option.textContent = channel;
        channelSelect.appendChild(option);
      });
      if (existingValue) channelSelect.value = existingValue;
    }

    if (!homeState.isAgent) {
      const agentSelect = document.getElementById('filterAgent') as HTMLSelectElement | null;
      const agentGroup = document.getElementById('filterAgentGroup');
      if (agentSelect && agentGroup) {
        const existingValue = agentSelect.value;
        agentSelect.textContent = '';
        const allAgentsOption = document.createElement('option');
        allAgentsOption.value = '';
        allAgentsOption.textContent = 'All Agents';
        agentSelect.appendChild(allAgentsOption);
        agents.forEach((agent: string) => {
          const option = document.createElement('option');
          option.value = agent;
          option.textContent = this.formatAgentName(agent);
          agentSelect.appendChild(option);
        });
        if (existingValue) agentSelect.value = existingValue;
        agentGroup.style.display = 'flex';
      }
    }
  }

  /**
   * Format agent name from email
   */
  formatAgentName(email: string | null | undefined): string {
    if (!email || email === 'Unknown') return 'Unknown';
    return email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
}

