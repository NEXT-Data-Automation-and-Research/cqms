# Intercom Proxy Edge Function

This edge function proxies requests to the Intercom API, providing participation-based filtering for conversations.

## Features

- Fetches conversations from Intercom API
- Filters conversations by admin participation
- Supports date range filtering
- Handles pagination
- Provides endpoints for admins, teams, and conversations

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

### Deploy the Function

Deploy the edge function to Supabase:

```bash
supabase functions deploy intercom-proxy
```

### Environment Variables

The function uses a hardcoded Intercom access token. For production, consider moving this to environment variables:

1. Set environment variable in Supabase Dashboard:
   - Go to Project Settings > Edge Functions
   - Add `INTERCOM_ACCESS_TOKEN` environment variable

2. Update the function to use environment variable:
   ```typescript
   const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN') || 'your-fallback-token'
   ```

## Usage

### Fetch Conversations for an Admin

```
GET /functions/v1/intercom-proxy?endpoint=conversations&admin_id={adminId}&updated_date=2024-01-15
```

### Fetch Single Conversation

```
GET /functions/v1/intercom-proxy?conversation_id={conversationId}&display_as=plaintext
```

### Fetch Admins

```
GET /functions/v1/intercom-proxy?endpoint=admins
```

### Fetch Teams

```
GET /functions/v1/intercom-proxy?endpoint=teams
```

## Integration

This function is already integrated into the create-audit page. When a user clicks "Assign Audit" on an assignment:

1. The system checks if the assignment has a linked conversation
2. If not, it fetches Intercom conversations for that employee
3. User can select a conversation
4. The conversation is linked to the assignment
5. User is navigated to the audit form

## Testing

Test the function locally:

```bash
supabase functions serve intercom-proxy
```

Then test with:
```bash
curl "http://localhost:54321/functions/v1/intercom-proxy?endpoint=admins" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
