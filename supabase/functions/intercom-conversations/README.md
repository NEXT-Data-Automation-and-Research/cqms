# Intercom Conversations Edge Function

Secure, authenticated proxy for fetching Intercom conversations for assigned employees.

## Security Features

✅ **JWT Authentication**: All requests require valid Supabase JWT token  
✅ **Authorization Check**: Users can only access conversations for employees they are assigned to audit  
✅ **Environment Variables**: Intercom token stored securely in Supabase dashboard  
✅ **Input Validation**: All parameters are validated before processing  
✅ **Error Handling**: Comprehensive error handling with appropriate HTTP status codes  

## Setup

### 1. Set Environment Variables

In your Supabase project dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following environment variable:
   - `INTERCOM_ACCESS_TOKEN`: Your Intercom API access token

The following are automatically available:
- `SUPABASE_URL`: Automatically set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Automatically set by Supabase

### 2. Function Configuration

- **JWT Verification**: Enabled (`verify_jwt: true`)
- **Function Name**: `intercom-conversations`
- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/intercom-conversations`

## Usage

### Client-Side Call

```typescript
// Get Supabase client and session
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) {
  throw new Error('Not authenticated');
}

// Build request
const supabaseUrl = 'https://your-project.supabase.co';
const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-conversations`;
const params = new URLSearchParams({
  employee_email: 'employee@example.com',
  updated_since: '1704067200', // Unix timestamp (seconds)
  updated_before: '1704153600', // Unix timestamp (seconds)
});

// Call edge function
const response = await fetch(`${edgeFunctionUrl}?${params.toString()}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

### Parameters

- `employee_email` (required): Email of the employee whose conversations to fetch
- `updated_since` (optional): Unix timestamp (seconds) for start date
- `updated_before` (optional): Unix timestamp (seconds) for end date
- `updated_date` (optional): Date in YYYY-MM-DD format (alternative to since/before)
- `starting_after` (optional): Pagination cursor for next page

### Response Format

```json
{
  "type": "conversation.list",
  "conversations": [
    {
      "id": "123456789",
      "created_at": 1704067200,
      "updated_at": 1704153600,
      "created_at_iso": "2024-01-01T00:00:00.000Z",
      "updated_at_iso": "2024-01-02T00:00:00.000Z",
      "participation_part_count": 3,
      "conversation_parts": [...]
    }
  ],
  "total_count": 10,
  "intercom_total_count": 150,
  "has_more": true,
  "next_cursor": "cursor_string",
  "employee_email": "employee@example.com",
  "date": "2024-01-01",
  "participation_count": 15,
  "processed_count": 10,
  "error_count": 0
}
```

## Authorization Logic

The function enforces the following security checks:

1. **Authentication**: Validates JWT token from Authorization header
2. **Permission Check**: Verifies user is assigned as auditor for the employee in `audit_assignments` table
3. **Employee Lookup**: Retrieves `intercom_admin_id` from `people` or `users` table
4. **Participation Filtering**: Only returns conversations where the admin actually participated

## Error Responses

- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: User doesn't have permission to access conversations for this employee
- `404 Not Found`: Intercom admin ID not found for employee
- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: Server error (check logs)

## Rate Limiting

- Maximum 150 conversations per request
- Batch processing: 10 conversations at a time
- Timeout: 60 seconds (with 5 second buffer)
- Retry logic: 3 attempts for 500 errors with exponential backoff

## Notes

- The function filters conversations by actual admin participation (not just assignment)
- Conversations are filtered by date range based on when the admin participated
- The function uses Intercom Search API for efficient querying
- All sensitive data (Intercom token) is stored in environment variables, never in code

