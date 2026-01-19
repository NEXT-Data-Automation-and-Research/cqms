/**
 * Google Meet API Routes
 * Endpoints for generating Google Meet links
 */

import { Router } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { handleApiError } from '../middleware/error-handler.middleware.js';
import { googleCalendarService } from '../../infrastructure/google-calendar-service.js';
import { logError, logInfo } from '../../utils/logging-helper.js';

const router = Router();

/**
 * GET /api/google-meet/test
 * Test Google Calendar API configuration (for debugging)
 */
router.get('/test', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Check configuration
    const configStatus = {
      hasEmail: !!serviceAccountEmail,
      hasKey: !!serviceAccountKey,
      keyLength: serviceAccountKey?.length || 0,
      calendarId,
    };

    // Try to initialize
    try {
      await googleCalendarService.initialize();
      return res.json({
        success: true,
        message: 'Google Calendar API is configured correctly',
        config: {
          ...configStatus,
          email: serviceAccountEmail?.substring(0, 20) + '...',
        },
      });
    } catch (initError: any) {
      return res.status(500).json({
        success: false,
        error: initError.message || 'Initialization failed',
        config: configStatus,
      });
    }
  } catch (error: any) {
    logError('[GoogleMeetAPI] Test error:', error);
    return handleApiError(res, error, 'Failed to test Google Calendar API configuration');
  }
});

/**
 * POST /api/google-meet/generate
 * Generate a Google Meet link
 * 
 * Body:
 * {
 *   title: string (optional, default: "Quick Meeting")
 *   startTime?: string (ISO 8601, optional)
 *   endTime?: string (ISO 8601, optional)
 *   description?: string (optional)
 *   attendees?: string[] (optional)
 * }
 */
router.post('/generate', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    logInfo('[GoogleMeetAPI] Meet link generation request received', {
      hasTitle: !!req.body.title,
      hasStartTime: !!req.body.startTime,
      hasEndTime: !!req.body.endTime,
    });

    // Ensure service is initialized
    try {
      await googleCalendarService.initialize();
      logInfo('[GoogleMeetAPI] Service initialized successfully');
    } catch (initError: any) {
      logError('[GoogleMeetAPI] Service initialization failed:', {
        message: initError.message,
        stack: initError.stack,
        code: initError.code,
        response: initError.response?.data,
      });
      console.error('[GoogleMeetAPI] Full initialization error:', initError);
      return res.status(500).json({
        success: false,
        error: initError.message || 'Failed to initialize Google Calendar service',
        details: {
          message: initError.message,
          stack: initError.stack,
          code: initError.code,
        },
      });
    }

    const { title, startTime, endTime, description, attendees } = req.body;

    // If startTime and endTime are provided, create a scheduled event
    if (startTime && endTime) {
      logInfo('[GoogleMeetAPI] Generating scheduled Meet link', {
        title: title || 'Meeting',
        startTime,
        endTime,
        attendeeCount: attendees?.length || 0,
      });
      
      try {
        const result = await googleCalendarService.generateMeetLink({
          title: title || 'Meeting',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          description,
          attendees,
        });

        logInfo(`[GoogleMeetAPI] Generated scheduled Meet link for: ${title}`, {
          meetLink: result.meetLink,
          eventId: result.calendarEventId,
        });
        
        return res.json({
          success: true,
          meetLink: result.meetLink,
          calendarEventId: result.calendarEventId,
        });
      } catch (generateError: any) {
        logError('[GoogleMeetAPI] Error generating scheduled Meet link:', {
          message: generateError.message,
          stack: generateError.stack,
          code: generateError.code,
          response: generateError.response?.data,
        });
        console.error('[GoogleMeetAPI] Full generate error:', generateError);
        throw generateError; // Re-throw to be caught by outer catch
      }
    }

    // Otherwise, generate a quick Meet link
    logInfo('[GoogleMeetAPI] Generating quick Meet link', {
      title: title || 'Quick Meeting',
    });
    
    try {
      const meetLink = await googleCalendarService.generateQuickMeetLink(
        title || 'Quick Meeting'
      );

      logInfo('[GoogleMeetAPI] Generated quick Meet link', {
        meetLink,
      });
      
      return res.json({
        success: true,
        meetLink,
      });
    } catch (generateError: any) {
      logError('[GoogleMeetAPI] Error generating quick Meet link:', {
        message: generateError.message,
        stack: generateError.stack,
        code: generateError.code,
        response: generateError.response?.data,
      });
      console.error('[GoogleMeetAPI] Full generate error:', generateError);
      throw generateError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
      // Log detailed error information to console (always visible)
      console.error('========================================');
      console.error('[GoogleMeetAPI] ERROR GENERATING MEET LINK');
      console.error('========================================');
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error name:', error?.name);
      console.error('Error stack:', error?.stack);
      console.error('Error response:', error?.response?.data);
      console.error('Full error object:', error);
      console.error('========================================');
      
      // Log detailed error information
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        name: error?.name,
        code: error?.code,
        status: error?.status || error?.response?.status,
      };
      
      // Always add full error details for debugging
      errorDetails.stack = error?.stack;
      errorDetails.response = error?.response?.data;
      errorDetails.fullError = error?.toString?.();
      
      // Extract Google API error details if available
      if (error?.response?.data?.error) {
        const apiError = error.response.data.error;
        errorDetails.googleApiError = {
          message: apiError.message,
          code: apiError.code,
          status: apiError.status,
          errors: apiError.errors,
        };
        console.error('[GoogleMeetAPI] Google API Error:', apiError);
      }
      
      // Log full error details server-side
      logError('[GoogleMeetAPI] Error generating Meet link:', errorDetails);
      
      // Return detailed error - ALWAYS return details, don't rely on NODE_ENV
      const errorMessage = error?.message || 'Failed to generate Google Meet link';
      
      return res.status(error?.status || 500).json({
        success: false,
        error: errorMessage,
        details: errorDetails,
      });
    }
});

export default router;
