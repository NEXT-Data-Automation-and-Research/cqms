/**
 * User Profile Management Module
 * Handles user avatar, profile dashboard, and user loading
 */

import type { User } from '../types.js';
import { homeState } from '../state.js';
import { escapeHtml } from '../utils.js';
import { logError, logWarn } from '../../../../utils/logging-helper.js';

export class UserProfileManager {
  /**
   * Update user avatar
   */
  updateUserAvatar(userInfo: User): void {
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl) return;

    avatarEl.textContent = '';
    if (userInfo.avatar) {
      const img = document.createElement('img');
      img.src = escapeHtml(String(userInfo.avatar || ''));
      img.alt = escapeHtml(String(userInfo.name || 'User'));
      img.className = 'w-full h-full rounded-full object-cover';
      avatarEl.appendChild(img);
    } else if (userInfo.name) {
      const initials = userInfo.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
      const span = document.createElement('span');
      span.className = 'text-xs font-semibold';
      span.textContent = initials;
      avatarEl.appendChild(span);
    }
    
    this.populatePremiumDashboard();
  }

  /**
   * Populate premium dashboard
   */
  async populatePremiumDashboard(): Promise<void> {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    const dashboardUserName = document.getElementById('dashboardUserName');
    const dashboardUserEmail = document.getElementById('dashboardUserEmail');
    const dashboardUserRole = document.getElementById('dashboardUserRole');
    const dashboardAvatar = document.getElementById('dashboardAvatar');
    const dashboardTodayDate = document.getElementById('dashboardTodayDate');
    
    if (dashboardUserName) dashboardUserName.textContent = userInfo.name || 'Unknown User';
    if (dashboardUserEmail) dashboardUserEmail.textContent = userInfo.email || '';
    if (dashboardUserRole) dashboardUserRole.textContent = userInfo.role || 'User';
    
    if (dashboardTodayDate) {
      const today = new Date();
      dashboardTodayDate.textContent = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    if (dashboardAvatar) {
      dashboardAvatar.textContent = '';
      if (userInfo.avatar) {
        const img = document.createElement('img');
        img.src = escapeHtml(String(userInfo.avatar || ''));
        img.className = 'w-full h-full rounded-full object-cover';
        dashboardAvatar.appendChild(img);
      } else if (userInfo.name) {
        const initials = userInfo.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
        const span = document.createElement('span');
        span.className = 'text-sm font-bold';
        span.textContent = initials;
        dashboardAvatar.appendChild(span);
      }
    }
    
    try {
      const { data: userData, error } = await window.supabaseClient
        .from('users')
        .select('email, name, role, channel, team, team_supervisor, quality_mentor, employee_id, intercom_admin_alias')
        .eq('email', homeState.currentUserEmail)
        .single();
      
      if (!error && userData) {
        this.renderUserPills(userData);
      }
    } catch (error) {
      logError('Error loading profile dashboard:', error);
    }
  }

  /**
   * Render user pills (employee/admin info)
   */
  private async renderUserPills(userData: any): Promise<void> {
    const isEmployee = userData.role === 'Employee';
    const isAdmin = userData.role === 'Admin' || userData.role === 'Super Admin' || userData.role === 'Quality Analyst';
    
    const intercomAlias = userData.intercom_admin_alias;
    const isValidIntercom = intercomAlias && 
                            String(intercomAlias).trim() !== '' && 
                            String(intercomAlias).trim().toLowerCase() !== 'null' &&
                            String(intercomAlias).trim().toLowerCase() !== 'undefined';
    
    if (isValidIntercom) {
      const pillIntercomAlias = document.getElementById('pillIntercomAlias');
      if (pillIntercomAlias) {
        pillIntercomAlias.classList.remove('hidden');
        const displayIntercomAlias = document.getElementById('displayIntercomAlias');
        if (displayIntercomAlias) displayIntercomAlias.textContent = String(intercomAlias).trim();
      }
    } else {
      const pillIntercomAlias = document.getElementById('pillIntercomAlias');
      if (pillIntercomAlias) pillIntercomAlias.classList.add('hidden');
    }
    
    if (isEmployee) {
      await this.renderEmployeePills(userData);
    }
    
    if (isAdmin) {
      this.renderAdminPills(userData);
    }
  }

  /**
   * Render employee pills
   */
  private async renderEmployeePills(userData: any): Promise<void> {
    const pillEmployeeId = document.getElementById('pillEmployeeId');
    const pillChannel = document.getElementById('pillChannel');
    const pillTeam = document.getElementById('pillTeam');
    const pillSupervisor = document.getElementById('pillSupervisor');
    
    if (pillEmployeeId) {
      pillEmployeeId.classList.remove('hidden');
      const displayEmployeeId = document.getElementById('displayEmployeeId');
      if (displayEmployeeId) displayEmployeeId.textContent = userData.employee_id || '-';
    }
    if (pillChannel) {
      pillChannel.classList.remove('hidden');
      const displayChannel = document.getElementById('displayChannel');
      if (displayChannel) displayChannel.textContent = userData.channel || '-';
    }
    if (pillTeam) {
      pillTeam.classList.remove('hidden');
      const displayTeam = document.getElementById('displayTeam');
      if (displayTeam) displayTeam.textContent = userData.team || '-';
    }
    if (pillSupervisor && userData.team_supervisor) {
      await this.renderSupervisorPill(pillSupervisor, userData.team_supervisor);
    }
  }

  /**
   * Render supervisor pill
   */
  private async renderSupervisorPill(pillSupervisor: HTMLElement, supervisorEmail: string): Promise<void> {
    const displaySupervisor = document.getElementById('displaySupervisor');
    const currentSupervisorText = displaySupervisor?.textContent?.trim() || '';
    
    if (currentSupervisorText.includes('@')) {
      logWarn('Supervisor email detected in display, clearing it', { email: currentSupervisorText });
      if (displaySupervisor) displaySupervisor.textContent = '-';
      pillSupervisor.classList.add('hidden');
      return;
    }
    
    if (currentSupervisorText && 
        currentSupervisorText !== '-' && 
        !currentSupervisorText.includes('@') &&
        currentSupervisorText !== supervisorEmail) {
      return;
    }
    
    try {
      const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
      const supabase = await getSecureSupabase(true);
      
      let supervisorName = null;
      
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('name')
        .eq('email', supervisorEmail)
        .maybeSingle();
      
      if (!peopleError && peopleData) {
        supervisorName = peopleData.name;
      } else {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('name, full_name')
          .eq('email', supervisorEmail)
          .maybeSingle();
        
        if (!usersError && usersData) {
          supervisorName = usersData.name || usersData.full_name;
        }
      }
      
      if (supervisorName && !supervisorName.includes('@')) {
        pillSupervisor.classList.remove('hidden');
        if (displaySupervisor) {
          displaySupervisor.textContent = supervisorName;
        }
      } else {
        pillSupervisor.classList.add('hidden');
      }
    } catch (err) {
      logWarn('Could not fetch supervisor name:', err);
      pillSupervisor.classList.add('hidden');
    }
  }

  /**
   * Render admin pills
   */
  private renderAdminPills(userData: any): void {
    const pillAdminChannel = document.getElementById('pillAdminChannel');
    const pillQualityMentor = document.getElementById('pillQualityMentor');
    
    if (pillAdminChannel) {
      pillAdminChannel.classList.remove('hidden');
      const displayAdminChannel = document.getElementById('displayAdminChannel');
      if (displayAdminChannel) displayAdminChannel.textContent = userData.channel || 'All Channels';
    }
    if (pillQualityMentor && userData.quality_mentor) {
      pillQualityMentor.classList.remove('hidden');
    }
  }

  /**
   * Load all users
   */
  async loadAllUsers(): Promise<void> {
    try {
      const { data, error } = await window.supabaseClient
        .from('users')
        .select('email, name, role, channel, quality_mentor')
        .eq('is_active', true);
      
      if (error) throw error;
      homeState.allUsers = data || [];
    } catch (error) {
      logError('Error loading users:', error);
      homeState.allUsers = [];
    }
  }

  /**
   * Logout function
   */
  async logout(): Promise<void> {
    try {
      const { signOut } = await import('../../../../utils/auth.js') as { signOut: () => Promise<void> };
      await signOut();
    } catch (error) {
      logError('Error during logout:', error);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('lastLoginUpdate');
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/src/auth/presentation/auth-page.html';
    }
  }
}

