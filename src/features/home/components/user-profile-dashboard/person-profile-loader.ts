/**
 * Person Profile Loader
 * 
 * Enhances the user profile dashboard "person card" with data
 * from the secure Supabase `people` table while respecting RLS.
 * 
 * This module:
 * - Uses `getAuthenticatedSupabase()` so all DB calls are authenticated (security compliant)
 * - Reads the current Supabase auth user
 * - Loads their matching row from `people` (RLS-protected)
 * - Populates the compact info pills on the card
 * - NOTE: `people` table does NOT have an 'id' column - uses 'email' as identifier
 */

import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { PEOPLE_PROFILE_FIELDS } from '../../../../core/constants/field-whitelists.js';
import { createLogger } from '../../../../utils/logger.js';
import { logInfo } from '../../../../utils/logging-helper.js';

// Use a flexible shape because the `people` table schema in cqms-staging
// differs from local assumptions (some columns like full_name may not exist).
// We only *read* fields that are present at runtime.
type PersonProfile = Record<string, any>;

declare global {
  interface Window {
    componentsLoaded?: boolean;
  }
}

// Use proper logger with log levels
const personLogger = createLogger('PersonProfile');

let profileRetryCount = 0;
const maxProfileRetries = 5;

/**
 * Fetch supervisor name from people/users table using supervisor email
 */
async function fetchSupervisorName(supervisorEmail: string | null | undefined): Promise<string | null> {
  if (!supervisorEmail) {
    logInfo('[PersonProfile] fetchSupervisorName: No email provided');
    return null;
  }

  logInfo('[PersonProfile] fetchSupervisorName: Starting fetch', { email: supervisorEmail });
  
  try {
    // ✅ SECURITY: Use authenticated Supabase helper
    const supabase = await getAuthenticatedSupabase();
    
    logInfo('[PersonProfile] fetchSupervisorName: Supabase client obtained, querying people table...');
    personLogger.debug('Fetching supervisor name', { email: supervisorEmail });
    
    // Try people table first (preferred)
    // Column name is 'name', not 'full_name'
    // ✅ SECURITY: Use field whitelist - only select name field
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('name')
      .eq('email', supervisorEmail)
      .maybeSingle();
    
    logInfo('[PersonProfile] fetchSupervisorName: People table query result', {
      hasData: !!peopleData,
      hasError: !!peopleError,
      error: peopleError?.message,
      name: peopleData?.name
    });
    
    if (peopleError) {
      personLogger.warn('Error querying people table for supervisor', { 
        email: supervisorEmail, 
        error: peopleError.message,
        code: peopleError.code,
        details: peopleError.details,
        hint: peopleError.hint
      });
      
      // Check if it's an RLS error
      if (peopleError.code === '42501' || peopleError.message?.includes('permission denied') || peopleError.message?.includes('policy')) {
        personLogger.error('RLS POLICY BLOCKING ACCESS to people table!', {
          email: supervisorEmail,
          error: peopleError.message,
          hint: 'Check if migration 005_add_permissive_users_read_policy.sql was applied correctly'
        });
      }
    }
    
    if (!peopleError && peopleData) {
      const supervisorName = peopleData.name;
      if (supervisorName) {
        personLogger.info('Found supervisor name in people table', { email: supervisorEmail, name: supervisorName });
        return supervisorName;
      } else {
        personLogger.warn('Supervisor record found in people table but name field is empty', { 
          email: supervisorEmail,
          data: peopleData
        });
      }
    }
    
    // Fallback to users table if not found in people table
    personLogger.debug('Trying users table as fallback', { email: supervisorEmail });
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('name, full_name')
      .eq('email', supervisorEmail)
      .maybeSingle();
    
    personLogger.debug('Users table query result', {
      hasData: !!usersData,
      hasError: !!usersError,
      error: usersError?.message,
      errorCode: usersError?.code,
      name: usersData?.name,
      full_name: usersData?.full_name
    });
    
    if (usersError) {
      personLogger.warn('Error querying users table for supervisor', { 
        email: supervisorEmail, 
        error: usersError.message,
        code: usersError.code
      });
    }
    
    if (!usersError && usersData) {
      // Users table might have full_name or name
      const supervisorName = usersData.name || usersData.full_name;
      if (supervisorName) {
        logInfo('[PersonProfile] ✅✅✅ FOUND SUPERVISOR NAME in users table', { name: supervisorName });
        personLogger.info('✅ Found supervisor name in users table', { email: supervisorEmail, name: supervisorName });
        return supervisorName;
      }
    }
    
    logInfo('[PersonProfile] ❌❌❌ SUPERVISOR NAME NOT FOUND in either table', { 
      email: supervisorEmail,
      peopleError: peopleError?.message,
      usersError: usersError?.message
    });
    personLogger.warn('❌ Supervisor name not found in either table', { 
      email: supervisorEmail,
      peopleError: peopleError?.message,
      usersError: usersError?.message
    });
    return null;
  } catch (error) {
    personLogger.error('Exception fetching supervisor name', { email: supervisorEmail, error });
    return null;
  }
}

/**
 * Enrich profile object with supervisor name
 */
async function enrichProfileWithSupervisorName(profile: PersonProfile): Promise<PersonProfile> {
  personLogger.debug('Enrichment function called', {
    email: profile.email,
    team_supervisor: profile.team_supervisor,
    supervisor_name: profile.supervisor_name,
    allKeys: Object.keys(profile)
  });
  
  // Check all possible supervisor email fields
  const supervisorEmail = profile.team_supervisor ?? profile.supervisor_email ?? profile.manager_email ?? profile.manager ?? null;
  
  personLogger.debug('Extracted supervisor email', { 
    supervisorEmail: supervisorEmail || 'NOT FOUND',
    hasTeamSupervisor: !!profile.team_supervisor,
    hasSupervisorEmail: !!profile.supervisor_email,
    hasManagerEmail: !!profile.manager_email
  });
  
  if (supervisorEmail) {
    personLogger.info('Found supervisor email, fetching name', { email: supervisorEmail });
    const supervisorName = await fetchSupervisorName(supervisorEmail);
    if (supervisorName) {
      // Add supervisor name to profile object
      profile.supervisor_name = supervisorName;
      personLogger.info('Successfully enriched profile with supervisor name', { 
        email: supervisorEmail, 
        name: supervisorName 
      });
    } else {
      // If name not found, keep the email but mark it as not found
      profile.supervisor_name = null;
      profile.supervisor_email = supervisorEmail; // Keep email for reference
      personLogger.warn('Supervisor name not found, keeping email', { email: supervisorEmail });
    }
  } else {
    personLogger.warn('No supervisor email found in profile', { 
      profileKeys: Object.keys(profile),
      hasTeamSupervisor: !!profile.team_supervisor,
      hasSupervisorEmail: !!profile.supervisor_email
    });
  }
  
  return profile;
}

async function fetchPersonProfile(): Promise<PersonProfile | null> {
  try {
    // ✅ SECURITY: Use authenticated Supabase helper
    const supabase = await getAuthenticatedSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      personLogger.warn('Authenticated user not available for person profile', {
        error: authError?.message,
      });
      return null;
    }

    // Query the RLS-protected `people` table for this auth user.
    // Use email as the primary lookup key so roles are tied to email identity.
    // ✅ SECURITY: Use field whitelist - NOTE: people table does NOT have 'id' column
    const { data, error } = await supabase
      .from('people')
      .select(PEOPLE_PROFILE_FIELDS)
      .eq('email', user.email)
      .maybeSingle();

    if (error) {
      personLogger.error('Error loading person profile from people table', {
        code: (error as any).code,
        message: (error as any).message,
      });
      return null;
    }

    if (!data) {
      personLogger.warn('No matching row found in people table for user', {
        userId: user.id,
        email: user.email,
      });
      return null;
    }

    personLogger.info('Loaded person profile from people table', { 
      email: data.email,
      teamSupervisor: data.team_supervisor || 'NOT FOUND'
    });

    // CRITICAL: Enrich profile with supervisor name before returning
    // This ensures supervisor_name is populated in the profile object
    // The supervisor email is in team_supervisor field, we need to fetch the name
    personLogger.info('Starting profile enrichment', {
      team_supervisor: data.team_supervisor,
      hasTeamSupervisor: !!data.team_supervisor,
      dataKeys: Object.keys(data)
    });
    
    try {
      const enrichedProfile = await enrichProfileWithSupervisorName(data as PersonProfile);
      
      personLogger.info('Profile enrichment completed', { 
        hasSupervisorName: !!enrichedProfile.supervisor_name,
        supervisorName: enrichedProfile.supervisor_name,
        supervisorEmail: enrichedProfile.team_supervisor,
        teamSupervisor: enrichedProfile.team_supervisor
      });
      
      return enrichedProfile;
    } catch (enrichError) {
      personLogger.error('Error enriching profile', {
        error: enrichError,
        message: enrichError instanceof Error ? enrichError.message : String(enrichError),
        stack: enrichError instanceof Error ? enrichError.stack : undefined
      });
      // Return profile even if enrichment fails
      return data as PersonProfile;
    }
  } catch (error) {
    personLogger.error('Unexpected error fetching person profile', error);
    return null;
  }
}

function setPillValue(
  pillId: string,
  valueElementId: string,
  value: string | null | undefined
): void {
  const pill = document.getElementById(pillId);
  const valueEl = document.getElementById(valueElementId);

  if (!pill || !valueEl) return;

  // Check if value is valid (not null, undefined, empty string, or the string "null")
  const stringValue = String(value || '').trim().toLowerCase();
  const isValid = value !== null && 
                  value !== undefined && 
                  stringValue !== '' && 
                  stringValue !== 'null' && 
                  stringValue !== 'undefined';

  if (isValid) {
    pill.classList.remove('hidden');
    valueEl.textContent = String(value).trim();
  } else {
    pill.classList.add('hidden');
    valueEl.textContent = '-';
  }
}

async function applyPersonProfileToCard(profile: PersonProfile): Promise<void> {
  personLogger.debug('Applying person profile to dashboard card', profile);

  // Update main name/role if available from `people`
  // Column name is 'name', not 'full_name' in people table
  const nameEl = document.getElementById('dashboardUserName');
  const fullName = (profile.name as string) || (profile.full_name as string);
  if (nameEl && fullName) {
    nameEl.textContent = fullName;
  }

  const roleEl = document.getElementById('dashboardUserRole');
  if (roleEl) {
    // Try multiple possible role fields from `people`.
    // If we don't know the exact column name, fall back to any field containing "role".
    let possibleRole =
      (profile.role as string) ||
      (profile.user_role as string) ||
      (profile.primary_role as string);

    if (!possibleRole) {
      const roleKey = Object.keys(profile).find((key) =>
        key.toLowerCase().includes('role')
      );
      if (roleKey) {
        possibleRole = String(profile[roleKey] ?? '');
        personLogger.debug('Derived role from generic people column', {
          roleKey,
          roleValue: possibleRole,
        });
      }
    }

    if (possibleRole) {
      roleEl.textContent = possibleRole;
    } else {
      // Fallback: keep whatever role was already set from localStorage/users table
      // (DataService / UserProfileDashboard already wrote a role there earlier)
      personLogger.debug('No explicit role field found in people row; keeping existing role badge');
    }
  }

  // Employee ID pill
  setPillValue('pillEmployeeId', 'displayEmployeeId', profile.employee_id ?? null);

  // Channel pill (agent / employee channel)
  setPillValue('pillChannel', 'displayChannel', profile.channel ?? null);

  // Team pill
  setPillValue('pillTeam', 'displayTeam', profile.team ?? null);

  // Supervisor pill – use supervisor name from enriched profile
  // The profile object should already have supervisor_name populated (not email)
  const supervisorName = profile.supervisor_name ?? null;
  const supervisorEmail = profile.team_supervisor ?? profile.supervisor_email ?? null;
  
  personLogger.debug('Applying supervisor to card', { 
    supervisorName, 
    supervisorEmail,
    hasSupervisorName: !!supervisorName 
  });
  
  // Display supervisor name if available (from enriched profile)
  // CRITICAL: Never display email - only display name
  if (supervisorName && 
      supervisorName.trim() !== '' && 
      supervisorName.toLowerCase() !== 'null' &&
      !supervisorName.includes('@')) { // Extra safeguard: never display email
    setPillValue('pillSupervisor', 'displaySupervisor', supervisorName);
    personLogger.info('Set supervisor name from enriched profile', { name: supervisorName });
  } else if (supervisorEmail) {
    // If we have email but no name, try to fetch it one more time
    personLogger.warn('Supervisor name not in enriched profile, fetching now', { email: supervisorEmail });
    try {
      const fetchedName = await fetchSupervisorName(supervisorEmail);
      if (fetchedName && !fetchedName.includes('@')) { // Extra safeguard: never display email
        setPillValue('pillSupervisor', 'displaySupervisor', fetchedName);
        personLogger.info('Fetched and set supervisor name', { name: fetchedName });
      } else {
        // Hide pill if supervisor name not found (don't show email)
        const pill = document.getElementById('pillSupervisor');
        if (pill) pill.classList.add('hidden');
        personLogger.warn('Supervisor name not found, hiding pill', { email: supervisorEmail });
      }
    } catch (error) {
      personLogger.error('Error fetching supervisor name in applyPersonProfileToCard', error);
      const pill = document.getElementById('pillSupervisor');
      if (pill) pill.classList.add('hidden');
    }
  } else {
    // No supervisor info, hide the pill
    const pill = document.getElementById('pillSupervisor');
    if (pill) pill.classList.add('hidden');
    personLogger.debug('No supervisor info, hiding pill');
  }

  // Intercom alias pill
  setPillValue(
    'pillIntercomAlias',
    'displayIntercomAlias',
    profile.intercom_admin_alias ?? null
  );

  // Quality mentor pill (boolean flag)
  const qualityMentorPill = document.getElementById('pillQualityMentor');
  if (qualityMentorPill) {
    const isMentor = Boolean(profile.quality_mentor);
    if (isMentor) {
      qualityMentorPill.classList.remove('hidden');
    } else {
      qualityMentorPill.classList.add('hidden');
    }
  }
}

async function initPersonProfileCard(): Promise<void> {
  try {
    // Ensure the dashboard component exists before trying to hydrate it
    const container = document.getElementById('userProfileDashboard');
    if (!container) {
      personLogger.debug('User profile dashboard container not found, skipping person profile init');
      return;
    }

    personLogger.info('Fetching profile...');
    const profile = await fetchPersonProfile();
    if (!profile) {
      personLogger.warn('Profile not found');
      if (profileRetryCount < maxProfileRetries) {
        profileRetryCount += 1;
        personLogger.warn('Person profile not available yet, retrying...', {
          attempt: profileRetryCount,
          max: maxProfileRetries,
        });
        setTimeout(() => {
          void initPersonProfileCard();
        }, 1000);
      } else {
        personLogger.warn('Max retries reached for person profile; giving up for this session');
      }
      return;
    }

    logInfo('[PersonProfile] ✅ Profile fetched, applying to card...', {
      hasTeamSupervisor: !!profile.team_supervisor,
      teamSupervisor: profile.team_supervisor,
      hasSupervisorName: !!profile.supervisor_name,
      supervisorName: profile.supervisor_name
    });
    await applyPersonProfileToCard(profile);
    logInfo('[PersonProfile] ✅ Profile applied to card');
  } catch (error) {
    personLogger.error('Failed to initialize person profile card', error);
  }
}

function scheduleInit(): void {
  if (window.componentsLoaded) {
    void initPersonProfileCard();
  } else {
    window.addEventListener(
      'componentsLoaded',
      () => {
        void initPersonProfileCard();
      },
      { once: true }
    );
  }
}

// Auto-init once DOM is ready and components are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    scheduleInit();
  });
} else {
  scheduleInit();
}

export { initPersonProfileCard };


