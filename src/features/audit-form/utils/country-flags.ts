/**
 * Country Flags Utility
 * Maps country names to flag emojis
 */

const COUNTRY_FLAG_MAP: Record<string, string> = {
  'bangladesh': '🇧🇩',
  'india': '🇮🇳',
  'pakistan': '🇵🇰',
  'philippines': '🇵🇭',
  'indonesia': '🇮🇩',
  'sri lanka': '🇱🇰',
  'nepal': '🇳🇵',
  'thailand': '🇹🇭',
  'vietnam': '🇻🇳',
  'malaysia': '🇲🇾',
  'singapore': '🇸🇬',
  'usa': '🇺🇸',
  'united states': '🇺🇸',
  'uk': '🇬🇧',
  'united kingdom': '🇬🇧',
  'canada': '🇨🇦',
  'australia': '🇦🇺',
  'new zealand': '🇳🇿',
  'south africa': '🇿🇦',
  'egypt': '🇪🇬',
  'kenya': '🇰🇪',
  'nigeria': '🇳🇬',
  'ghana': '🇬🇭'
};

/**
 * Get country flag emoji
 * @param countryName - Name of the country
 * @returns Flag emoji or default flag if not found
 */
export function getCountryFlag(countryName: string | null | undefined): string {
  if (!countryName) return '🏳️';
  
  const country = countryName.toLowerCase().trim();
  return COUNTRY_FLAG_MAP[country] || '🏳️';
}

