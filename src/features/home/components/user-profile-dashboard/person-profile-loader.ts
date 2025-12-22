/**
 * Person Profile Loader
 * 
 * Enhances the user profile dashboard "person card" with data
 * from the secure Supabase `people` table while respecting RLS.
 * 
 * This module:
 * - Uses `getSecureSupabase(true)` so all DB calls are authenticated
 * - Reads the current Supabase auth user
 * - Loads their matching row from `people` (RLS-protected)
 * - Populates the compact info pills on the card
 */

import { getSecureSupabase } from '../../../../utils/secure-supabase.js';

// Use a flexible shape because the `people` table schema in cqms-staging
// differs from local assumptions (some columns like full_name may not exist).
// We only *read* fields that are present at runtime.
type PersonProfile = Record<string, any>;

declare global {
  interface Window {
    componentsLoaded?: boolean;
  }
}

const personLogger = {
  info: (...args: unknown[]) => console.info('[PersonProfile]', ...args),
  warn: (...args: unknown[]) => console.warn('[PersonProfile]', ...args),
  error: (...args: unknown[]) => console.error('[PersonProfile]', ...args),
  debug: (...args: unknown[]) => console.debug('[PersonProfile]', ...args),
};

let profileRetryCount = 0;
const maxProfileRetries = 5;

async function fetchPersonProfile(): Promise<PersonProfile | null> {
  try {
    const supabase = await getSecureSupabase(true); // require authenticated user

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
    // Select "*" so we don't hardcode column names that may not exist in cqms-staging.
    const { data, error } = await supabase
      .from('people')
      .select('*')
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

    personLogger.info('Loaded person profile from people table', data as PersonProfile);

    return data as PersonProfile;
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

  if (value && String(value).trim() !== '') {
    pill.classList.remove('hidden');
    valueEl.textContent = String(value);
  } else {
    pill.classList.add('hidden');
    valueEl.textContent = '-';
  }
}

function applyPersonProfileToCard(profile: PersonProfile): void {
  personLogger.debug('Applying person profile to dashboard card', profile);

  // Update main name/role if available from `people`
  const nameEl = document.getElementById('dashboardUserName');
  const fullName = (profile.full_name as string) || (profile.name as string);
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

  // Supervisor pill – support both `supervisor_name` and `team_supervisor`
  const supervisor =
    profile.supervisor_name ??
    profile.team_supervisor ??
    null;
  setPillValue('pillSupervisor', 'displaySupervisor', supervisor);

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

    const profile = await fetchPersonProfile();
    if (!profile) {
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

    applyPersonProfileToCard(profile);
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


