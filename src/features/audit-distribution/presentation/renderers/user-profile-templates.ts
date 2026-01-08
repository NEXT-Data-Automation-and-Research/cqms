/**
 * User Profile Templates
 * HTML templates for user profile rendering
 */

import { PROFILE_PAGE_COLORS, PROFILE_PAGE_STYLES } from '../../../../core/constants/color-whitelists.js';

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

  const html = `
    <!-- Header with Back Button -->
    <div style="margin-bottom: 1.125rem;">
      <button 
        type="button"
        id="profileBackButton"
        data-action="go-back"
        style="display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; border-radius: 0.375rem; background: ${PROFILE_PAGE_COLORS.BUTTON_BACK_BG}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.BUTTON_BACK_BORDER}; color: ${PROFILE_PAGE_COLORS.BUTTON_BACK_TEXT}; font-size: 0.5625rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease; margin-bottom: 1rem;"
        onmouseover="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_BACK_HOVER_BG}'; this.style.borderColor='${PROFILE_PAGE_COLORS.BUTTON_BACK_HOVER_BORDER}';"
        onmouseout="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_BACK_BG}'; this.style.borderColor='${PROFILE_PAGE_COLORS.BUTTON_BACK_BORDER}';"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span>Back</span>
      </button>
    </div>

    <!-- Profile Card -->
    <div style="background: ${PROFILE_PAGE_COLORS.CARD_BACKGROUND}; border-radius: ${PROFILE_PAGE_STYLES.CARD.borderRadius}; padding: ${PROFILE_PAGE_STYLES.CARD.padding}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}; box-shadow: ${PROFILE_PAGE_COLORS.CARD_SHADOW};">
      <!-- Profile Header -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER};">
        <!-- Avatar -->
        <div style="width: 7rem; height: 7rem; border-radius: 0.75rem; background: linear-gradient(to bottom right, ${PROFILE_PAGE_COLORS.AVATAR_BG_START}, ${PROFILE_PAGE_COLORS.AVATAR_BG_END}); color: ${PROFILE_PAGE_COLORS.AVATAR_TEXT}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.5rem; flex-shrink: 0; box-shadow: 0 0.625rem 0.9375rem -0.1875rem rgba(0, 0, 0, 0.1); overflow: hidden; border: 0.125rem solid ${PROFILE_PAGE_COLORS.AVATAR_BORDER}; position: relative;">
          ${person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined'
            ? `<img src="${escapeHtml(person.avatar_url)}" alt="${escapeHtml(person.name || '')}" style="width: 100%; height: 100%; object-fit: cover;" referrerPolicy="no-referrer" />`
            : ''
          }
          <div style="display: ${person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? 'none' : 'flex'}; align-items: center; justify-content: center; width: 100%; height: 100%; position: ${person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? 'absolute' : 'relative'}; top: 0; left: 0;">
            ${initials}
          </div>
        </div>

        <!-- Basic Info -->
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem;">
            <div style="flex: 1; min-width: 0;">
              <h2 style="font-size: ${PROFILE_PAGE_STYLES.TEXT_HEADING.fontSize}; font-weight: ${PROFILE_PAGE_STYLES.TEXT_HEADING.fontWeight}; color: ${PROFILE_PAGE_COLORS.TEXT_HEADING}; margin-bottom: 0.5rem;">${escapeHtml(person.name || 'Unknown')}</h2>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem;">
                ${person.email ? `
                  <div style="display: flex; align-items: center; gap: 0.5rem; color: ${PROFILE_PAGE_COLORS.TEXT_SECONDARY};">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${escapeHtml(person.email)}</span>
                  </div>
                ` : ''}
                ${person.role ? `
                  <div style="padding: 0.25rem 0.75rem; background-color: ${PROFILE_PAGE_COLORS.ROLE_BADGE_BG}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.ROLE_BADGE_BORDER}; border-radius: 9999px; color: ${PROFILE_PAGE_COLORS.ROLE_BADGE_TEXT}; font-weight: 600; font-size: 0.75rem;">
                    ${escapeHtml(person.role)}
                  </div>
                ` : ''}
                ${person.is_active !== null ? `
                  <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; ${person.is_active ? `background-color: ${PROFILE_PAGE_COLORS.STATUS_ACTIVE_BG}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.STATUS_ACTIVE_BORDER};` : `background-color: ${PROFILE_PAGE_COLORS.STATUS_INACTIVE_BG}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.STATUS_INACTIVE_BORDER};`}">
                    <div style="width: 0.5rem; height: 0.5rem; border-radius: 9999px; ${person.is_active ? `background-color: ${PROFILE_PAGE_COLORS.STATUS_ACTIVE_DOT};` : `background-color: ${PROFILE_PAGE_COLORS.STATUS_INACTIVE_DOT};`}"></div>
                    <span style="font-size: 0.75rem; font-weight: 500; ${person.is_active ? `color: ${PROFILE_PAGE_COLORS.STATUS_ACTIVE_TEXT};` : `color: ${PROFILE_PAGE_COLORS.STATUS_INACTIVE_TEXT};`}">${person.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Details Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1.5rem;">
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
  
  return html;
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
    <div style="background: ${PROFILE_PAGE_COLORS.CARD_BACKGROUND}; border-radius: ${PROFILE_PAGE_STYLES.DETAIL_SECTION_CARD.borderRadius}; padding: ${PROFILE_PAGE_STYLES.DETAIL_SECTION_CARD.padding}; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}; transition: all 0.2s ease; box-shadow: ${PROFILE_PAGE_COLORS.CARD_SHADOW};" onmouseover="this.style.backgroundColor='${PROFILE_PAGE_COLORS.CARD_BACKGROUND}';" onmouseout="this.style.backgroundColor='${PROFILE_PAGE_COLORS.CARD_BACKGROUND}';">
      <h3 style="font-size: ${PROFILE_PAGE_STYLES.SECTION_TITLE.fontSize}; font-weight: ${PROFILE_PAGE_STYLES.SECTION_TITLE.fontWeight}; color: ${PROFILE_PAGE_COLORS.SECTION_TITLE}; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; text-transform: ${PROFILE_PAGE_STYLES.SECTION_TITLE.textTransform}; letter-spacing: ${PROFILE_PAGE_STYLES.SECTION_TITLE.letterSpacing}; padding-bottom: ${PROFILE_PAGE_STYLES.SECTION_TITLE.paddingBottom}; border-bottom: ${PROFILE_PAGE_STYLES.SECTION_TITLE.borderBottom};">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${PROFILE_PAGE_COLORS.SECTION_TITLE};">
          ${getIcon(title)}
        </svg>
        ${escapeHtml(title)}
      </h3>
      <div style="display: flex; flex-direction: column; gap: 0.875rem;">
        ${filteredItems.map(item => `
          <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: ${PROFILE_PAGE_STYLES.TEXT_LABEL.fontSize}; font-weight: ${PROFILE_PAGE_STYLES.TEXT_LABEL.fontWeight}; color: ${PROFILE_PAGE_COLORS.TEXT_LABEL}; margin-bottom: 0.375rem; text-transform: ${PROFILE_PAGE_STYLES.TEXT_LABEL.textTransform}; letter-spacing: ${PROFILE_PAGE_STYLES.TEXT_LABEL.letterSpacing};">${escapeHtml(item.label)}</div>
              <div style="font-size: ${PROFILE_PAGE_STYLES.TEXT_PRIMARY.fontSize}; font-weight: ${PROFILE_PAGE_STYLES.TEXT_PRIMARY.fontWeight}; color: ${PROFILE_PAGE_COLORS.TEXT_VALUE}; word-break: break-word; line-height: 1.5;">${escapeHtml(item.value || 'N/A')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function getNotFoundHTML(): string {
  return `
    <div style="background: ${PROFILE_PAGE_COLORS.CARD_BACKGROUND}; border-radius: 0.5rem; padding: 2rem; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}; box-shadow: ${PROFILE_PAGE_COLORS.CARD_SHADOW}; text-align: center;">
      <div style="margin-bottom: 1rem;">
        <svg style="margin: 0 auto; width: 4rem; height: 4rem; color: ${PROFILE_PAGE_COLORS.ERROR_ICON};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <h2 style="font-size: 1.25rem; font-weight: 700; color: ${PROFILE_PAGE_COLORS.ERROR_HEADING}; margin-bottom: 0.5rem;">User Not Found</h2>
      <p style="color: ${PROFILE_PAGE_COLORS.ERROR_TEXT}; margin-bottom: 1rem;">The user profile you're looking for doesn't exist.</p>
      <button 
        type="button"
        id="notFoundBackButton"
        data-action="go-back"
        style="padding: 0.5rem 1rem; background-color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}; color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_TEXT}; border: none; border-radius: 0.375rem; font-size: 0.5625rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease;"
        onmouseover="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_HOVER_BG}';"
        onmouseout="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}';"
      >
        Go Back
      </button>
    </div>
  `;
}

export function getErrorHTML(message: string, escapeHtml: (text: string | null) => string): string {
  return `
    <div style="background: ${PROFILE_PAGE_COLORS.CARD_BACKGROUND}; border-radius: 0.5rem; padding: 2rem; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}; box-shadow: ${PROFILE_PAGE_COLORS.CARD_SHADOW}; text-align: center;">
      <div style="margin-bottom: 1rem;">
        <svg style="margin: 0 auto; width: 4rem; height: 4rem; color: ${PROFILE_PAGE_COLORS.ERROR_ICON};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h2 style="font-size: 1.25rem; font-weight: 700; color: ${PROFILE_PAGE_COLORS.ERROR_HEADING}; margin-bottom: 0.5rem;">Error</h2>
      <p style="color: ${PROFILE_PAGE_COLORS.ERROR_TEXT}; margin-bottom: 1rem;">${escapeHtml(message)}</p>
      <button 
        type="button"
        id="errorBackButton"
        data-action="go-back"
        style="padding: 0.5rem 1rem; background-color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}; color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_TEXT}; border: none; border-radius: 0.375rem; font-size: 0.5625rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease;"
        onmouseover="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_HOVER_BG}';"
        onmouseout="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}';"
      >
        Go Back
      </button>
    </div>
  `;
}

