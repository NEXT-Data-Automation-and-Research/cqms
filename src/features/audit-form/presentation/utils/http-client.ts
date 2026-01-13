/**
 * HTTP Client with Retry Logic
 * Handles HTTP requests with retry and timeout logic
 * Migrated from audit-form.html fetchWithRetry()
 */

import { logInfo, logWarn, logError } from '../../../../utils/logging-helper.js';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class HttpClient {
  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(
    url: string,
    options: FetchOptions = {},
    maxRetries: number = 3,
    retryDelay: number = 1000,
    timeoutMs: number = 60000
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        // Increase timeout on retries (exponential backoff for timeout too)
        const currentTimeout = timeoutMs * (1 + (attempt - 1) * 0.5); // 60s, 90s, 120s
        const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
        
        logInfo(`Fetch attempt ${attempt}/${maxRetries} (timeout: ${currentTimeout/1000}s)...`);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMsg);
        }
        
        return response;
      } catch (error: any) {
        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt) {
          if (isTimeout) {
            throw new Error(`Request timeout after ${maxRetries} attempts. The server may be processing a large dataset. Please try a smaller date range or try again later.`);
          }
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        if (isTimeout) {
          logWarn(`Request timeout on attempt ${attempt}, retrying in ${delay}ms with longer timeout...`);
        } else {
          logWarn(`Fetch attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Failed to fetch after all retries');
  }
}

// Singleton instance
let httpClientInstance: HttpClient | null = null;

/**
 * Get HTTP client instance
 */
export function getHttpClient(): HttpClient {
  if (!httpClientInstance) {
    httpClientInstance = new HttpClient();
  }
  return httpClientInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).fetchWithRetry = async (
    url: string,
    options: FetchOptions = {},
    maxRetries: number = 3,
    retryDelay: number = 1000,
    timeoutMs: number = 60000
  ) => {
    return getHttpClient().fetchWithRetry(url, options, maxRetries, retryDelay, timeoutMs);
  };
}

