/**
 * Color Whitelists
 * Explicit color definitions for UI components to ensure consistency and prevent unauthorized changes
 * 
 * NEVER use arbitrary colors - always use these whitelisted colors
 */

/**
 * Profile Page Color Whitelist
 * Colors allowed for user profile page components
 */
export const PROFILE_PAGE_COLORS = {
  // Card Colors - Normal solid cards (no glass morphism)
  CARD_BACKGROUND: '#ffffff',
  CARD_BORDER: '#d1d5db',        // Slightly darker border for better visibility
  CARD_SHADOW: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  
  // Text Colors - Using darker colors for better visibility
  TEXT_PRIMARY: '#374151',        // Main text (dark gray)
  TEXT_SECONDARY: '#374151',      // Secondary text (dark gray for better visibility)
  TEXT_LABEL: '#374151',          // Labels (dark gray for better visibility)
  TEXT_VALUE: '#111827',          // Values (very dark gray/black - almost black)
  TEXT_HEADING: '#1f2937',        // Headings (very dark gray/black)
  
  // Section Title Colors
  SECTION_TITLE: '#1A733E',       // Section titles (green, matching user management)
  SECTION_BORDER: '#1A733E',      // Section title border (green)
  
  // Status Badge Colors
  STATUS_ACTIVE_BG: 'rgba(16, 185, 129, 0.1)',      // Active badge background
  STATUS_ACTIVE_BORDER: 'rgba(16, 185, 129, 0.3)',  // Active badge border
  STATUS_ACTIVE_TEXT: '#10b981',                     // Active badge text (green)
  STATUS_ACTIVE_DOT: '#10b981',                      // Active indicator dot (green)
  
  STATUS_INACTIVE_BG: 'rgba(107, 114, 128, 0.1)',    // Inactive badge background
  STATUS_INACTIVE_BORDER: 'rgba(107, 114, 128, 0.3)', // Inactive badge border
  STATUS_INACTIVE_TEXT: '#9ca3af',                   // Inactive badge text (gray)
  STATUS_INACTIVE_DOT: '#6b7280',                    // Inactive indicator dot (gray)
  
  // Role Badge Colors
  ROLE_BADGE_BG: 'rgba(26, 115, 62, 0.1)',          // Role badge background
  ROLE_BADGE_BORDER: 'rgba(26, 115, 62, 0.3)',      // Role badge border
  ROLE_BADGE_TEXT: '#1a733e',                        // Role badge text (green)
  
  // Avatar Colors
  AVATAR_BG_START: '#1a733e',                        // Avatar gradient start (green)
  AVATAR_BG_END: '#0d5e3a',                          // Avatar gradient end (dark green)
  AVATAR_TEXT: '#ffffff',                            // Avatar text (white)
  AVATAR_BORDER: 'rgba(26, 115, 62, 0.3)',          // Avatar border
  
  // Button Colors
  BUTTON_BACK_BG: 'transparent',                     // Back button background
  BUTTON_BACK_BORDER: '#d1d5db',                     // Back button border
  BUTTON_BACK_TEXT: '#374151',                       // Back button text
  BUTTON_BACK_HOVER_BG: '#f9fafb',                   // Back button hover background
  BUTTON_BACK_HOVER_BORDER: '#1a733e',              // Back button hover border
  
  BUTTON_PRIMARY_BG: '#1a733e',                      // Primary button background (green)
  BUTTON_PRIMARY_TEXT: '#ffffff',                    // Primary button text (white)
  BUTTON_PRIMARY_HOVER_BG: '#0d5e3a',                // Primary button hover background (dark green)
  
  // Error/NotFound Colors
  ERROR_ICON: '#9ca3af',                             // Error icon color (gray)
  ERROR_TEXT: '#374151',                             // Error text (dark gray)
  ERROR_HEADING: '#1f2937',                          // Error heading (very dark gray)
  
  // Icon Colors
  ICON_PRIMARY: '#1A733E',                           // Primary icon color (green)
  ICON_SECONDARY: '#1a733e',                         // Secondary icon color (green)
} as const;

/**
 * Profile Page Style Changes Whitelist
 * Allowed style properties and values for profile page components
 */
export const PROFILE_PAGE_STYLES = {
  // Card Styles - Normal solid cards (no glass morphism)
  CARD: {
    background: PROFILE_PAGE_COLORS.CARD_BACKGROUND,
    borderRadius: '0.5rem',
    padding: '1.125rem',
    border: `0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}`,
    boxShadow: PROFILE_PAGE_COLORS.CARD_SHADOW,
  },
  
  // Detail Section Card Styles - Normal solid cards
  DETAIL_SECTION_CARD: {
    background: PROFILE_PAGE_COLORS.CARD_BACKGROUND,
    borderRadius: '0.375rem',
    padding: '1.25rem',
    border: `0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}`,
    boxShadow: PROFILE_PAGE_COLORS.CARD_SHADOW,
  },
  
  // Text Styles - Enhanced for better visibility
  TEXT_PRIMARY: {
    color: PROFILE_PAGE_COLORS.TEXT_VALUE,
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  
  TEXT_HEADING: {
    color: PROFILE_PAGE_COLORS.TEXT_HEADING,
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  
  TEXT_LABEL: {
    color: PROFILE_PAGE_COLORS.TEXT_LABEL,
    fontSize: '0.5625rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  // Section Title Styles - Matching user management
  SECTION_TITLE: {
    color: PROFILE_PAGE_COLORS.SECTION_TITLE,
    fontSize: '0.875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingBottom: '0.5rem',
    borderBottom: `0.125rem solid ${PROFILE_PAGE_COLORS.SECTION_BORDER}`,
  },
} as const;

/**
 * Get color value from whitelist
 * @param colorKey - Key from PROFILE_PAGE_COLORS
 * @returns Color value or fallback
 */
export function getProfileColor(colorKey: keyof typeof PROFILE_PAGE_COLORS): string {
  return PROFILE_PAGE_COLORS[colorKey] || '#000000';
}

/**
 * Validate color against whitelist
 * @param color - Color value to validate
 * @returns True if color is in whitelist
 */
export function isValidProfileColor(color: string): boolean {
  const allowedColors = Object.values(PROFILE_PAGE_COLORS) as readonly string[];
  const normalizedColor = color.toLowerCase();
  return allowedColors.some(allowedColor => allowedColor.toLowerCase() === normalizedColor);
}

