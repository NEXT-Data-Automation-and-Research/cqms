# Analytics, APM & Crashlytics Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for implementing user analytics, Application Performance Monitoring (APM), and crashlytics tracking across the Express CQMS platform. The solution is designed to be scalable, maintainable, and provide actionable insights for every user role and feature.

---

## Table of Contents

1. [Data Points Overview](#data-points-overview)
2. [User Analytics Data Points](#user-analytics-data-points)
3. [APM Data Points](#apm-data-points)
4. [Crashlytics Data Points](#crashlytics-data-points)
5. [Database Schema](#database-schema)
6. [Architecture & Scalability](#architecture--scalability)
7. [Implementation Plan](#implementation-plan)
8. [Integration Recommendations](#integration-recommendations)

---

## Data Points Overview

### Categories of Data Collection

1. **User Behavior Analytics** - Track how users interact with features
2. **Performance Metrics** - Monitor application performance and response times
3. **Error & Crash Tracking** - Capture and analyze errors and crashes
4. **Feature Usage** - Understand feature adoption and usage patterns
5. **Session Analytics** - Track user sessions and engagement
6. **Role-Based Analytics** - Analyze usage patterns by user role

---

## User Analytics Data Points

### 1. Page/Feature Views

**Track for every route/feature:**
- `page_slug` - Route identifier (e.g., 'home', 'dashboard', 'audit-form')
- `page_path` - Full path
- `view_timestamp` - When viewed
- `user_id` - User identifier
- `user_role` - Current user role
- `session_id` - Session identifier
- `referrer` - Previous page
- `time_on_page` - Duration spent (calculated on next page view)
- `scroll_depth` - Maximum scroll percentage
- `interactions_count` - Number of interactions on page

**Features to Track:**
- Home Page
- Auditors' Dashboard
- Audit Distribution
- Create Audit
- Audit Reports
- Performance (when available)
- Coaching & Remediation (when available)
- Reversal
- Event Management
- Improvement Corner (Calibration, ATA, Grading Guide)
- Settings (Scorecards, User Management, Permissions, Access Control, Profile)
- Help (Help, Bug Report, View Bug Reports)
- Audit Form (Sandbox)

### 2. User Actions & Interactions

**Track specific actions:**
- `action_type` - Type of action (click, submit, search, filter, sort, export, etc.)
- `action_target` - What was interacted with (button_id, form_id, link_text, etc.)
- `action_context` - Additional context (form_data, filter_values, etc.)
- `action_timestamp` - When action occurred
- `user_id` - User identifier
- `user_role` - User role
- `session_id` - Session identifier
- `page_slug` - Page where action occurred

**Key Actions to Track:**
- Form submissions (audit creation, scorecard creation, etc.)
- Button clicks (filter, export, create, edit, delete)
- Search queries
- Filter applications
- Sort operations
- Export actions
- Navigation events
- Modal opens/closes
- Tab switches
- Dropdown selections

### 3. Feature-Specific Metrics

#### Audit Form
- Time to complete audit
- Number of fields filled
- Validation errors encountered
- Save draft frequency
- AI audit indicator usage
- Timer usage
- Form abandonment rate

#### Dashboard
- Filters applied
- Date range selections
- Export actions
- Refresh frequency
- Widget interactions

#### User Management
- User creation
- User edits
- Role assignments
- Bulk operations
- Search queries
- Filter usage

#### Audit Distribution
- Distribution actions
- Filter usage
- Bulk operations

### 4. Session Analytics

**Track user sessions:**
- `session_id` - Unique session identifier
- `user_id` - User identifier
- `user_role` - User role
- `session_start` - Session start timestamp
- `session_end` - Session end timestamp
- `session_duration` - Total session duration
- `pages_visited` - Array of pages visited
- `actions_count` - Total actions in session
- `device_info` - Device information (from existing device_info)
- `ip_address` - User IP (hashed for privacy)
- `user_agent` - Browser user agent

### 5. Role-Based Analytics

**Track metrics per role:**
- General User
- Employee
- Quality Analyst
- Auditor
- Quality Supervisor
- Manager
- Admin
- Super Admin

**Metrics per role:**
- Most used features
- Average session duration
- Feature adoption rates
- Common navigation paths
- Peak usage times

### 6. Time-Based Analytics

**Track temporal patterns:**
- Hourly usage patterns
- Daily usage patterns
- Weekly usage patterns
- Monthly trends
- Peak usage times
- Off-hours usage

---

## APM Data Points

### 1. API Performance Metrics

**Track for every API endpoint:**
- `endpoint_path` - API endpoint path
- `http_method` - HTTP method (GET, POST, PUT, DELETE, etc.)
- `request_timestamp` - Request timestamp
- `response_time_ms` - Response time in milliseconds
- `status_code` - HTTP status code
- `request_size_bytes` - Request payload size
- `response_size_bytes` - Response payload size
- `user_id` - User making request
- `user_role` - User role
- `ip_address` - Client IP (hashed)
- `user_agent` - Client user agent

**Key Endpoints to Monitor:**
- `/api/auth/*` - Authentication endpoints
- `/api/audits/*` - Audit operations
- `/api/users/*` - User management
- `/api/dashboard/*` - Dashboard data
- `/api/reports/*` - Report generation
- `/api/notifications/*` - Notification operations

### 2. Database Performance

**Track database operations:**
- `query_type` - SELECT, INSERT, UPDATE, DELETE
- `table_name` - Table accessed
- `query_duration_ms` - Query execution time
- `rows_affected` - Number of rows affected
- `query_hash` - Hashed query for pattern detection
- `connection_pool_size` - Connection pool metrics
- `slow_query` - Flag for queries exceeding threshold

### 3. Frontend Performance

**Track client-side performance:**
- `page_load_time` - Time to load page
- `time_to_first_byte` - TTFB
- `first_contentful_paint` - FCP
- `largest_contentful_paint` - LCP
- `cumulative_layout_shift` - CLS
- `first_input_delay` - FID
- `time_to_interactive` - TTI
- `dom_content_loaded` - DOMContentLoaded event
- `window_load` - Window load event
- `resource_load_times` - Individual resource load times
- `javascript_execution_time` - JS execution time

### 4. Network Performance

**Track network metrics:**
- `request_url` - Resource URL
- `resource_type` - Type (script, stylesheet, image, fetch, etc.)
- `transfer_size` - Transfer size in bytes
- `encoded_size` - Encoded size
- `decoded_size` - Decoded size
- `duration_ms` - Load duration
- `dns_lookup_time` - DNS lookup time
- `tcp_connection_time` - TCP connection time
- `tls_handshake_time` - TLS handshake time
- `time_to_first_byte` - TTFB
- `content_download_time` - Content download time

### 5. Server Performance

**Track server metrics:**
- `cpu_usage` - CPU usage percentage
- `memory_usage` - Memory usage (heap, RSS)
- `event_loop_lag` - Event loop lag
- `active_handles` - Active handles count
- `active_requests` - Active requests count
- `uptime` - Server uptime
- `request_rate` - Requests per second
- `error_rate` - Errors per second

---

## Crashlytics Data Points

### 1. Error Tracking

**Track all errors:**
- `error_id` - Unique error identifier
- `error_type` - Error type (JavaScript, API, Database, etc.)
- `error_message` - Error message
- `error_stack` - Stack trace
- `error_code` - Error code (if available)
- `error_timestamp` - When error occurred
- `user_id` - User who encountered error
- `user_role` - User role
- `session_id` - Session identifier
- `page_slug` - Page where error occurred
- `url` - Full URL where error occurred
- `user_agent` - Browser user agent
- `device_info` - Device information
- `breadcrumbs` - User actions leading to error
- `context` - Additional context (form data, state, etc.)

### 2. Crash Tracking

**Track application crashes:**
- `crash_id` - Unique crash identifier
- `crash_type` - Type of crash (uncaught exception, unhandled rejection, etc.)
- `crash_message` - Crash message
- `crash_stack` - Full stack trace
- `crash_timestamp` - When crash occurred
- `user_id` - User who experienced crash
- `user_role` - User role
- `session_id` - Session identifier
- `page_slug` - Page where crash occurred
- `url` - Full URL
- `user_agent` - Browser user agent
- `device_info` - Device information
- `memory_info` - Memory information at crash
- `performance_info` - Performance metrics at crash
- `breadcrumbs` - User actions leading to crash
- `release_version` - Application version
- `environment` - Environment (development, staging, production)

### 3. API Error Tracking

**Track API errors:**
- `error_id` - Unique error identifier
- `endpoint_path` - API endpoint
- `http_method` - HTTP method
- `status_code` - HTTP status code
- `error_message` - Error message
- `error_stack` - Stack trace
- `request_body` - Request body (sanitized)
- `request_headers` - Request headers (sanitized)
- `response_body` - Response body (sanitized)
- `error_timestamp` - When error occurred
- `user_id` - User making request
- `user_role` - User role
- `ip_address` - Client IP (hashed)

### 4. Database Error Tracking

**Track database errors:**
- `error_id` - Unique error identifier
- `error_type` - Error type (connection, query, constraint, etc.)
- `error_message` - Error message
- `query` - Query that failed (sanitized)
- `table_name` - Table involved
- `error_timestamp` - When error occurred
- `user_id` - User making request
- `user_role` - User role

---

## Database Schema

### 1. User Analytics Tables

#### `user_page_views`
```sql
CREATE TABLE user_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  session_id UUID NOT NULL,
  page_slug TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  view_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  time_on_page INTEGER, -- seconds, calculated on next page view
  scroll_depth INTEGER, -- percentage (0-100)
  interactions_count INTEGER DEFAULT 0,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_page_views_user_id ON user_page_views(user_id);
CREATE INDEX idx_page_views_session_id ON user_page_views(session_id);
CREATE INDEX idx_page_views_page_slug ON user_page_views(page_slug);
CREATE INDEX idx_page_views_timestamp ON user_page_views(view_timestamp);
CREATE INDEX idx_page_views_user_role ON user_page_views(user_role);
```

#### `user_actions`
```sql
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  session_id UUID NOT NULL,
  page_slug TEXT NOT NULL,
  action_type TEXT NOT NULL, -- click, submit, search, filter, etc.
  action_target TEXT, -- button_id, form_id, etc.
  action_context JSONB, -- Additional context data
  action_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_session_id ON user_actions(session_id);
CREATE INDEX idx_user_actions_page_slug ON user_actions(page_slug);
CREATE INDEX idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_timestamp ON user_actions(action_timestamp);
CREATE INDEX idx_user_actions_user_role ON user_actions(user_role);
```

#### `user_sessions`
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_end TIMESTAMPTZ,
  session_duration INTEGER, -- seconds, calculated on session end
  pages_visited TEXT[], -- Array of page slugs
  actions_count INTEGER DEFAULT 0,
  device_info JSONB,
  ip_address TEXT, -- Hashed for privacy
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_start ON user_sessions(session_start);
CREATE INDEX idx_user_sessions_user_role ON user_sessions(user_role);
```

### 2. APM Tables

#### `api_performance_metrics`
```sql
CREATE TABLE api_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_path TEXT NOT NULL,
  http_method TEXT NOT NULL,
  request_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  ip_address TEXT, -- Hashed
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_metrics_endpoint ON api_performance_metrics(endpoint_path);
CREATE INDEX idx_api_metrics_timestamp ON api_performance_metrics(request_timestamp);
CREATE INDEX idx_api_metrics_status_code ON api_performance_metrics(status_code);
CREATE INDEX idx_api_metrics_user_id ON api_performance_metrics(user_id);
CREATE INDEX idx_api_metrics_response_time ON api_performance_metrics(response_time_ms);
```

#### `database_performance_metrics`
```sql
CREATE TABLE database_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  query_duration_ms INTEGER NOT NULL,
  rows_affected INTEGER,
  query_hash TEXT, -- Hashed query for pattern detection
  slow_query BOOLEAN DEFAULT false,
  connection_pool_size INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_db_metrics_table_name ON database_performance_metrics(table_name);
CREATE INDEX idx_db_metrics_timestamp ON database_performance_metrics(timestamp);
CREATE INDEX idx_db_metrics_slow_query ON database_performance_metrics(slow_query);
CREATE INDEX idx_db_metrics_query_hash ON database_performance_metrics(query_hash);
```

#### `frontend_performance_metrics`
```sql
CREATE TABLE frontend_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  session_id UUID NOT NULL,
  page_slug TEXT NOT NULL,
  page_load_time INTEGER, -- milliseconds
  time_to_first_byte INTEGER,
  first_contentful_paint INTEGER,
  largest_contentful_paint INTEGER,
  cumulative_layout_shift DECIMAL(10,4),
  first_input_delay INTEGER,
  time_to_interactive INTEGER,
  dom_content_loaded INTEGER,
  window_load INTEGER,
  javascript_execution_time INTEGER,
  resource_load_times JSONB, -- Array of resource load times
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_frontend_metrics_user_id ON frontend_performance_metrics(user_id);
CREATE INDEX idx_frontend_metrics_session_id ON frontend_performance_metrics(session_id);
CREATE INDEX idx_frontend_metrics_page_slug ON frontend_performance_metrics(page_slug);
CREATE INDEX idx_frontend_metrics_timestamp ON frontend_performance_metrics(timestamp);
```

#### `server_performance_metrics`
```sql
CREATE TABLE server_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpu_usage DECIMAL(5,2), -- percentage
  memory_usage_mb INTEGER,
  event_loop_lag_ms INTEGER,
  active_handles INTEGER,
  active_requests INTEGER,
  uptime_seconds INTEGER,
  request_rate DECIMAL(10,2), -- requests per second
  error_rate DECIMAL(10,2), -- errors per second
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_server_metrics_timestamp ON server_performance_metrics(timestamp);
```

### 3. Crashlytics Tables

#### `error_logs`
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- JavaScript, API, Database, etc.
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code TEXT,
  error_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  session_id UUID,
  page_slug TEXT,
  url TEXT,
  user_agent TEXT,
  device_info JSONB,
  breadcrumbs JSONB, -- Array of user actions
  context JSONB, -- Additional context
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX idx_error_logs_timestamp ON error_logs(error_timestamp);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_error_code ON error_logs(error_code);
```

#### `crash_reports`
```sql
CREATE TABLE crash_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crash_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  crash_type TEXT NOT NULL, -- uncaught_exception, unhandled_rejection, etc.
  crash_message TEXT NOT NULL,
  crash_stack TEXT NOT NULL,
  crash_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  session_id UUID,
  page_slug TEXT,
  url TEXT,
  user_agent TEXT,
  device_info JSONB,
  memory_info JSONB,
  performance_info JSONB,
  breadcrumbs JSONB,
  release_version TEXT,
  environment TEXT NOT NULL, -- development, staging, production
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_crash_reports_crash_type ON crash_reports(crash_type);
CREATE INDEX idx_crash_reports_user_id ON crash_reports(user_id);
CREATE INDEX idx_crash_reports_timestamp ON crash_reports(crash_timestamp);
CREATE INDEX idx_crash_reports_resolved ON crash_reports(resolved);
CREATE INDEX idx_crash_reports_environment ON crash_reports(environment);
```

#### `api_error_logs`
```sql
CREATE TABLE api_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  endpoint_path TEXT NOT NULL,
  http_method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  request_body JSONB, -- Sanitized
  request_headers JSONB, -- Sanitized
  response_body JSONB, -- Sanitized
  error_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  ip_address TEXT, -- Hashed
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_error_logs_endpoint ON api_error_logs(endpoint_path);
CREATE INDEX idx_api_error_logs_status_code ON api_error_logs(status_code);
CREATE INDEX idx_api_error_logs_user_id ON api_error_logs(user_id);
CREATE INDEX idx_api_error_logs_timestamp ON api_error_logs(error_timestamp);
CREATE INDEX idx_api_error_logs_resolved ON api_error_logs(resolved);
```

---

## Architecture & Scalability

### 1. Data Collection Strategy

#### Client-Side Collection
- **Batch Collection**: Collect events in batches and send periodically (every 5-10 seconds or on page unload)
- **Queue System**: Use in-memory queue to buffer events before sending
- **Retry Logic**: Implement retry mechanism for failed sends
- **Compression**: Compress payloads before sending
- **Sampling**: Implement sampling for high-volume events (e.g., 10% of page views)

#### Server-Side Collection
- **Async Processing**: Use async queues (e.g., Bull, BullMQ) for non-blocking writes
- **Batch Inserts**: Batch multiple events into single database insert
- **Connection Pooling**: Use connection pooling for database operations
- **Rate Limiting**: Implement rate limiting to prevent abuse

### 2. Data Storage Strategy

#### Time-Based Partitioning
- Partition tables by month or quarter for better query performance
- Archive old data (> 1 year) to cold storage
- Use materialized views for common aggregations

#### Aggregation Tables
Create aggregated tables for faster reporting:
- `daily_user_analytics` - Daily aggregated user metrics
- `daily_api_performance` - Daily aggregated API performance
- `daily_error_summary` - Daily error summaries

#### Data Retention Policy
- **Raw Data**: Keep for 90 days
- **Aggregated Data**: Keep for 2 years
- **Error/Crash Data**: Keep for 1 year

### 3. Scalability Considerations

#### Horizontal Scaling
- Use read replicas for analytics queries
- Distribute writes across multiple database instances
- Use message queues (Redis, RabbitMQ) for event processing

#### Caching Strategy
- Cache frequently accessed analytics (e.g., dashboard metrics)
- Use Redis for real-time metrics
- Implement cache invalidation strategies

#### Performance Optimization
- Use database indexes strategically
- Implement query optimization
- Use materialized views for complex aggregations
- Implement pagination for large result sets

### 4. Privacy & Security

#### Data Privacy
- Hash IP addresses before storage
- Sanitize sensitive data in error logs
- Implement data retention policies
- Support GDPR compliance (right to deletion)

#### Access Control
- Restrict analytics access to authorized roles (Admin, Super Admin)
- Implement audit logging for analytics access
- Use RLS policies for user-specific analytics

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

1. **Database Schema Setup**
   - Create all analytics tables
   - Set up indexes
   - Create RLS policies
   - Set up partitioning (if needed)

2. **Core Analytics Service**
   - Create analytics service layer
   - Implement event collection utilities
   - Set up batch processing
   - Implement retry logic

3. **Client-Side Tracking Library**
   - Create analytics tracking library
   - Implement event queue
   - Set up batch sending
   - Add session tracking

### Phase 2: User Analytics (Weeks 3-4)

1. **Page View Tracking**
   - Integrate page view tracking in router
   - Track time on page
   - Track scroll depth
   - Track referrer

2. **Action Tracking**
   - Integrate action tracking in key components
   - Track form submissions
   - Track button clicks
   - Track search queries

3. **Session Tracking**
   - Implement session management
   - Track session start/end
   - Calculate session duration
   - Track pages visited per session

### Phase 3: APM Integration (Weeks 5-6)

1. **API Performance Tracking**
   - Add middleware for API performance tracking
   - Track response times
   - Track request/response sizes
   - Track status codes

2. **Database Performance Tracking**
   - Add database query tracking
   - Track slow queries
   - Monitor connection pool
   - Track query patterns

3. **Frontend Performance Tracking**
   - Integrate Web Vitals tracking
   - Track page load times
   - Track resource load times
   - Track JavaScript execution time

4. **Server Performance Tracking**
   - Add server metrics collection
   - Track CPU/memory usage
   - Track event loop lag
   - Track request/error rates

### Phase 4: Crashlytics Integration (Weeks 7-8)

1. **Error Tracking**
   - Set up global error handlers
   - Track JavaScript errors
   - Track API errors
   - Track database errors

2. **Crash Tracking**
   - Set up crash reporting
   - Track uncaught exceptions
   - Track unhandled rejections
   - Collect crash context

3. **Error Management**
   - Implement error grouping
   - Set up error alerts
   - Create error resolution workflow
   - Build error dashboard

### Phase 5: Analytics Dashboard (Weeks 9-10)

1. **User Analytics Dashboard**
   - Build user analytics dashboard
   - Show feature usage by role
   - Show time spent per feature
   - Show user engagement metrics

2. **Performance Dashboard**
   - Build performance dashboard
   - Show API performance metrics
   - Show frontend performance metrics
   - Show server performance metrics

3. **Error Dashboard**
   - Build error dashboard
   - Show error trends
   - Show crash reports
   - Show error resolution status

### Phase 6: Optimization & Scaling (Weeks 11-12)

1. **Performance Optimization**
   - Optimize database queries
   - Implement caching
   - Optimize data collection
   - Reduce overhead

2. **Scaling**
   - Set up read replicas
   - Implement data partitioning
   - Set up data archiving
   - Optimize batch processing

3. **Monitoring & Alerts**
   - Set up monitoring dashboards
   - Configure alerts for critical metrics
   - Set up error notifications
   - Monitor system health

---

## Integration Recommendations

### Recommended Third-Party Services

#### Option 1: Self-Hosted (Recommended for Privacy)
- **Analytics**: Custom implementation with PostgreSQL
- **APM**: Custom implementation with OpenTelemetry
- **Crashlytics**: Custom implementation with error tracking

**Pros:**
- Full control over data
- No third-party dependencies
- Better privacy compliance
- Cost-effective at scale

**Cons:**
- More development effort
- Requires infrastructure management
- Need to build dashboards

#### Option 2: Hybrid Approach
- **Analytics**: Mixpanel or Amplitude (for advanced analytics)
- **APM**: New Relic or Datadog (for APM)
- **Crashlytics**: Sentry (for error tracking)

**Pros:**
- Rich feature sets
- Pre-built dashboards
- Less development effort
- Industry-standard tools

**Cons:**
- Third-party dependencies
- Privacy concerns
- Cost at scale
- Data export limitations

#### Option 3: Open Source Stack
- **Analytics**: PostHog (self-hosted)
- **APM**: OpenTelemetry + Grafana
- **Crashlytics**: Sentry (self-hosted)

**Pros:**
- Open source
- Can self-host
- Good feature sets
- Community support

**Cons:**
- Requires infrastructure
- More setup complexity
- May need customization

### Recommended Implementation: Hybrid Approach

**For MVP/Initial Implementation:**
1. **Start with custom implementation** for core analytics
2. **Integrate Sentry** for crashlytics (can self-host)
3. **Use OpenTelemetry** for APM (vendor-neutral)

**For Production Scale:**
1. **Evaluate third-party services** based on:
   - Data volume
   - Budget constraints
   - Privacy requirements
   - Feature needs

2. **Consider migration path** from custom to third-party if needed

---

## Key Metrics to Track

### User Engagement Metrics
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Session duration
- Pages per session
- Bounce rate
- Return rate

### Feature Usage Metrics
- Feature adoption rate
- Feature usage frequency
- Time spent per feature
- Feature completion rate
- Feature abandonment rate

### Performance Metrics
- Average API response time
- P95/P99 API response time
- Error rate
- Uptime
- Page load time
- Core Web Vitals (LCP, FID, CLS)

### Error Metrics
- Error rate
- Error frequency by type
- Crash rate
- Error resolution time
- Most common errors

### Role-Based Metrics
- Usage by role
- Feature adoption by role
- Performance by role
- Error rate by role

---

## Next Steps

1. **Review and Approve Plan**
   - Review data points
   - Review database schema
   - Review implementation plan

2. **Set Up Development Environment**
   - Create feature branch
   - Set up database migrations
   - Set up development tools

3. **Begin Phase 1 Implementation**
   - Create database schema
   - Set up core services
   - Begin client-side tracking

4. **Iterate and Refine**
   - Gather feedback
   - Adjust data points as needed
   - Optimize performance

---

## Appendix

### A. Sample Event Payloads

#### Page View Event
```json
{
  "event_type": "page_view",
  "user_id": "uuid",
  "user_role": "Auditor",
  "session_id": "uuid",
  "page_slug": "dashboard",
  "page_path": "/src/features/dashboard/presentation/new-auditors-dashboard.html",
  "referrer": "/home",
  "timestamp": "2025-01-25T10:00:00Z",
  "device_info": { ... }
}
```

#### Action Event
```json
{
  "event_type": "action",
  "action_type": "click",
  "action_target": "filter-button",
  "user_id": "uuid",
  "user_role": "Auditor",
  "session_id": "uuid",
  "page_slug": "dashboard",
  "action_context": {
    "filter_type": "date_range",
    "filter_value": "last_7_days"
  },
  "timestamp": "2025-01-25T10:05:00Z"
}
```

#### Error Event
```json
{
  "event_type": "error",
  "error_type": "JavaScript",
  "error_message": "Cannot read property 'id' of undefined",
  "error_stack": "...",
  "user_id": "uuid",
  "user_role": "Auditor",
  "session_id": "uuid",
  "page_slug": "audit-form",
  "url": "https://app.example.com/audit-form",
  "breadcrumbs": [...],
  "timestamp": "2025-01-25T10:10:00Z"
}
```

### B. Database Migration Files

Migration files should be created in `src/db/migrations/`:
- `017_create_analytics_tables.sql`
- `018_create_apm_tables.sql`
- `019_create_crashlytics_tables.sql`
- `020_create_analytics_indexes.sql`
- `021_create_analytics_rls_policies.sql`

### C. Environment Variables

Add to `env.template`:
```env
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_SAMPLE_RATE=1.0
ANALYTICS_BATCH_SIZE=10
ANALYTICS_BATCH_INTERVAL_MS=5000

# APM Configuration
APM_ENABLED=true
APM_SLOW_QUERY_THRESHOLD_MS=1000
APM_SLOW_API_THRESHOLD_MS=500

# Crashlytics Configuration
CRASHLYTICS_ENABLED=true
CRASHLYTICS_ENVIRONMENT=production
CRASHLYTICS_RELEASE_VERSION=1.0.0

# Third-Party Integrations (Optional)
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
POSTHOG_API_KEY=your_posthog_key
POSTHOG_HOST=https://app.posthog.com
```

---

**Document Version**: 1.0  
**Last Updated**: January 25, 2025  
**Author**: AI Assistant  
**Status**: Draft - Pending Review
