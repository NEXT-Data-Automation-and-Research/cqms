/**
 * Profile Repository
 * Handles data access for user profile
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { UserProfile } from '../domain/entities.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import { apiClient } from '../../../utils/api-client.js';

/**
 * Repository for user profile operations
 */
export class ProfileRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'users');
  }

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    return this.getCachedOrFetch(
      'current_user_profile',
      async () => {
        const { data, error } = await apiClient.users.getMe();
        
        if (error || !data) {
          logError('[ProfileRepository] Failed to fetch user profile:', error);
          throw new Error(error?.message || 'Failed to fetch user profile');
        }

        logInfo('[ProfileRepository] User profile fetched successfully');
        return this.mapToUserProfile(data);
      },
      300000 // 5 minutes cache
    );
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
   * Map database row to UserProfile entity
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

