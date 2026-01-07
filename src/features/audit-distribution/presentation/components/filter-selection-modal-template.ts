/**
 * Filter Selection Modal Template
 * HTML template generator for filter selection modal
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { escapeHtml } from '../../../../utils/html-sanitizer.js';

export function getFilterSelectionModalHTML(
  employees: Employee[],
  currentFilters: FilterOptions
): string {
  const isValidValue = (val: string | null | undefined): val is string => {
    return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
  };
  
  const channels = [...new Set(employees.map(e => e.channel).filter(isValidValue))].sort();
  const teams = [...new Set(employees.map(e => e.team).filter(isValidValue))].sort();
  const departments = [...new Set(employees.map(e => e.department).filter(isValidValue))].sort();
  const countries = [...new Set(employees.map(e => e.country).filter(isValidValue))].sort();
  const qualitySupervisors = [...new Set(employees.map(e => e.quality_mentor).filter(isValidValue))].sort();
  const teamSupervisors = [...new Set(employees.map(e => e.team_supervisor).filter(isValidValue))].sort();

  const groupByValue = currentFilters.groupBy || 'none';
  const channelValue = currentFilters.channel || '';
  const teamValue = currentFilters.team || '';
  const departmentValue = currentFilters.department || '';
  const countryValue = currentFilters.country || '';
  const qualitySupervisorValue = currentFilters.qualitySupervisor || '';
  const teamSupervisorValue = currentFilters.teamSupervisor || '';

  const selectBaseClasses = 'w-full px-3 py-2.5 text-sm border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer';
  const selectStyle = 'background-image: url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M2 4L6 8L10 4\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' opacity=\'0.7\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2.5rem;';

  return `
    <div class="filter-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity pointer-events-auto" data-action="close-modal"></div>
    <div class="filter-modal-content rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col border border-white/10 overflow-hidden transform transition-all relative z-10 pointer-events-auto" style="background: rgba(40, 35, 62, 0.95); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);">
      <!-- Header -->
      <div class="border-b border-white/10 px-6 py-4 flex-shrink-0" style="background: rgba(99, 91, 255, 0.1);">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-white m-0 mb-1">Add Filters</h2>
            <p class="text-sm text-white/70 m-0">Select filters to refine your search</p>
          </div>
          <button
            id="closeFilterModalBtn"
            class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            data-action="close-modal"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Group By -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Group By</label>
            <select
              id="filterGroupBy"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="none" ${groupByValue === 'none' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">None</option>
              <option value="channel" ${groupByValue === 'channel' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Channel</option>
              <option value="team" ${groupByValue === 'team' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Team</option>
              <option value="quality_mentor" ${groupByValue === 'quality_mentor' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Quality Mentor</option>
              <option value="team_supervisor" ${groupByValue === 'team_supervisor' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Team Supervisor</option>
              <option value="department" ${groupByValue === 'department' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Department</option>
              <option value="country" ${groupByValue === 'country' ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">Country</option>
            </select>
          </div>

          <!-- Channel -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Channel</label>
            <select
              id="filterChannel"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Channels</option>
              ${channels.map(ch => `<option value="${escapeHtml(ch)}" ${channelValue === ch ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(ch)}</option>`).join('')}
            </select>
          </div>

          <!-- Team -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Team</label>
            <select
              id="filterTeam"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Teams</option>
              ${teams.map(team => `<option value="${escapeHtml(team)}" ${teamValue === team ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(team)}</option>`).join('')}
            </select>
          </div>

          <!-- Department -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Department</label>
            <select
              id="filterDepartment"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Departments</option>
              ${departments.map(dept => `<option value="${escapeHtml(dept)}" ${departmentValue === dept ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(dept)}</option>`).join('')}
            </select>
          </div>

          <!-- Country -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Country</label>
            <select
              id="filterCountry"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Countries</option>
              ${countries.map(country => `<option value="${escapeHtml(country)}" ${countryValue === country ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(country)}</option>`).join('')}
            </select>
          </div>

          <!-- Quality Mentor -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Quality Mentor</label>
            <select
              id="filterQualitySupervisor"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Quality Mentors</option>
              ${qualitySupervisors.map(qs => {
                const emp = employees.find(e => e.email === qs);
                const displayName = emp?.name || qs;
                return `<option value="${escapeHtml(qs)}" ${qualitySupervisorValue === qs ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(displayName)}</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Team Supervisor -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Team Supervisor</label>
            <select
              id="filterTeamSupervisor"
              class="${selectBaseClasses}"
              style="${selectStyle}"
            >
              <option value="" style="background-color: rgba(40, 35, 62, 0.95); color: white;">All Team Supervisors</option>
              ${teamSupervisors.map(ts => {
                const emp = employees.find(e => e.email === ts);
                const displayName = emp?.name || ts;
                return `<option value="${escapeHtml(ts)}" ${teamSupervisorValue === ts ? 'selected' : ''} style="background-color: rgba(40, 35, 62, 0.95); color: white;">${escapeHtml(displayName)}</option>`;
              }).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-white/10 px-6 py-4 flex-shrink-0 flex items-center justify-end gap-3">
        <button
          id="applyFiltersBtn"
          class="apply-filters-btn px-6 py-2.5 text-sm text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg"
          type="button"
          data-action="apply-filters"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Apply Filters
        </button>
        <button
          id="cancelFilterModalBtn"
          class="cancel-filter-btn px-4 py-2.5 border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
          data-action="close-modal"
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  `;
}
