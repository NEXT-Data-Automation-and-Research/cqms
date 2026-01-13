/**
 * Profile Repository
 * Handles data access for user profile
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { UserProfile } from '../domain/entities.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import { apiClient } from '../../../utils/api-client.js';
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { PEOPLE_USER_MANAGEMENT_FIELDS } from '../../../core/constants/field-whitelists.js';

/**
 * Repository for user profile operations
 */
export class ProfileRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'users');
  }

  /**
   * Get current user's profile (combines users and people table data)
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    return this.getCachedOrFetch(
      'current_user_profile',
      async () => {
        // Fetch from users table
        const { data: userData, error: userError } = await apiClient.users.getMe();
        
        if (userError || !userData) {
          logError('[ProfileRepository] Failed to fetch user profile:', userError);
          throw new Error(userError?.message || 'Failed to fetch user profile');
        }

        // Fetch from people table
        let peopleData: any = null;
        try {
          const supabase = await getAuthenticatedSupabase();
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (authUser?.email) {
            const { data, error } = await supabase
              .from('people')
              .select(PEOPLE_USER_MANAGEMENT_FIELDS)
              .eq('email', authUser.email)
              .maybeSingle();
            
            if (error) {
              logError('[ProfileRepository] Error fetching from people table:', error);
              // Continue without people data - not all users may have people records
            } else {
              peopleData = data;
              logInfo('[ProfileRepository] People data fetched successfully');
            }
          }
        } catch (peopleError) {
          logError('[ProfileRepository] Error accessing people table:', peopleError);
          // Continue without people data
        }

        // Merge data from both tables
        const mergedProfile = this.mergeUserAndPeopleData(userData, peopleData);
        
        // Enrich with supervisor name if team_supervisor exists
        if (mergedProfile.team_supervisor) {
          try {
            mergedProfile.team_supervisor_name = await this.fetchSupervisorName(mergedProfile.team_supervisor);
          } catch (supervisorError) {
            logError('[ProfileRepository] Error fetching supervisor name:', supervisorError);
            // Continue without supervisor name
          }
        }

        logInfo('[ProfileRepository] User profile fetched and merged successfully');
        return mergedProfile;
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Fetch supervisor name from people/users table
   */
  private async fetchSupervisorName(supervisorEmail: string | null | undefined): Promise<string | null> {
    if (!supervisorEmail) {
      return null;
    }

    try {
      const supabase = await getAuthenticatedSupabase();
      
      // Try people table first
      const { data: peopleData } = await supabase
        .from('people')
        .select('name')
        .eq('email', supervisorEmail)
        .maybeSingle();
      
      if (peopleData?.name) {
        return peopleData.name;
      }

      // Fallback to users table
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('email', supervisorEmail)
        .maybeSingle();
      
      return userData?.full_name || null;
    } catch (error) {
      logError('[ProfileRepository] Error fetching supervisor name:', error);
      return null;
    }
  }

  /**
   * Merge data from users and people tables
   */
  private mergeUserAndPeopleData(userData: any, peopleData: any | null): UserProfile {
    const profile: UserProfile = {
      id: userData.id || '',
      email: userData.email || '',
      full_name: userData.full_name || null,
      avatar_url: userData.avatar_url || peopleData?.avatar_url || null,
      role: userData.role || peopleData?.role || undefined,
      department: userData.department || peopleData?.department || undefined,
      notification_preferences: userData.notification_preferences || undefined,
      device_info: userData.device_info || undefined,
      created_at: userData.created_at || undefined,
      updated_at: userData.updated_at || undefined,
    };

    // Add people table fields if available
    if (peopleData) {
      profile.employee_id = peopleData.employee_id || null;
      profile.channel = peopleData.channel || null;
      profile.team = peopleData.team || null;
      profile.team_supervisor = peopleData.team_supervisor || null;
      profile.quality_mentor = peopleData.quality_mentor || null;
      profile.designation = peopleData.designation || null;
      profile.country = peopleData.country || null;
      profile.intercom_admin_alias = peopleData.intercom_admin_alias || null;
      profile.is_active = peopleData.is_active ?? null;
      profile.last_login = peopleData.last_login || null;
      profile.login_count = peopleData.login_count || null;
      
      // Use people table avatar_url if users table doesn't have one
      if (!profile.avatar_url && peopleData.avatar_url) {
        profile.avatar_url = peopleData.avatar_url;
      }
      
      // Use people table name if users table doesn't have full_name
      if (!profile.full_name && peopleData.name) {
        profile.full_name = peopleData.name;
      }
    }

    return profile;
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: {
    full_name?: string;
    avatar_url?: string;
    notification_preferences?: Record<string, any>;
  }): Promise<UserProfile> {
    const { data, error } = await apiClient.users.updateMe(updates);
    
    if (error || !data) {
      logError('[ProfileRepository] Failed to update user profile:', error);
      throw new Error(error?.message || 'Failed to update user profile');
    }

    // Invalidate cache after update
    this.invalidateCache('current_user_profile');
    
    logInfo('[ProfileRepository] User profile updated successfully');
    return this.mapToUserProfile(data);
  }

  /**
   * Map database row to UserProfile entity (for updates)
   */
  private mapToUserProfile(row: any): UserProfile {
    return {
      id: row.id || '',
      email: row.email || '',
      full_name: row.full_name || null,
      avatar_url: row.avatar_url || null,
      role: row.role || undefined,
      department: row.department || undefined,
      notification_preferences: row.notification_preferences || undefined,
      device_info: row.device_info || undefined,
      created_at: row.created_at || undefined,
      updated_at: row.updated_at || undefined,
    };
  }
}

