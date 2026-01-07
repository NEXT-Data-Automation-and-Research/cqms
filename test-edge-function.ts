/**
 * Test script for Intercom Conversations Edge Function
 * Tests the edge function with actual user data from the database
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://mdaffwklbdfthqcjbuyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYWZmd2tsYmRmdGhxY2pidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ5MDksImV4cCI6MjA4MDMyMDkwOX0.ItBHqtemi5IUIq7x7KG01pVWJgg_Wa39FTmlDibiZy8';

// Test data from actual database
const TEST_EMPLOYEE = {
  employee_email: 'raqibul@nextventures.io',
  employee_name: 'Raqibul Islam',
  auditor_email: 'tashfia.haque@nextventures.io',
  intercom_admin_id: '8096878',
  intercom_admin_alias: 'Samy Zayn'
};

/**
 * Test the edge function with real employee data
 */
async function testEdgeFunction() {
  console.log('🧪 Testing Intercom Conversations Edge Function\n');
  console.log('Test Configuration:');
  console.log('===================');
  console.log(`Employee Email: ${TEST_EMPLOYEE.employee_email}`);
  console.log(`Employee Name: ${TEST_EMPLOYEE.employee_name}`);
  console.log(`Auditor Email: ${TEST_EMPLOYEE.auditor_email}`);
  console.log(`Intercom Admin ID: ${TEST_EMPLOYEE.intercom_admin_id}`);
  console.log(`Intercom Alias: ${TEST_EMPLOYEE.intercom_admin_alias}\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Note: To test the edge function, we need an authenticated user session
  // The edge function requires a Bearer token with a valid JWT
  console.log('⚠️  IMPORTANT: This edge function requires authentication.');
  console.log('   You need to be logged in as the auditor to test it.\n');

  // Calculate date range (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setUTCHours(23, 59, 59, 999);
  
  const startTimestamp = Math.floor(yesterday.getTime() / 1000);
  const endTimestamp = Math.floor(endOfYesterday.getTime() / 1000);

  console.log('Date Range:');
  console.log('===========');
  console.log(`Start: ${yesterday.toISOString()} (${startTimestamp})`);
  console.log(`End: ${endOfYesterday.toISOString()} (${endTimestamp})\n`);

  // Edge function URL
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/intercom-conversations`;
  const params = new URLSearchParams({
    employee_email: TEST_EMPLOYEE.employee_email,
    updated_since: String(startTimestamp),
    updated_before: String(endTimestamp)
  });

  const fullUrl = `${edgeFunctionUrl}?${params.toString()}`;

  console.log('Edge Function Request:');
  console.log('=====================');
  console.log(`URL: ${fullUrl}`);
  console.log(`Method: GET`);
  console.log(`Headers: Authorization: Bearer <JWT_TOKEN>\n`);

  console.log('Expected Response Structure:');
  console.log('============================');
  console.log(JSON.stringify({
    type: 'conversation.list',
    conversations: [
      {
        id: 'conversation_id',
        created_at: 1234567890,
        updated_at: 1234567890,
        created_at_iso: '2024-01-15T10:30:00.000Z',
        updated_at_iso: '2024-01-15T11:45:00.000Z',
        participation_part_count: 5,
        conversation_parts: [],
        source: {
          type: 'conversation',
          subject: 'Customer inquiry',
          body: 'Message content...',
          author: {
            type: 'user',
            email: 'customer@example.com',
            name: 'Customer Name'
          }
        },
        tags: ['tag1', 'tag2'],
        rating: {
          rating: 5
        }
      }
    ],
    total_count: 10,
    intercom_total_count: 15,
    has_more: false,
    pages: null,
    employee_email: TEST_EMPLOYEE.employee_email,
    date: yesterday.toISOString().split('T')[0],
    participation_count: 25,
    processed_count: 15,
    error_count: 0
  }, null, 2));

  console.log('\n📋 To test this function:');
  console.log('1. Log in to the application as:', TEST_EMPLOYEE.auditor_email);
  console.log('2. Navigate to Create Audit page');
  console.log('3. Click on the employee:', TEST_EMPLOYEE.employee_name);
  console.log('4. The edge function will be called automatically');
  console.log('5. Check browser console and network tab for the response\n');

  // Try to get a session (if possible)
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session && session.access_token) {
      console.log('✅ Found active session! Testing edge function...\n');
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Response Status: ${response.status} ${response.statusText}\n`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Edge Function Response:');
        console.log('==========================');
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n📊 Summary:');
        console.log(`Total Conversations: ${data.total_count || 0}`);
        console.log(`Intercom Total Count: ${data.intercom_total_count || 0}`);
        console.log(`Participation Count: ${data.participation_count || 0}`);
        console.log(`Processed Count: ${data.processed_count || 0}`);
        console.log(`Error Count: ${data.error_count || 0}`);
        console.log(`Has More: ${data.has_more || false}`);
        
        if (data.conversations && data.conversations.length > 0) {
          console.log('\n📝 Sample Conversation:');
          const sample = data.conversations[0];
          console.log(`ID: ${sample.id}`);
          console.log(`Created: ${sample.created_at_iso || sample.created_at}`);
          console.log(`Updated: ${sample.updated_at_iso || sample.updated_at}`);
          console.log(`Participation Parts: ${sample.participation_part_count || 0}`);
          console.log(`Source Type: ${sample.source?.type || 'N/A'}`);
          console.log(`Subject: ${sample.source?.subject || 'N/A'}`);
          console.log(`Tags: ${sample.tags?.join(', ') || 'None'}`);
          console.log(`Rating: ${sample.rating?.rating || 'N/A'}`);
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Error Response:');
        console.log(errorText);
      }
    } else {
      console.log('ℹ️  No active session found.');
      console.log('   Please log in to test the edge function.\n');
    }
  } catch (error) {
    console.log('ℹ️  Could not test edge function (authentication required)');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

// Run the test
testEdgeFunction().catch(console.error);

