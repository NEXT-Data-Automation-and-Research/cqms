/**
 * Sidebar User Profile
 * This file shows the user's name, email, and picture
 */

import type { UserInfo } from '../domain/entities.js'
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js'
import { SupabaseClientAdapter } from '../../../infrastructure/database/supabase/supabase-client.adapter.js'
import { SidebarRepository } from '../infrastructure/sidebar-repository.js'
import { sidebarState } from '../application/sidebar-state.js'
import { SidebarService } from '../application/sidebar-service.js'
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js'
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js'

/**
 * This class shows user information on the sidebar
 */
export class SidebarUserProfile {
  private repository: SidebarRepository | null = null
  private service: SidebarService

  constructor() {
    // Don't create database client in constructor - wait until it's needed
    this.service = new SidebarService()
  }

  /**
   * Get or create the repository (lazy initialization)
   * ✅ SECURITY: Verifies authentication before creating repository
   */
  private async getRepository(): Promise<SidebarRepository> {
    if (!this.repository) {
      // ✅ SECURITY: Verify authentication first
      await getAuthenticatedSupabase() // This will throw if not authenticated
      
      // Get base Supabase client (authentication already verified above)
      const { getSupabase } = await import('../../../utils/supabase-init.js')
      const baseClient = getSupabase()
      if (!baseClient) {
        throw new Error('Supabase client not initialized')
      }
      
      // Create adapter from base client (auth already verified)
      const db = new SupabaseClientAdapter(baseClient)
      this.repository = new SidebarRepository(db)
    }
    return this.repository
  }

  /**
   * Show user information on the sidebar
   */
  showUserInfo(user: UserInfo): void {
    if (!user) return

    // Update user name
    const userNameElement = document.querySelector('.user-name')
    if (userNameElement && user.name) {
      userNameElement.textContent = user.name
    }

    // Update user email
    const userEmailElement = document.querySelector('.user-email')
    if (userEmailElement && user.email) {
      userEmailElement.textContent = user.email
    }

    // Update user avatar/profile picture
    this.updateUserPicture(user)
    
    // Add role and department info if available
    this.updateUserRoleAndDepartment(user)
  }

  /**
   * Update the picture on screen
   */
  private updateUserPicture(user: UserInfo): void {
    const userAvatarElement = document.querySelector('.user-avatar')
    if (!userAvatarElement) return

    // Clear existing content
    safeSetHTML(userAvatarElement as HTMLElement, '')

    // Check if we have a profile picture
    const profilePicture = user.avatar || user.picture || user.avatar_url
    
    if (profilePicture && profilePicture.trim() !== '' && profilePicture !== 'null' && profilePicture !== 'undefined') {
      // Create image element
      const img = document.createElement('img')
      img.src = profilePicture
      img.alt = user.name || 'Profile Picture'
      img.className = 'profile-picture'
      img.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;'
      
      // Handle image loading errors - fallback to initials
      img.onerror = () => {
        logInfo('[Sidebar] Avatar image failed to load, using initials', { profilePicture: profilePicture.substring(0, 50) })
        this.showUserInitials(user.name, userAvatarElement)
      }
      
      // Handle successful image load
      img.onload = () => {
        logInfo('[Sidebar] Avatar image loaded successfully')
      }
      
      userAvatarElement.appendChild(img)
    } else if (user.name) {
      // If no picture, create initials from name
      this.showUserInitials(user.name, userAvatarElement)
    } else {
      // Fallback to default icon
      this.showDefaultIcon(userAvatarElement)
    }
  }

  /**
   * Show user initials instead of picture
   */
  private showUserInitials(name: string, container: Element): void {
    const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    safeSetHTML(container as HTMLElement, `<div class="profile-initials">${escapeHtml(initials)}</div>`)
  }

  /**
   * Show default user icon
   */
  private showDefaultIcon(container: Element): void {
    safeSetHTML(container as HTMLElement, `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    `)
  }

  /**
   * Update designation and department info
   */
  private updateUserRoleAndDepartment(user: UserInfo): void {
    // Helper to check if value is valid
    const hasValue = (val: any): boolean => {
      return val !== null && val !== undefined && val !== '' && String(val).trim() !== ''
    }

    logInfo('[Sidebar] Updating designation and department', {
      hasDesignation: hasValue(user.designation),
      designation: user.designation,
      hasDepartment: hasValue(user.department),
      department: user.department
    })

    // Update designation
    const designationElement = document.querySelector('.user-designation')
    if (designationElement) {
      if (hasValue(user.designation)) {
        const designationText = String(user.designation).trim()
        designationElement.textContent = designationText
        ;(designationElement as HTMLElement).style.display = 'block'
        logInfo('[Sidebar] Designation displayed:', designationText)
      } else {
        ;(designationElement as HTMLElement).style.display = 'none'
      }
    } else {
      logWarn('[Sidebar] Designation element not found in DOM')
    }

    // Update department
    const departmentElement = document.querySelector('.user-department')
    if (departmentElement) {
      if (hasValue(user.department)) {
        const departmentText = String(user.department).trim()
        departmentElement.textContent = departmentText
        ;(departmentElement as HTMLElement).style.display = 'block'
        logInfo('[Sidebar] Department displayed:', departmentText)
      } else {
        ;(departmentElement as HTMLElement).style.display = 'none'
      }
    } else {
      logWarn('[Sidebar] Department element not found in DOM')
    }
  }

  /**
   * Load user info from storage (fast)
   */
  loadUserInfoFromStorage(): UserInfo | null {
    return sidebarState.loadUserInfo()
  }

  /**
   * Load user info from database (slow but up-to-date)
   */
  async loadUserInfoFromDatabase(isBackgroundRefresh: boolean = false): Promise<UserInfo | null> {
    try {
      if (!isBackgroundRefresh) {
        logInfo('[Sidebar] Loading user profile from database...')
      }
      
      // Wait for supabase client to be available
      if (!window.supabaseClient) {
        try {
          // @ts-ignore - Dynamic import at runtime
          const secureWindowModule = await import('/js/utils/secure-window-supabase.js')
          if (secureWindowModule?.initSecureWindowSupabase) {
            await secureWindowModule.initSecureWindowSupabase()
          }
        } catch (importError) {
          // Module might not exist, continue anyway
          logWarn('Could not import secure-window-supabase:', importError)
        }
      }

      if (!window.supabaseClient) {
        throw new Error('Database connection not available')
      }

      // Get current user from auth
      const { data: { user: authUser }, error: authError } = await window.supabaseClient.auth.getUser()
      if (authError || !authUser) {
        throw new Error('User not authenticated')
      }

      if (!isBackgroundRefresh) {
        logInfo('[Sidebar] User authenticated, fetching from database...', { userId: authUser.id })
      }

      // Get user info from database
      let userInfo: UserInfo | null = null
      try {
        userInfo = await (await this.getRepository()).getUserInfoFromDatabase(authUser.id)
      } catch (dbError: any) {
        // If database query fails, fall back to auth user data
        logWarn('[Sidebar] Database query failed, falling back to auth user data:', {
          error: dbError?.message || String(dbError),
          code: dbError?.code
        })
        
        // Create basic UserInfo from auth user data
        userInfo = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          picture: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          avatar_url: authUser.user_metadata?.avatar_url || null,
          role: authUser.user_metadata?.role || undefined,
          department: undefined,
          designation: undefined,
        }
      }
      
      if (!userInfo) {
        logWarn('[Sidebar] No user data returned from database')
        return null
      }

      if (!isBackgroundRefresh) {
        logInfo('[Sidebar] User data loaded from database', {
          email: userInfo.email,
          full_name: userInfo.name,
          has_avatar: !!userInfo.avatar_url,
          avatar_url: userInfo.avatar_url ? userInfo.avatar_url.substring(0, 50) + '...' : 'none'
        })
      }

      // Check if data actually changed (for background refresh)
      const cachedUser = sidebarState.loadUserInfo()
      const dataChanged = this.service.didUserDataChange(cachedUser, userInfo)
      
      if (isBackgroundRefresh && !dataChanged) {
        // Data hasn't changed, just update timestamp and return
        localStorage.setItem('userProfileLastFetch', Date.now().toString())
        return userInfo
      }
      
      // Save to storage
      sidebarState.saveUserInfo(userInfo)
      
      if (!isBackgroundRefresh) {
        logInfo('[Sidebar] Updated localStorage with user profile')
      }
      
      // Update UI
      this.showUserInfo(userInfo)
      
      // Dispatch event to notify sidebar that user info has changed
      // This triggers sidebar menu regeneration with correct role-based filtering
      if (dataChanged) {
        logInfo('[Sidebar] User data changed, dispatching userInfoUpdated event', {
          oldRole: cachedUser?.role,
          newRole: userInfo.role,
          roleChanged: cachedUser?.role !== userInfo.role
        })
        document.dispatchEvent(new CustomEvent('userInfoUpdated', {
          detail: { userInfo, roleChanged: cachedUser?.role !== userInfo.role }
        }))
      }
      
      if (!isBackgroundRefresh) {
        logInfo('[Sidebar] UI updated with user profile')
      } else {
        logInfo('[Sidebar] User profile refreshed in background')
      }

      return userInfo
    } catch (error) {
      logError('[Sidebar] Error loading user profile from database:', error)
      throw error
    }
  }

  /**
   * Initialize user profile - load from cache first, then refresh from database
   */
  async initializeUserProfile(): Promise<void> {
    // First, load from storage immediately (fast, no loading flicker)
    const cachedUserInfo = this.loadUserInfoFromStorage()
    if (cachedUserInfo && cachedUserInfo.email && cachedUserInfo.name) {
      // Update UI immediately with cached data
      this.showUserInfo(cachedUserInfo)
      logInfo('[Sidebar] User profile loaded from cache (localStorage)')
      
      // Refresh from database in background (silently, without UI update if same)
      // Only fetch if we haven't fetched recently (within last 5 minutes)
      if (sidebarState.shouldRefreshUserProfile()) {
        // Fetch in background without blocking or showing loading state
        this.loadUserInfoFromDatabase(true).catch(error => {
          // Silently fail - we already have cached data displayed
          logInfo('[Sidebar] Background profile refresh failed (using cached data)', { error: error.message })
        })
      }
    } else {
      // No cached data, must fetch from database
      try {
        await this.loadUserInfoFromDatabase(false)
      } catch (error) {
        logWarn('Failed to load user profile from database:', error)
        // If we have partial data, still show it
        if (cachedUserInfo) {
          this.showUserInfo(cachedUserInfo)
        }
      }
    }
  }

  /**
   * Set up click handler for user profile
   */
  setupUserProfileClickHandler(): void {
    const userProfile = document.querySelector('.user-profile')
    if (!userProfile) return

    userProfile.addEventListener('click', () => {
      window.location.href = '/profile.html'
    })

    // Also handle keyboard navigation
    userProfile.addEventListener('keydown', (event: Event) => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        event.preventDefault()
        window.location.href = '/profile.html'
      }
    })
  }

  /**
   * Set up logout functionality
   */
  setupLogoutHandler(): void {
    const initLogoutWithDelay = () => {
      const logoutBtn = document.querySelector('.logout-link')
      if (!logoutBtn) {
        return
      }

      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        
        // Show confirmation dialog
        let confirmed = false
        if ((window as any).confirmationDialog) {
          confirmed = await (window as any).confirmationDialog.show({
            title: 'Logout Confirmation',
            message: 'Are you sure you want to logout? You will need to sign in again to access your account.',
            confirmText: 'Logout',
            cancelText: 'Cancel',
            type: 'error',
          })
        } else {
          // Fallback to basic confirm if dialog is not available
          confirmed = confirm('Are you sure you want to logout?')
        }

        if (confirmed) {
          try {
            // Use Supabase signOut function from auth utilities
            try {
              // @ts-ignore - Dynamic import at runtime
              const authModule = await import('/js/utils/auth.js')
              if (authModule?.signOut) {
                await authModule.signOut()
              } else {
                throw new Error('signOut function not found')
              }
            } catch (importError) {
              // Fallback: clear localStorage and redirect even if signOut fails
              logError('Error importing auth module:', importError)
              localStorage.removeItem('userInfo')
              localStorage.removeItem('supabase.auth.token')
              window.location.href = '/src/auth/presentation/auth-page.html'
            }
            // No need to redirect here - signOut() handles it
          } catch (error) {
            logError('Error during logout:', error)
            // Fallback: clear localStorage and redirect even if signOut fails
            localStorage.removeItem('userInfo')
            localStorage.removeItem('supabase.auth.token')
            window.location.href = '/src/auth/presentation/auth-page.html'
          }
        }
      })
    }

    // Try immediately, then with a delay if not available
    if (document.querySelector('.logout-link')) {
      initLogoutWithDelay()
    } else {
      // Wait a bit for the DOM to be ready
      setTimeout(initLogoutWithDelay, 100)
    }
  }
}

