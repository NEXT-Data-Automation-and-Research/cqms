# Analytics Data Points Quick Reference

## Overview

This document provides a quick reference for all data points that can be tracked in the Express CQMS platform for user analytics, APM, and crashlytics.

---

## User Analytics Data Points

### Page/Feature Views
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `page_slug` | Route identifier | `home`, `dashboard`, `audit-form` |
| `page_path` | Full page path | `/src/features/home/presentation/home-page.html` |
| `view_timestamp` | When page was viewed | `2025-01-25T10:00:00Z` |
| `user_id` | User identifier | UUID |
| `user_role` | Current user role | `Auditor`, `Admin`, `Manager` |
| `session_id` | Session identifier | UUID |
| `referrer` | Previous page | `/home` |
| `time_on_page` | Duration spent (seconds) | `120` |
| `scroll_depth` | Maximum scroll percentage | `75` |
| `interactions_count` | Number of interactions | `5` |

### User Actions
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `action_type` | Type of action | `click`, `submit`, `search`, `filter` |
| `action_target` | What was interacted with | `button_id`, `form_id`, `link_text` |
| `action_context` | Additional context | `{filter_type: "date_range"}` |
| `action_timestamp` | When action occurred | `2025-01-25T10:05:00Z` |
| `page_slug` | Page where action occurred | `dashboard` |

### Session Analytics
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `session_id` | Unique session identifier | UUID |
| `session_start` | Session start timestamp | `2025-01-25T10:00:00Z` |
| `session_end` | Session end timestamp | `2025-01-25T11:30:00Z` |
| `session_duration` | Total duration (seconds) | `5400` |
| `pages_visited` | Array of pages visited | `["home", "dashboard", "audit-form"]` |
| `actions_count` | Total actions in session | `25` |

### Role-Based Analytics
**Roles Tracked:**
- General User
- Employee
- Quality Analyst
- Auditor
- Quality Supervisor
- Manager
- Admin
- Super Admin

**Metrics per Role:**
- Most used features
- Average session duration
- Feature adoption rates
- Common navigation paths
- Peak usage times

---

## APM Data Points

### API Performance
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `endpoint_path` | API endpoint path | `/api/audits` |
| `http_method` | HTTP method | `GET`, `POST`, `PUT`, `DELETE` |
| `response_time_ms` | Response time (milliseconds) | `250` |
| `status_code` | HTTP status code | `200`, `404`, `500` |
| `request_size_bytes` | Request payload size | `1024` |
| `response_size_bytes` | Response payload size | `2048` |
| `user_id` | User making request | UUID |
| `user_role` | User role | `Auditor` |

### Database Performance
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `query_type` | Query type | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `table_name` | Table accessed | `audits`, `users` |
| `query_duration_ms` | Query execution time | `150` |
| `rows_affected` | Number of rows affected | `10` |
| `slow_query` | Flag for slow queries | `true`, `false` |

### Frontend Performance
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `page_load_time` | Time to load page (ms) | `1200` |
| `time_to_first_byte` | TTFB (ms) | `300` |
| `first_contentful_paint` | FCP (ms) | `800` |
| `largest_contentful_paint` | LCP (ms) | `1500` |
| `cumulative_layout_shift` | CLS (score) | `0.05` |
| `first_input_delay` | FID (ms) | `50` |
| `time_to_interactive` | TTI (ms) | `2000` |

### Server Performance
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `cpu_usage` | CPU usage percentage | `45.5` |
| `memory_usage_mb` | Memory usage (MB) | `512` |
| `event_loop_lag_ms` | Event loop lag (ms) | `5` |
| `request_rate` | Requests per second | `10.5` |
| `error_rate` | Errors per second | `0.1` |

---

## Crashlytics Data Points

### Error Tracking
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `error_type` | Error type | `JavaScript`, `API`, `Database` |
| `error_message` | Error message | `Cannot read property 'id' of undefined` |
| `error_stack` | Stack trace | Full stack trace string |
| `error_code` | Error code | `ERR_UNDEFINED` |
| `page_slug` | Page where error occurred | `audit-form` |
| `url` | Full URL | `https://app.example.com/audit-form` |
| `breadcrumbs` | User actions leading to error | Array of actions |
| `context` | Additional context | Form data, state, etc. |

### Crash Tracking
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `crash_type` | Type of crash | `uncaught_exception`, `unhandled_rejection` |
| `crash_message` | Crash message | `Uncaught TypeError: ...` |
| `crash_stack` | Full stack trace | Full stack trace string |
| `memory_info` | Memory information at crash | `{heapUsed: 100MB}` |
| `performance_info` | Performance metrics at crash | `{cpuUsage: 80%}` |
| `release_version` | Application version | `1.0.0` |
| `environment` | Environment | `production`, `staging`, `development` |

### API Error Tracking
| Data Point | Description | Example Values |
|------------|-------------|----------------|
| `endpoint_path` | API endpoint | `/api/audits` |
| `http_method` | HTTP method | `POST` |
| `status_code` | HTTP status code | `500` |
| `error_message` | Error message | `Database connection failed` |
| `request_body` | Request body (sanitized) | `{audit_id: "..."}` |
| `response_body` | Response body (sanitized) | `{error: "..."}` |

---

## Features to Track

### Core Features
- ✅ Home Page
- ✅ Auditors' Dashboard
- ✅ Audit Distribution
- ✅ Create Audit
- ✅ Audit Reports
- ✅ Performance (when available)
- ✅ Coaching & Remediation (when available)
- ✅ Reversal
- ✅ Event Management
- ✅ Improvement Corner
  - Calibration
  - ATA
  - Grading Guide
- ✅ Settings
  - Scorecards
  - User Management
  - Permissions
  - Access Control
  - Profile
- ✅ Help
  - Help
  - Bug Report
  - View Bug Reports
- ✅ Audit Form (Sandbox)

### Key Actions to Track
- Form submissions
- Button clicks
- Search queries
- Filter applications
- Sort operations
- Export actions
- Navigation events
- Modal opens/closes
- Tab switches
- Dropdown selections

---

## Key Metrics

### User Engagement
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Session duration
- Pages per session
- Bounce rate
- Return rate

### Feature Usage
- Feature adoption rate
- Feature usage frequency
- Time spent per feature
- Feature completion rate
- Feature abandonment rate

### Performance
- Average API response time
- P95/P99 API response time
- Error rate
- Uptime
- Page load time
- Core Web Vitals (LCP, FID, CLS)

### Errors
- Error rate
- Error frequency by type
- Crash rate
- Error resolution time
- Most common errors

---

## Data Collection Strategy

### Client-Side
- **Batch Collection**: Collect events in batches (every 5-10 seconds)
- **Queue System**: Use in-memory queue to buffer events
- **Retry Logic**: Retry failed sends
- **Compression**: Compress payloads before sending
- **Sampling**: Sample high-volume events (e.g., 10% of page views)

### Server-Side
- **Async Processing**: Use async queues for non-blocking writes
- **Batch Inserts**: Batch multiple events into single database insert
- **Connection Pooling**: Use connection pooling for database operations
- **Rate Limiting**: Implement rate limiting to prevent abuse

---

## Data Retention

- **Raw Data**: 90 days
- **Aggregated Data**: 2 years
- **Error/Crash Data**: 1 year

---

## Privacy Considerations

- Hash IP addresses before storage
- Sanitize sensitive data in error logs
- Implement data retention policies
- Support GDPR compliance (right to deletion)
- Restrict analytics access to authorized roles

---

**Last Updated**: January 25, 2025
