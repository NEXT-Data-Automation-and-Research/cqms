/**
 * Pagination Cursor Parser
 * Handles parsing pagination cursors from API responses
 * Extracted from progressive-conversation-fetcher.ts to comply with 250-line limit
 */

import { logWarn } from '../../../../utils/logging-helper.js';

export class PaginationCursorParser {
  /**
   * Extract next cursor from pagination response
   */
  extractNextCursor(data: any): string | null {
    if (!data.pages || !data.pages.next) {
      return null;
    }
    
    const next = data.pages.next;
    
    if (typeof next === 'string') {
      return this.parseStringCursor(next);
    } else if (next && typeof next === 'object') {
      return this.parseObjectCursor(next);
    }
    
    return null;
  }

  /**
   * Parse cursor from string URL
   */
  private parseStringCursor(next: string): string | null {
    try {
      if (next.includes('?')) {
        const urlParts = next.split('?');
        const urlParams = new URLSearchParams(urlParts[1]);
        const cursor = urlParams.get('starting_after');
        return cursor && cursor.trim().length > 0 ? cursor.trim() : null;
      } else {
        // If it's just a cursor string, use it directly
        return next.trim().length > 0 ? next.trim() : null;
      }
    } catch (e) {
      logWarn('Error parsing next URL:', e);
      return null;
    }
  }

  /**
   * Parse cursor from object
   */
  private parseObjectCursor(next: any): string | null {
    const cursor = next.starting_after || next.cursor || null;
    return cursor && typeof cursor === 'string' && cursor.trim().length > 0 ? cursor.trim() : null;
  }

  /**
   * Validate cursor value
   */
  validateCursor(cursor: string | null): boolean {
    return cursor !== null && typeof cursor === 'string' && cursor.trim().length > 0;
  }
}

// Singleton instance
let paginationCursorParserInstance: PaginationCursorParser | null = null;

/**
 * Get pagination cursor parser instance
 */
export function getPaginationCursorParser(): PaginationCursorParser {
  if (!paginationCursorParserInstance) {
    paginationCursorParserInstance = new PaginationCursorParser();
  }
  return paginationCursorParserInstance;
}

