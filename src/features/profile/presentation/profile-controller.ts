/**
 * Profile Controller
 * Handles UI interactions for profile page
 */

import { ProfileService } from '../application/profile-service.js';
import { ProfileRepository } from '../infrastructure/profile-repository.js';
import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { ProfileRenderer } from './profile-renderer.js';
import { UserProfile, ProfileUpdateData } from '../domain/entities.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

/**
 * Controller for profile page
 */
export class ProfileController {
  private service: ProfileService | null = null;
  private profile: UserProfile | null = null;
  private isEditing = false;
  private renderer: ProfileRenderer;

  constructor() {
    this.renderer = new ProfileRenderer();
    // Service will be initialized in initialize() after Supabase is ready
  }

  /**
   * Initialize service (call after Supabase is ready)
   */
  private initializeService(): void {
    if (!(window as any).supabaseClient) {
      throw new Error('Supabase client not initialized. Ensure window.supabaseClient is set.');
    }
    const db = DatabaseFactory.createClient();
    const repository = new ProfileRepository(db);
    this.service = new ProfileService(repository);
  }

  /**
   * Initialize the profile page
   */
  async initialize(): Promise<void> {
    try {
      // Initialize service first
      this.initializeService();
      
      await this.loadProfile();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      logError('[ProfileController] Failed to initialize:', error);
      this.showError('Failed to load profile. Please refresh the page.');
    }
  }

  /**
   * Load user profile from database
   */
  private async loadProfile(): Promise<void> {
    if (!this.service) {
      throw new Error('Service not initialized');
    }
    try {
      this.profile = await this.service.getCurrentUserProfile();
      logInfo('[ProfileController] Profile loaded successfully');
    } catch (error) {
      logError('[ProfileController] Error loading profile:', error);
      throw error;
    }
  }

  /**
   * Render the profile page
   */
  private render(): void {
    this.renderer.render(this.profile, this.isEditing);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const editBtn = document.getElementById('edit-profile-btn');
    const form = document.getElementById('profile-form') as HTMLFormElement;
    const cancelBtn = document.getElementById('cancel-edit-btn');

    editBtn?.addEventListener('click', () => {
      this.toggleEditMode();
    });

    cancelBtn?.addEventListener('click', () => {
      this.toggleEditMode();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  /**
   * Toggle edit mode
   */
  private toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    this.render();
    this.attachEventListeners();
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    if (!this.service) {
      this.renderer.showError('Service not initialized. Please refresh the page.');
      return;
    }

    const form = document.getElementById('profile-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const updates: ProfileUpdateData = {
      full_name: formData.get('full_name') as string || undefined,
      avatar_url: formData.get('avatar_url') as string || undefined,
    };

    // Remove empty strings
    if (updates.full_name === '') updates.full_name = undefined;
    if (updates.avatar_url === '') updates.avatar_url = undefined;

    const saveBtn = document.getElementById('save-profile-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      this.profile = await this.service.updateProfile(updates);
      this.isEditing = false;
      this.render();
      this.attachEventListeners();
      this.renderer.showSuccess('Profile updated successfully!');
      
      // Refresh sidebar user info
      if ((window as any).sidebarUserProfile) {
        await (window as any).sidebarUserProfile.loadUserInfoFromDatabase();
      }
    } catch (error: any) {
      logError('[ProfileController] Error updating profile:', error);
      this.renderer.showError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.renderer.showError(message);
  }
}

