/**
 * Filter Modal Template
 * HTML template generator for filter modal
 */

export function getFilterModalHTML(): string {
  return `
    <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col border border-white/10 overflow-hidden transform transition-all">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 px-6 py-4 flex-shrink-0">
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
            <div id="modalGroupByDropdown"></div>
          </div>

          <!-- Channel -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Channel</label>
            <div id="modalChannelDropdown"></div>
          </div>

          <!-- Team -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Team</label>
            <div id="modalTeamDropdown"></div>
          </div>

          <!-- Department -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Department</label>
            <div id="modalDepartmentDropdown"></div>
          </div>

          <!-- Country -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Country</label>
            <div id="modalCountryDropdown"></div>
          </div>

          <!-- Quality Mentor -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Quality Mentor</label>
            <div id="modalQualitySupervisorDropdown"></div>
          </div>

          <!-- Team Supervisor -->
          <div class="filter-option">
            <label class="text-sm font-semibold text-white mb-2 block">Team Supervisor</label>
            <div id="modalTeamSupervisorDropdown"></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-white/10 px-6 py-4 flex-shrink-0 flex items-center justify-end gap-3">
        <button
          id="applyFiltersBtn"
          class="px-6 py-2.5 text-sm bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:from-primary-dark hover:to-primary transition-all flex items-center gap-2 shadow-lg"
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
          class="px-4 py-2.5 border border-white/20 rounded-lg bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-all"
          data-action="close-modal"
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  `;
}

