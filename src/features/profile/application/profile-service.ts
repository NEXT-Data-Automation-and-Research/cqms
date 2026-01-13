/**
 * Profile Service
 * Business logic for user profile operations
 */

import { BaseService } from '../../../core/service/base-service.js';
import { ProfileRepository } from '../infrastructure/profile-repository.js';
import { UserProfile, ProfileUpdateData } from '../domain/entities.js';
import { createValidationError } from '../../../core/errors/app-error.js';
import { sanitizeString } from '../../../api/utils/validation.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

/**
 * Service for user profile business logic
 */
export class ProfileService extends BaseService {
  constructor(private repository: ProfileRepository) {
    super();
  }

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile> {
    return this.executeBusinessLogic(
      async () => {
        const profile = await this.repository.getCurrentUserProfile();
        
        if (!profile) {
          throw new Error('User profile not found');
        }

        return profile;
      },
      'Failed to load user profile'
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    // Validate full_name if provided
    if (data.full_name !== undefined) {
      this.validateInput(data.full_name, (name) => {
        if (name && name.trim().length === 0) {
          return 'Name cannot be empty';
        }
        if (name && name.trim().length > 100) {
          return 'Name must be 100 characters or less';
        }
        return true;
      });
    }

    // Validate avatar_url if provided
    if (data.avatar_url !== undefined && data.avatar_url !== null) {
      this.validateInput(data.avatar_url, (url) => {
        if (url && url.trim().length === 0) {
          return 'Avatar URL cannot be empty';
        }
        if (url && url.length > 500) {
          return 'Avatar URL must be 500 characters or less';
        }
        if (url && !this.isValidUrl(url)) {
          return 'Avatar URL must be a valid URL';
        }
        return true;
      });
    }

    return this.executeBusinessLogic(
      async () => {
        // Sanitize inputs
        const updates: ProfileUpdateData = {};
        
        if (data.full_name !== undefined) {
          updates.full_name = data.full_name 
            ? sanitizeString(data.full_name.trim(), 100)
            : undefined;
        }
        
        if (data.avatar_url !== undefined) {
          updates.avatar_url = data.avatar_url 
            ? sanitizeString(data.avatar_url.trim(), 500)
            : undefined;
        }
        
        if (data.notification_preferences !== undefined) {
          updates.notification_preferences = data.notification_preferences;
        }

        logInfo('[ProfileService] Updating user profile', { 
          hasFullName: !!updates.full_name,
          hasAvatarUrl: !!updates.avatar_url 
        });

        return await this.repository.updateProfile(updates);
      },
      'Failed to update user profile'
    );
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

