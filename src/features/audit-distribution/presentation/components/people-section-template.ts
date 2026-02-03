/**
 * People Section Template
 * Shared HTML for the People card used in Manual Assign and AI Audit.
 * Puts filters inside the people section header for consistent layout.
 */

export function getPeopleSectionHTML(title: string, subtitle: string): string {
  return `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden people-section-compact">
      <div class="people-section-header border-b border-gray-200 bg-gray-50">
        <div class="flex flex-col gap-3">
          <div class="flex items-baseline gap-2">
            <h3 class="text-base font-semibold text-gray-900">${escapeHtml(title)}</h3>
            <p class="text-xs text-gray-600">${escapeHtml(subtitle)}</p>
          </div>
          <div id="peopleSectionFilterContainer" class="min-h-0"></div>
        </div>
      </div>
      <div id="selectionActionsContainer" class="px-4 py-2 border-b border-gray-200 flex items-center gap-2 flex-shrink-0"></div>
      <div id="employeeListContent" class="max-h-[60vh] overflow-y-auto overflow-x-auto"></div>
      <div id="paginationBottomContainer" class="px-4 py-2 border-t border-gray-200 flex-shrink-0"></div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
