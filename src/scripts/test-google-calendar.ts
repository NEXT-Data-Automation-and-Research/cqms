/**
 * Test Google Calendar Service
 * Run this script to diagnose Google Calendar API issues
 * Usage: npx tsx src/scripts/test-google-calendar.ts
 */

import dotenv from 'dotenv';
import { googleCalendarService } from '../infrastructure/google-calendar-service.js';
import { logInfo, logError } from '../utils/logging-helper.js';

// Load environment variables
dotenv.config();

async function testGoogleCalendar(): Promise<void> {
  console.log('\n=== Google Calendar API Test ===\n');

  // Check environment variables
  console.log('1. Checking environment variables...');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!email) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_EMAIL not set');
    return;
  }
  console.log(`✅ GOOGLE_SERVICE_ACCOUNT_EMAIL: ${email.substring(0, 30)}...`);

  if (!key) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not set');
    return;
  }
  console.log(`✅ GOOGLE_SERVICE_ACCOUNT_KEY: ${key.length} characters`);

  // Try to parse the key
  console.log('\n2. Parsing service account key...');
  try {
    const credentials = JSON.parse(key);
    if (!credentials.private_key) {
      console.error('❌ Service account key missing private_key field');
      return;
    }
    if (!credentials.client_email) {
      console.error('❌ Service account key missing client_email field');
      return;
    }
    console.log('✅ Service account key is valid JSON');
    console.log(`   Client email: ${credentials.client_email}`);
    console.log(`   Project ID: ${credentials.project_id}`);
  } catch (parseError: any) {
    console.error('❌ Failed to parse service account key:', parseError.message);
    return;
  }

  // Try to initialize
  console.log('\n3. Initializing Google Calendar service...');
  try {
    await googleCalendarService.initialize();
    console.log('✅ Google Calendar service initialized');
  } catch (initError: any) {
    console.error('❌ Initialization failed:', initError.message);
    console.error('   Stack:', initError.stack);
    return;
  }

  // Try to generate a test Meet link
  console.log('\n4. Testing Meet link generation...');
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
    
    const result = await googleCalendarService.generateQuickMeetLink('Test Meeting');
    console.log('✅ Meet link generated successfully!');
    console.log(`   Meet Link: ${result}`);
  } catch (generateError: any) {
    console.error('❌ Meet link generation failed:', generateError.message);
    console.error('   Stack:', generateError.stack);
    if (generateError.response?.data) {
      console.error('   Google API Response:', JSON.stringify(generateError.response.data, null, 2));
    }
  }

  console.log('\n=== Test Complete ===\n');
}

// Run the test
testGoogleCalendar().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
