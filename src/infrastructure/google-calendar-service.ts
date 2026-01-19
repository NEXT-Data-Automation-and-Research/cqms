/**
 * Google Calendar Service
 * Generates Google Meet links by creating calendar events with video conferences
 */

import { google } from 'googleapis';
import { logError, logInfo } from '../utils/logging-helper.js';

export interface MeetLinkOptions {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  attendees?: string[];
}

export interface MeetLinkResult {
  meetLink: string;
  calendarEventId?: string;
  hangoutLink?: string;
}

export class GoogleCalendarService {
  private calendar: any = null;
  private isInitialized = false;

  /**
   * Initialize Google Calendar API with service account
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.calendar) {
      return;
    }

    try {
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      if (!serviceAccountEmail || !serviceAccountKey) {
        throw new Error(
          'Google Calendar service account credentials not configured. ' +
          'Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY in your .env file.'
        );
      }

      // Parse the service account key (must be JSON string)
      let credentials: any;
      try {
        credentials = typeof serviceAccountKey === 'string' 
          ? JSON.parse(serviceAccountKey) 
          : serviceAccountKey;
          
        // Validate required fields
        if (!credentials.private_key || !credentials.client_email) {
          throw new Error('Service account key missing required fields (private_key or client_email)');
        }
        
        // Fix private key: replace literal \n with actual newlines
        // When stored in .env, \n is a literal string, not a newline
        if (typeof credentials.private_key === 'string' && credentials.private_key.includes('\\n')) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
        
        logInfo('[GoogleCalendarService] Service account key parsed successfully', {
          hasPrivateKey: !!credentials.private_key,
          privateKeyLength: credentials.private_key?.length || 0,
          clientEmail: credentials.client_email,
        });
      } catch (parseError: any) {
        logError('[GoogleCalendarService] JSON parse error:', parseError);
        throw new Error(
          `GOOGLE_SERVICE_ACCOUNT_KEY must be a valid JSON string. Parse error: ${parseError.message || 'Invalid JSON format'}`
        );
      }

      // Create JWT auth client
      // Note: The googleapis library makes server-side requests and should not include
      // browser headers like origin/host. However, we'll ensure clean requests.
      const auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      });
      
      // Configure auth client to use clean request options
      // This ensures no browser headers (origin, host, referer) are included
      if (auth.request && typeof auth.request === 'function') {
        const originalRequest = auth.request.bind(auth);
        auth.request = async (opts: any) => {
          // Clean headers - remove any browser-specific headers
          if (opts && opts.headers) {
            // Log headers before cleaning (for debugging)
            const headersBefore = { ...opts.headers };
            logInfo('[GoogleCalendarService] Request headers before cleaning:', {
              hasOrigin: !!opts.headers.origin || !!opts.headers.Origin,
              hasHost: !!opts.headers.host || !!opts.headers.Host,
              hasReferer: !!opts.headers.referer || !!opts.headers.Referer,
              headerKeys: Object.keys(opts.headers),
            });
            
            // Remove headers that might cause issues with Google APIs
            const headersToRemove = ['origin', 'Origin', 'referer', 'Referer', 'host', 'Host'];
            headersToRemove.forEach(header => {
              delete opts.headers[header];
            });
            
            // Log after cleaning
            logInfo('[GoogleCalendarService] Request headers after cleaning:', {
              headerKeys: Object.keys(opts.headers),
            });
          }
          return originalRequest(opts);
        };
      }

      // Test authentication by getting an access token
      try {
        await auth.authorize();
        logInfo('[GoogleCalendarService] Authentication successful');
      } catch (authError: any) {
        logError('[GoogleCalendarService] Authentication failed:', authError);
        throw new Error(
          `Failed to authenticate with Google Calendar API: ${authError.message || 'Authentication error'}. ` +
          'Please verify your service account key and ensure the calendar is shared with the service account.'
        );
      }

      // Initialize Calendar API
      // The auth client is already configured to remove unwanted headers
      this.calendar = google.calendar({ 
        version: 'v3', 
        auth,
      });
      
      this.isInitialized = true;

      logInfo('[GoogleCalendarService] Initialized successfully');
    } catch (error) {
      logError('[GoogleCalendarService] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Generate a Google Meet link by creating a calendar event
   */
  async generateMeetLink(options: MeetLinkOptions): Promise<MeetLinkResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.calendar) {
      throw new Error('Google Calendar service not initialized');
    }

    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Format dates for Google Calendar API (RFC3339)
      const startTime = options.startTime.toISOString();
      const endTime = options.endTime.toISOString();

      // Create calendar event with video conference
      const event = {
        summary: options.title,
        description: options.description || '',
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        attendees: options.attendees?.map(email => ({ email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      // Make API call - headers are already cleaned by auth client configuration
      const response = await this.calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: event,
      });

      logInfo('[GoogleCalendarService] Calendar event created:', {
        eventId: response.data.id,
        hasConferenceData: !!response.data.conferenceData,
        hasHangoutLink: !!response.data.hangoutLink,
      });

      // Try multiple ways to get the Meet link
      let meetLink: string | undefined;
      
      // Method 1: From conferenceData entryPoints
      if (response.data.conferenceData?.entryPoints) {
        const videoEntry = response.data.conferenceData.entryPoints.find(
          (entry: any) => entry.entryPointType === 'video'
        );
        if (videoEntry?.uri) {
          meetLink = videoEntry.uri;
        }
      }
      
      // Method 2: From hangoutLink
      if (!meetLink && response.data.hangoutLink) {
        meetLink = response.data.hangoutLink;
      }
      
      // Method 3: From conferenceData conferenceId (construct URL)
      if (!meetLink && response.data.conferenceData?.conferenceId) {
        meetLink = `https://meet.google.com/${response.data.conferenceData.conferenceId}`;
      }

      if (!meetLink) {
        logError('[GoogleCalendarService] No Meet link found in response:', {
          responseData: JSON.stringify(response.data, null, 2),
        });
        throw new Error('Failed to generate Meet link from calendar event. The event was created but no Meet link was returned.');
      }

      logInfo(`[GoogleCalendarService] Generated Meet link: ${meetLink}`);

      return {
        meetLink,
        calendarEventId: response.data.id,
        hangoutLink: response.data.hangoutLink,
      };
    } catch (error: any) {
      logError('[GoogleCalendarService] Error generating Meet link:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to generate Google Meet link';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.code) {
        errorMessage += ` (Code: ${error.code})`;
      }
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        errorMessage += ` - ${apiError.message || JSON.stringify(apiError)}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Generate a quick Meet link without creating a calendar event
   * Note: This is a fallback method. Google doesn't provide a direct API for this,
   * so we'll create a temporary event and extract the link, then optionally delete it.
   */
  async generateQuickMeetLink(title: string = 'Quick Meeting'): Promise<string> {
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const result = await this.generateMeetLink({
      title,
      startTime: now,
      endTime,
    });

    // Optionally delete the event if you only want the link
    // Uncomment the following if you want to delete the event after getting the link
    /*
    if (result.calendarEventId) {
      try {
        await this.calendar.events.delete({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          eventId: result.calendarEventId,
        });
        logInfo('[GoogleCalendarService] Temporary event deleted');
      } catch (error) {
        logError('[GoogleCalendarService] Error deleting temporary event:', error);
        // Don't throw - we still have the link
      }
    }
    */

    return result.meetLink;
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
