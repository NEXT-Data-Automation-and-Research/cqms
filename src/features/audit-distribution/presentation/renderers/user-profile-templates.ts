/**
 * User Profile Templates
 * HTML templates for user profile rendering
 */

export interface PersonData {
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
  is_active: boolean | null;
  phone: string | null;
  designation: string | null;
  employee_id: number | null;
  timezone: string | null;
  country: string | null;
  team: string | null;
  team_supervisor: string | null;
  quality_mentor: string | null;
  channel: string | null;
  intercom_admin_id: string | null;
  intercom_admin_alias: string | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: any;
}

export function getProfileHTML(person: PersonData, escapeHtml: (text: string | null) => string, formatDate: (date: string) => string, renderDetailSection: (title: string, items: Array<{ label: string; value: string | null }>) => string): string {
  const initials = person.name
    ? person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return `
    <!-- Header with Back Button -->
    <div class="mb-6">
      <button 
        id="profileBackButton"
        data-action="go-back"
        class="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all group"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="group-hover:-translate-x-1 transition-transform">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span class="font-medium">Back</span>
      </button>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">User Profile</h1>
          <p class="text-sm text-white/60">View detailed information about this team member</p>
        </div>
      </div>
      <div class="h-px bg-white/10 mt-4"></div>
    </div>

    <!-- Profile Card -->
    <div class="glass-card rounded-xl p-6">
      <!-- Profile Header -->
      <div class="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-6 border-b border-white/10">
        <!-- Avatar -->
        <div class="w-28 h-28 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-lg overflow-hidden ring-2 ring-primary/30">
          ${person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined'
            ? `<img src="${escapeHtml(person.avatar_url)}" alt="${escapeHtml(person.name || '')}" class="w-full h-full object-cover" referrerPolicy="no-referrer" />`
            : ''
          }
          <div class="${person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? 'hidden' : 'flex'} items-center justify-center w-full h-full">
            ${initials}
          </div>
        </div>

        <!-- Basic Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold text-white mb-2">${escapeHtml(person.name || 'Unknown')}</h2>
              <div class="flex flex-wrap items-center gap-3 text-sm">
                ${person.email ? `
                  <div class="flex items-center gap-2 text-white/70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span class="truncate max-w-[200px]">${escapeHtml(person.email)}</span>
                  </div>
                ` : ''}
                ${person.role ? `
                  <div class="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-primary font-semibold text-xs">
                    ${escapeHtml(person.role)}
                  </div>
                ` : ''}
                ${person.is_active !== null ? `
                  <div class="flex items-center gap-2 px-3 py-1 rounded-full ${person.is_active ? 'bg-success/20 border border-success/30' : 'bg-gray-500/20 border border-gray-500/30'}">
                    <div class="w-2 h-2 rounded-full ${person.is_active ? 'bg-success' : 'bg-gray-500'}"></div>
                    <span class="text-xs font-medium ${person.is_active ? 'text-success' : 'text-gray-400'}">${person.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${renderDetailSection('Personal Information', [
          { label: 'Name', value: person.name },
          { label: 'Email', value: person.email },
          { label: 'Phone', value: person.phone },
          { label: 'Employee ID', value: person.employee_id?.toString() || null },
          { label: 'Timezone', value: person.timezone }
        ])}

        ${renderDetailSection('Work Information', [
          { label: 'Role', value: person.role },
          { label: 'Designation', value: person.designation },
          { label: 'Department', value: person.department },
          { label: 'Team', value: person.team },
          { label: 'Channel', value: person.channel },
          { label: 'Country', value: person.country }
        ])}

        ${renderDetailSection('Supervision', [
          { label: 'Team Supervisor', value: person.team_supervisor },
          { label: 'Quality Mentor', value: person.quality_mentor }
        ])}

        ${renderDetailSection('Additional Information', [
          { label: 'Intercom Admin ID', value: person.intercom_admin_id },
          { label: 'Intercom Admin Alias', value: person.intercom_admin_alias },
          { label: 'Created At', value: person.created_at ? formatDate(person.created_at) : null },
          { label: 'Updated At', value: person.updated_at ? formatDate(person.updated_at) : null }
        ])}
      </div>
    </div>
  `;
}

export function getDetailSectionHTML(title: string, items: Array<{ label: string; value: string | null }>, escapeHtml: (text: string | null) => string): string {
  const filteredItems = items.filter(item => item.value !== null && item.value !== '' && item.value !== 'undefined');
  
  if (filteredItems.length === 0) {
    return '';
  }

  const getIcon = (label: string): string => {
    const iconMap: Record<string, string> = {
      'Name': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      'Email': '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
      'Phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
      'Employee ID': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/>',
      'Timezone': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'Role': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'Designation': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
      'Department': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      'Team': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'Channel': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      'Country': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      'Team Supervisor': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11v6"/><path d="M9 14h6"/>',
      'Quality Mentor': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11v6"/><path d="M9 14h6"/>',
      'Intercom Admin ID': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/>',
      'Intercom Admin Alias': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/>',
      'Created At': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'Updated At': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
    };
    return iconMap[label] || '<circle cx="12" cy="12" r="10"/>';
  };

  return `
    <div class="bg-white/5 rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all">
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
          ${getIcon(title)}
        </svg>
        ${escapeHtml(title)}
      </h3>
      <div class="space-y-3.5">
        ${filteredItems.map(item => `
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">${escapeHtml(item.label)}</div>
              <div class="text-sm font-medium text-white break-words">${escapeHtml(item.value || 'N/A')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function getNotFoundHTML(): string {
  return `
    <div class="glass-card rounded-xl p-8 text-center">
      <div class="mb-4">
        <svg class="mx-auto w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">User Not Found</h2>
      <p class="text-white/70 mb-4">The user profile you're looking for doesn't exist.</p>
      <button 
        id="notFoundBackButton"
        data-action="go-back"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
      >
        Go Back
      </button>
    </div>
  `;
}

export function getErrorHTML(message: string, escapeHtml: (text: string | null) => string): string {
  return `
    <div class="glass-card rounded-xl p-8 text-center">
      <div class="mb-4">
        <svg class="mx-auto w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">Error</h2>
      <p class="text-white/70 mb-4">${escapeHtml(message)}</p>
      <button 
        id="errorBackButton"
        data-action="go-back"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
      >
        Go Back
      </button>
    </div>
  `;
}

