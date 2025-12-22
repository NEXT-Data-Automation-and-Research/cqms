/**
 * User Profile Dashboard Component
 * Loads and displays user information from Supabase users table
 * Uses authenticated Supabase calls via getSecureSupabase
 */

// Logger that always logs to console
const logger = {
  trace: (...args: any[]) => console.trace('[UserProfileDashboard]', ...args),
  debug: (...args: any[]) => console.debug('[UserProfileDashboard]', ...args),
  info: (...args: any[]) => console.info('[UserProfileDashboard]', ...args),
  warn: (...args: any[]) => console.warn('[UserProfileDashboard]', ...args),
  error: (...args: any[]) => console.error('[UserProfileDashboard]', ...args),
};

interface UserProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

class UserProfileDashboard {
  private state: 'loading' | 'loaded' | 'error' = 'loading';
  private retryCount = 0;
  private maxRetries = 10;

  /**
   * Initialize the user profile dashboard
   */
  async init(): Promise<void> {
    console.log('[UserProfileDashboard] ===== INITIALIZATION STARTED =====');
    logger.info('Initializing UserProfileDashboard component...');
    this.setState('loading');

    try {
      // Wait for component to be in DOM
      logger.info('Waiting for component elements in DOM...');
      await this.waitForComponent();
      logger.info('Component elements found in DOM');

      // First, show data from localStorage immediately (fast, no waiting)
      logger.info('Loading cached data from localStorage...');
      this.loadFromLocalStorage();
      logger.info('Displayed cached data from localStorage');

      // Then load fresh data from Supabase (will update if different)
      try {
        logger.info('Attempting to load fresh data from Supabase database...');
        await this.loadUserProfile();
        logger.info('Successfully loaded fresh data from database');
      } catch (dbError: any) {
        logger.warn('Could not load from database, using cached data', {
          error: dbError?.message || String(dbError),
          code: dbError?.code
        });
        // Keep the localStorage data that's already displayed
      }

      this.setState('loaded');
      console.log('[UserProfileDashboard] ===== INITIALIZATION COMPLETE =====');
      logger.info('Successfully loaded and displayed user profile');
    } catch (error: any) {
      this.setState('error');
      console.error('[UserProfileDashboard] ===== INITIALIZATION FAILED =====', error);
      logger.error('Failed to initialize', {
        error: error?.message || String(error),
        stack: error?.stack,
        code: error?.code
      });
      // Try to show something from localStorage even on error
      this.loadFromLocalStorage();
      this.showErrorState();
    }
  }

  /**
   * Wait for the component elements to be available in DOM
   */
  private async waitForComponent(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const dashboardUserName = document.getElementById('dashboardUserName');
      const dashboardAvatar = document.getElementById('dashboardAvatar');

      if (dashboardUserName && dashboardAvatar) {
        logger.debug('UserProfileDashboard: Component elements found in DOM');
        return;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('UserProfileDashboard: Component elements not found in DOM after waiting');
  }

  /**
   * Get authenticated Supabase client
   * Uses getSecureSupabase for authenticated calls
   */
  private async getAuthenticatedClient(): Promise<any> {
    try {
      // Try to import getSecureSupabase - use relative path from feature to utils
      // Path: features/home/components/user-profile-dashboard -> src/utils (4 levels up)
      const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
      logger.debug('UserProfileDashboard: Getting authenticated Supabase client...');
      
      // Get secure client (requires authentication)
      const secureClient = await getSecureSupabase(true);
      logger.info('UserProfileDashboard: Authenticated Supabase client obtained');
      
      return secureClient;
    } catch (error: any) {
      logger.error('UserProfileDashboard: Failed to get authenticated client', {
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Load user profile from Supabase using authenticated client
   */
  private async loadUserProfile(): Promise<void> {
    try {
      logger.info('UserProfileDashboard: Starting to load user profile from database...');

      // Get authenticated Supabase client
      const supabase = await this.getAuthenticatedClient();

      // Get current authenticated user
      logger.debug('UserProfileDashboard: Getting authenticated user...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        logger.error('UserProfileDashboard: Authentication failed', {
          error: authError?.message,
          code: authError?.code
        });
        throw new Error(`Authentication error: ${authError?.message || 'User not authenticated'}`);
      }

      logger.info('UserProfileDashboard: User authenticated', { userId: authUser.id, email: authUser.email });

      // Fetch user data from users table using authenticated secure client
      // Only select columns that exist in the database
      logger.info('UserProfileDashboard: Querying users table with authenticated client...');
      
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('full_name, email, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (dbError) {
        logger.error('UserProfileDashboard: Database query error', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        throw new Error(`Database error: ${dbError.message} (Code: ${dbError.code || 'unknown'})`);
      }

      if (!userData) {
        throw new Error('User data not found in database');
      }

      logger.info('UserProfileDashboard: User data loaded from database', {
        email: userData.email,
        full_name: userData.full_name,
        has_avatar: !!userData.avatar_url,
        avatar_url: userData.avatar_url ? userData.avatar_url.substring(0, 50) + '...' : 'none'
      });

      // Update localStorage with latest data
      this.updateLocalStorage(userData, authUser);

      // Render the profile
      this.renderProfile(userData);

      // Load additional info (supervisor name, etc.)
      await this.loadAdditionalInfo(userData);

    } catch (error) {
      logger.error('UserProfileDashboard: Error loading user profile', error);
      
      // Fallback to localStorage
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.warn(`UserProfileDashboard: Retrying (${this.retryCount}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.loadUserProfile();
      }

      // Try loading from localStorage as last resort
      this.loadFromLocalStorage();
      throw error;
    }
  }

  /**
   * Update localStorage with user data
   */
  private updateLocalStorage(userData: UserProfileData, authUser: any): void {
    try {
      const userInfo = {
        id: authUser.id,
        email: userData.email || authUser.email,
        name: userData.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        avatar: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        picture: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        avatar_url: userData.avatar_url || null,
      };

      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      logger.debug('UserProfileDashboard: Updated localStorage with user data');
    } catch (error) {
      logger.warn('UserProfileDashboard: Failed to update localStorage', error);
    }
  }

  /**
   * Render user profile to UI
   */
  private renderProfile(userData: UserProfileData): void {
    logger.debug('UserProfileDashboard: Rendering profile to UI...');

    // Update name
    const dashboardUserName = document.getElementById('dashboardUserName');
    if (dashboardUserName) {
      dashboardUserName.textContent = userData.full_name || userData.email || 'Unknown User';
      logger.debug('UserProfileDashboard: Updated user name');
    }

    // Update role (not available in database, hide or use default)
    const dashboardUserRole = document.getElementById('dashboardUserRole');
    if (dashboardUserRole) {
      // Role is not in the users table, so hide the role badge or use a default
      // Try to get role from localStorage if available (from other sources)
      const userInfoStr = localStorage.getItem('userInfo');
      let role = 'User';
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          role = userInfo.role || 'User';
        } catch (e) {
          // Use default
        }
      }
      dashboardUserRole.textContent = role;
      logger.debug('UserProfileDashboard: Updated user role');
    }

    // Update avatar
    const dashboardAvatar = document.getElementById('dashboardAvatar');
    if (dashboardAvatar) {
      this.renderAvatar(dashboardAvatar, userData);
    }

    // Update date
    const dashboardTodayDate = document.getElementById('dashboardTodayDate');
    if (dashboardTodayDate) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      dashboardTodayDate.textContent = today.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Show/hide pills based on role
    this.renderInfoPills(userData);
  }

  /**
   * Render avatar with error handling
   */
  private renderAvatar(container: HTMLElement, userData: UserProfileData): void {
    // Try multiple avatar URL fields
    const avatarUrl = userData.avatar_url || 
                     (userData as any).avatar || 
                     (userData as any).picture || 
                     null;

    logger.debug('UserProfileDashboard: Rendering avatar', { 
      hasAvatarUrl: !!avatarUrl,
      avatarUrl: avatarUrl ? avatarUrl.substring(0, 50) + '...' : 'none'
    });

    if (avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
      const img = document.createElement('img');
      // Don't use crossorigin - Google images may not support it and it causes CORS errors
      img.src = avatarUrl;
      img.alt = userData.full_name || 'User';
      img.className = 'w-full h-full rounded-full object-cover';
      img.style.display = 'block';
      img.referrerPolicy = 'no-referrer'; // Help with CORS for external images
      
      img.onerror = () => {
        logger.warn('UserProfileDashboard: Avatar image failed to load, using initials', {
          url: avatarUrl.substring(0, 100)
        });
        this.renderInitials(container, userData.full_name);
      };

      img.onload = () => {
        logger.info('UserProfileDashboard: Avatar image loaded successfully', {
          url: avatarUrl.substring(0, 100)
        });
      };

      container.innerHTML = '';
      container.appendChild(img);
    } else {
      logger.debug('UserProfileDashboard: No avatar URL available, using initials');
      this.renderInitials(container, userData.full_name);
    }
  }

  /**
   * Render initials fallback
   */
  private renderInitials(container: HTMLElement, fullName: string | null): void {
    if (fullName) {
      const initials = fullName
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
      container.innerHTML = `<span class="text-sm font-bold text-white">${initials}</span>`;
    } else {
      container.innerHTML = `<span class="text-sm font-bold text-white">U</span>`;
    }
  }

  /**
   * Render info pills based on user role and data
   * Note: Role and other fields are not in the users table, so pills are hidden
   */
  private renderInfoPills(userData: UserProfileData): void {
    // Since role and other fields are not in the users table,
    // we don't render any pills for now
    logger.debug('UserProfileDashboard: Info pills not available (fields not in database)');
  }

  /**
   * Load additional information (like supervisor name)
   * Note: Supervisor info is not in the users table, so this is disabled
   */
  private async loadAdditionalInfo(userData: UserProfileData): Promise<void> {
    // Supervisor and other additional info fields are not in the users table
    logger.debug('UserProfileDashboard: Additional info not available (fields not in database)');
  }

  /**
   * Load from localStorage as fallback
   */
  private loadFromLocalStorage(): void {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (!userInfoStr) {
        throw new Error('No user info in localStorage');
      }

      const userInfo = JSON.parse(userInfoStr);
      logger.info('UserProfileDashboard: Loading from localStorage fallback');

      const dashboardUserName = document.getElementById('dashboardUserName');
      const dashboardUserRole = document.getElementById('dashboardUserRole');
      const dashboardAvatar = document.getElementById('dashboardAvatar');

      if (dashboardUserName) dashboardUserName.textContent = userInfo.name || userInfo.email || 'Unknown User';
      if (dashboardUserRole) dashboardUserRole.textContent = userInfo.role || 'User';

      if (dashboardAvatar) {
        const avatarUrl = userInfo.avatar || userInfo.picture || userInfo.avatar_url;
        logger.debug('UserProfileDashboard: Loading avatar from localStorage', {
          hasAvatar: !!avatarUrl,
          url: avatarUrl ? avatarUrl.substring(0, 50) + '...' : 'none'
        });
        
        if (avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
          const img = document.createElement('img');
          img.src = avatarUrl;
          img.alt = userInfo.name || 'User';
          img.className = 'w-full h-full rounded-full object-cover';
          img.style.display = 'block';
          img.onerror = () => {
            logger.warn('UserProfileDashboard: localStorage avatar failed to load');
            this.renderInitials(dashboardAvatar, userInfo.name);
          };
          img.onload = () => {
            logger.info('UserProfileDashboard: localStorage avatar loaded successfully');
          };
          dashboardAvatar.innerHTML = '';
          dashboardAvatar.appendChild(img);
        } else {
          logger.debug('UserProfileDashboard: No avatar in localStorage, using initials');
          this.renderInitials(dashboardAvatar, userInfo.name);
        }
      }
    } catch (error) {
      logger.error('UserProfileDashboard: Failed to load from localStorage', error);
    }
  }

  /**
   * Show error state in UI
   */
  private showErrorState(): void {
    const dashboardUserName = document.getElementById('dashboardUserName');
    if (dashboardUserName) {
      dashboardUserName.textContent = 'Error loading profile';
      dashboardUserName.classList.add('text-red-500');
    }
  }

  /**
   * Set component state and log it
   */
  private setState(state: 'loading' | 'loaded' | 'error'): void {
    const previousState = this.state;
    this.state = state;
    
    // Always log state changes
    console.log(`[UserProfileDashboard] STATE CHANGE: ${previousState} → ${state}`);
    logger.info(`State changed from "${previousState}" to "${state}"`);
    
    // Log state-specific information
    if (state === 'loaded') {
      logger.info('UserProfileDashboard: Component is now loaded and displaying user data');
    } else if (state === 'error') {
      logger.error('UserProfileDashboard: Component is in error state');
    } else if (state === 'loading') {
      logger.info('UserProfileDashboard: Component is loading user data');
    }
  }

  /**
   * Get current state
   */
  getState(): 'loading' | 'loaded' | 'error' {
    return this.state;
  }
}

/**
 * Initialize user profile dashboard
 * Reusable function that can be called from anywhere
 */
export async function initUserProfileDashboard(): Promise<UserProfileDashboard | null> {
  logger.info('UserProfileDashboard: Initialization function called');
  
  try {
    const dashboard = new UserProfileDashboard();
    await dashboard.init();
    
    // Make dashboard available globally for debugging
    (window as any).userProfileDashboard = dashboard;
    
    logger.info('UserProfileDashboard: Component initialized successfully');
    return dashboard;
  } catch (error) {
    logger.error('UserProfileDashboard: Failed to initialize component', error);
    return null;
  }
}

/**
 * Auto-initialize when DOM is ready and components are loaded
 */
async function autoInit() {
  // Wait for components to be loaded
  if (!window.componentsLoaded) {
    logger.debug('UserProfileDashboard: Waiting for components to load...');
    await new Promise<void>((resolve) => {
      window.addEventListener('componentsLoaded', () => resolve(), { once: true });
    });
  }
  
  logger.info('UserProfileDashboard: Components loaded, initializing...');
  await initUserProfileDashboard();
  
  // Don't listen for userProfileUpdated events - causes infinite loops
  // Component loads its own data independently on init
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOM already ready, check if components are loaded
  if (window.componentsLoaded) {
    autoInit();
  } else {
    window.addEventListener('componentsLoaded', autoInit, { once: true });
  }
}

export { UserProfileDashboard };

