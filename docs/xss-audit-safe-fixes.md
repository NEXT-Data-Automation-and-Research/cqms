# XSS (innerHTML) safe fixes

We only escape or sanitize **user- or API-derived** content. Static templates and developer-controlled HTML are left unchanged so the app does not break.

## What was fixed (safe pass)

| File | Change |
|------|--------|
| `src/features/audit-form/presentation/controllers/audit-editor-controller.ts` | **Feedback text in Quill:** When loading audit feedback into the editor, plain text is set with `escapeHtml(feedbackText)`. When content looks like HTML, it is set with `sanitizeHTML(feedbackText, false)` so allowed tags are kept and scripts/events are stripped. |
| `src/features/bau-materics.html` | **Day headers:** `day.dayName`, `day.month`, `day.dayNum`, `day.year`, and `day.dayIndex` are escaped with `escapeHtml()` before being used in `innerHTML` (data can come from API). |
| `src/features/audit-form/presentation/new-audit-form.html` | **Scorecard display:** `scoringTypeText` (can come from scorecard config) is wrapped with `escapeHtml(scoringTypeText || '')` in the label span. **Audit cards:** `getInitials(displayName)` wrapped with `escapeHtml()` in the card avatar (displayName from API). |
| `src/features/create-audit/presentation/new-create-audit.html` | **Scorecard display:** same `scoringTypeText` escape. **Feedback textarea:** `existingFeedbacks[i]` escaped with `escapeHtml()` when pre-filling feedback fields. **Conversation ID:** In `buildConversationLinkHTML`, conversationId displayed with `escapeHtml(conversationId)` and passed to `copyToClipboard` via JS-string-escaped value (backslash and single-quote). **Pull conversations table row:** conversationId in span and in copy button onclick escaped (display: `escapeHtml`, onclick: JS-string escape). **AI audit table row:** conversationId in checkbox `data-conversation-id`, span, and `toggleAIAuditConversation` onclick escaped. **Conversations table (date range):** conversationId in div and `copyConversationId` onclick escaped; `conversation.id` in audit-view URL passed as `encodeURIComponent(conversation.id)`. **Admin search result:** `adminId` displayed with `escapeHtml(adminId)`. **createIndividualAuditCardHTML:** conversation ID input `value` set with `escapeHtml(conversationId || '')`; Intercom conversation URL built with `encodeURIComponent(conversationId)`; `getInitials(displayName)` wrapped with `escapeHtml()` in both nested and non-nested card layouts. |
| **Batch 2** | |
| `src/features/audit-form/presentation/utils/conversation-filter-helpers.ts` | **Subject stripping:** No longer uses `tempDiv.innerHTML = subject` (XSS if subject contained script). HTML tags are stripped with a regex: `subject.replace(/<[^>]*>/g, '').trim()`. |
| `src/features/audit-form/presentation/new-audit-form.html` | **Error parameters row:** `param.error_name` and `severityLabel` (from scorecard/API) escaped with `escapeHtml()` in `rowDiv.innerHTML`. **Active filter tags:** `filter.key` in `removePullConversationFilter` onclick escaped for JS string (backslash and single-quote). **Employee search list:** `data-value` attribute set with `escapeHtml(opt.value)` so option value is safe in HTML. |
| `src/features/settings/permissions/presentation/permission-management.ts` | **User search results:** `getInitials(user.name)` wrapped with `this.escapeHtml()`. **Individual permissions table:** `getInitials(userName)` wrapped with `this.escapeHtml()`; access type badge text `rule.access_type.toUpperCase()` escaped with `this.escapeHtml()`. |
| `src/features/create-audit/presentation/components/assigned-audits-sidebar/assigned-audits-sidebar.ts` | **decodeHtmlEntities:** Replaced `textarea.innerHTML = text` (unsafe when text is from URL/API) with a regex-based decoder that only decodes `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#N;`, `&#xN;` without parsing HTML. |
| **Batch 3** | |
| `src/features/settings/user-management/presentation/user-management-main.ts` | **Init error message:** `error.message` in the catch block innerHTML is escaped with `escapeHtml()` so API/thrown messages cannot inject HTML. |
| `src/utils/form-validation.ts` | **Field error display:** Validation error message in `showFieldError` is escaped with `escapeHtml(error)` so error text (e.g. from custom validators or API) cannot inject HTML. |
| `src/features/reversal/presentation/reversal-controller.ts` | **Reversal card avatar:** `initials` (from `getInitials(employeeName)`, employeeName from API) is wrapped with `this.escapeHtml(initials)`. |
| `src/features/notifications/application/audit-assignment-realtime.ts` | **Assignment toast:** `displayName` (from employee name / API) in the toast message is escaped with `escapeHtml(displayName)`. |
| **Batch 4** | |
| `src/features/platform-notifications/application/platform-notifications-realtime.ts` | **Platform toast:** `notification.title` and `notification.message` escaped with `escapeHtml()`. `notification.action_label` escaped. **action_url:** Only `https?://` URLs are used in the action link; others are dropped. Link uses `escapeHtml(safeActionUrl)` and `rel="noopener noreferrer"`. |
| `src/features/create-audit/presentation/components/conversations-panel/conversations-panel.ts` | **Clipboard onclick:** Conversation ID in the copy `onclick` handler is JS-string-escaped (`idForClipboard`) so a conversation ID containing a quote cannot break out of the single-quoted JS string. |
| **Batch 5** | |
| `src/features/event-management/presentation/event-events.ts` | **Day events list:** `event.title`, `event.start_time`, `event.end_time`, `event.id` (data-event-id), and `formattedDate` escaped with `escapeHtml()` so API/DB event data cannot inject HTML. |
| `src/features/event-management/presentation/event-modal-manager.ts` | **Event type label:** `typeLabels[event.type] || event.type` escaped with `escapeHtml()`. **Event times:** `event.start_time` and `event.end_time` escaped. **Quick-add options:** `field` and `value` in `addGroupMembers` onclick are JS-string-escaped (`fieldForJs`, `valueForJs`) so values with quotes cannot break the handler. |
| `src/features/cache-management/application/cache-clear-realtime.ts` | **Impersonation/cache notifications:** `data.targetEmail`, `data.reason` (in all notification and modal variants), and `targetEmail`/`formattedTime` in the “Impersonation Session Ended” notice are escaped with `escapeHtml()`. |
| **Batch 6** | |
| `src/features/audit/presentation/unified-audit-controller.ts` | **Error view:** The error message passed to `showError(message)` is escaped with `escapeHtml(message)` so API/thrown messages cannot inject HTML in the “Error Loading Audit” view. |

## What was not changed (by design)

- **Static HTML / SVG:** e.g. timer play/pause icons, static option text, fixed labels — no user data, so no change.
- **Numbers only:** e.g. `passingRate`, `activeUsers`, `addedCount`, `colspan` — not XSS vectors; left as-is.
- **Already escaped:** Many files already use `escapeHtml()` or `esc()` for user/API data (e.g. audit-view, home-page, lagacy-audit-distribution, new-auditors-dashboard, performance-analytics, massive-ai-audit-result, my-audit-results). Those were not modified.

## How to continue the audit

1. For each `innerHTML` (or similar) that uses a **variable**, ask: could this value come from the user or from an API?
2. If **yes** → use `escapeHtml(value)` for plain text, or `sanitizeHTML(value, false)` for allowed rich text. Ensure `escapeHtml` / `sanitizeHTML` is in scope (from `src/utils/html-sanitizer.ts` or a local helper).
3. If **no** (static string, or number, or constant from our code) → leave as-is.
4. After each change, run the app and confirm the screen still looks and works the same.

## Helpers

- **Plain text:** `escapeHtml(text)` or `element.textContent = text`.
- **Rich text (limited HTML):** `sanitizeHTML(html, false)` or `safeSetHTML(element, html)` from `src/utils/html-sanitizer.ts`.
