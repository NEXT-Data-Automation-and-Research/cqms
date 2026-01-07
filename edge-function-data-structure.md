# Edge Function Data Structure - What Data You're Getting

## Response Structure from Edge Function

When you call the Intercom Conversations Edge Function, here's the **exact data structure** you receive:

### Top-Level Response Object

```json
{
  "type": "conversation.list",
  "conversations": [...],           // Array of conversation objects
  "total_count": 10,                // Number of conversations with participation
  "intercom_total_count": 15,       // Total conversations found in Intercom
  "has_more": false,                // Whether there are more pages
  "pages": {...},                   // Pagination info from Intercom
  "next_cursor": null,              // Cursor for next page
  "employee_email": "employee@example.com",
  "date": "2026-01-06",             // Date queried
  "participation_count": 25,        // Total conversation parts by admin
  "processed_count": 15,            // Conversations processed
  "error_count": 0                  // Errors during processing
}
```

### Individual Conversation Object

Each conversation in the `conversations` array contains:

#### Core Fields (Added by Edge Function)
```json
{
  "id": "123456789",                              // Conversation ID
  "created_at": 1704067200,                      // Unix timestamp (seconds)
  "updated_at": 1704153600,                      // Unix timestamp (seconds)
  "created_at_iso": "2024-01-01T00:00:00.000Z", // ISO date string
  "updated_at_iso": "2024-01-02T00:00:00.000Z",  // ISO date string
  "participation_part_count": 3                  // Number of parts by this admin
}
```

#### Full Intercom Conversation Object (Spread with `...conversation`)

The edge function spreads the **entire Intercom conversation object**, which includes:

```json
{
  // Source information
  "source": {
    "type": "conversation",           // or "email", "phone", etc.
    "id": "source_id",
    "subject": "Customer inquiry",    // Email subject or conversation title
    "body": "Message content...",     // Initial message body
    "author": {
      "type": "user",                 // or "admin", "bot"
      "id": "user_id",
      "email": "customer@example.com",
      "name": "Customer Name"
    },
    "delivered_as": "customer_initiated",
    "created_at": 1704067200
  },
  
  // Conversation parts (messages)
  "conversation_parts": {
    "conversation_parts": [
      {
        "id": "part_id",
        "type": "comment",            // or "assignment", "open", etc.
        "part_type": "comment",
        "body": "Message text...",
        "created_at": 1704067200,
        "author": {
          "type": "admin",           // or "user"
          "id": "admin_id",
          "email": "admin@example.com",
          "name": "Admin Name"
        },
        "attachments": [],
        "external_id": null
      }
    ],
    "total_count": 5,
    "type": "conversation.part.list"
  },
  
  // Tags
  "tags": {
    "type": "tag.list",
    "tags": [
      {
        "id": "tag_id",
        "name": "support",
        "type": "tag"
      },
      {
        "id": "tag_id_2",
        "name": "urgent",
        "type": "tag"
      }
    ]
  },
  
  // Rating (CSAT)
  "rating": {
    "rating": 5,                     // 1-5 stars
    "created_at": 1704153600,
    "contact": {
      "type": "contact",
      "id": "contact_id"
    },
    "teammate": {
      "type": "admin",
      "id": "admin_id"
    }
  },
  
  // Statistics
  "statistics": {
    "type": "conversation.statistics",
    "time_to_assignment": 300,       // seconds
    "time_to_admin_reply": 600,      // seconds
    "time_to_first_close": 3600,     // seconds
    "time_to_last_close": 7200,      // seconds
    "median_time_to_reply": 300,     // seconds
    "first_contact_reply_at": 1704067500,
    "last_contact_reply_at": 1704070800,
    "last_admin_reply_at": 1704071100,
    "count_reopens": 0,
    "count_assignments": 1
  },
  
  // State information
  "state": "closed",                 // "open", "closed", "snoozed"
  "priority": "not_priority",        // "priority" or "not_priority"
  "read": true,
  
  // Assignee information
  "assignee": {
    "type": "admin",
    "id": "admin_id",
    "email": "admin@example.com"
  },
  
  // Team information
  "team": {
    "type": "team",
    "id": "team_id",
    "name": "Support Team"
  },
  
  // Custom attributes (if any)
  "custom_attributes": {}
}
```

## What Data Gets Transformed in Frontend

The frontend (`conversations-panel.ts`) transforms this raw Intercom data into a simpler format:

### Transformed Conversation Object (What You See in UI)

```typescript
{
  id: string,                    // From conv.id
  client: string,                 // Extracted from source.author.email or name
  subject: string,                // From source.subject or first message body
  csat: number,                  // From rating.rating (0-5)
  cxScore: number,                // Always 0 (not calculated yet)
  length: number,                // Calculated: (updated_at - created_at) in minutes
  errorsDetected: number,        // Always 0 (not analyzed yet)
  tags: string[],                // Extracted from tags array
  created: string,                // Date string (YYYY-MM-DD)
  aiStatus: 'Completed',         // Always 'Completed'
  channel: string                // Mapped from source.type ('chat', 'email', 'phone')
}
```

### Data Extraction Logic

1. **Client Name**: 
   - From `source.author.email` → extracts username before @
   - Or from `source.author.name`
   - Or from first user message author

2. **Subject**:
   - From `source.subject` (for emails)
   - Or from `source.body` (first message)
   - Or from first user message body (truncated to 100 chars)

3. **Tags**:
   - Extracted from `tags.tags[]` array
   - Handles both string tags and tag objects with `name` property

4. **Channel**:
   - Mapped from `source.type`:
     - `conversation` → `chat`
     - `email` → `email`
     - `phone` → `phone`
     - `twitter` → `twitter`
     - etc.

5. **Length**:
   - Calculated: `(updated_at - created_at) / 60` (minutes)

6. **CSAT**:
   - From `rating.rating` (1-5 stars)

## Example: Real Data Structure

Based on the code analysis, here's what a **real conversation object** looks like:

```json
{
  "id": "123456789",
  "created_at": 1704067200,
  "updated_at": 1704153600,
  "created_at_iso": "2024-01-01T00:00:00.000Z",
  "updated_at_iso": "2024-01-02T00:00:00.000Z",
  "participation_part_count": 3,
  "source": {
    "type": "conversation",
    "subject": "Need help with my account",
    "body": "Hi, I'm having trouble logging in...",
    "author": {
      "type": "user",
      "email": "john.doe@example.com",
      "name": "John Doe"
    }
  },
  "conversation_parts": {
    "conversation_parts": [
      {
        "id": "part1",
        "type": "comment",
        "body": "Hello! I can help you with that.",
        "created_at": 1704067500,
        "author": {
          "type": "admin",
          "id": "8096878",
          "email": "admin@example.com"
        }
      }
    ]
  },
  "tags": {
    "tags": [
      {"id": "tag1", "name": "support"},
      {"id": "tag2", "name": "account"}
    ]
  },
  "rating": {
    "rating": 5
  },
  "state": "closed"
}
```

### Transformed to UI Format:

```json
{
  "id": "123456789",
  "client": "john.doe",
  "subject": "Need help with my account",
  "csat": 5,
  "cxScore": 0,
  "length": 1440,
  "errorsDetected": 0,
  "tags": ["support", "account"],
  "created": "2024-01-01",
  "aiStatus": "Completed",
  "channel": "chat"
}
```

## Key Points

1. **Full Intercom Data**: The edge function returns the **complete Intercom conversation object** with all fields
2. **Participation Filtering**: Only conversations where the admin participated are returned
3. **Participation Count**: Shows how many conversation parts the admin contributed
4. **Date Filtering**: Only conversations updated in the specified date range
5. **Frontend Transformation**: The UI transforms this into a simpler format for display

## What You Can Access

From the edge function response, you have access to:
- ✅ Full conversation history (`conversation_parts`)
- ✅ Customer information (`source.author`)
- ✅ Tags and metadata
- ✅ Ratings (CSAT scores)
- ✅ Timestamps and duration
- ✅ Channel type (chat, email, phone)
- ✅ Statistics (reply times, assignments)
- ✅ Admin participation details

This data is then displayed in the conversations table on the Create Audit page.

