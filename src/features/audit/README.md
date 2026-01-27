# Unified Audit Module

This module provides a unified audit page that consolidates create, edit, and view functionality into a single page with shared components.

## Overview

Previously, the audit functionality was spread across multiple pages:
- `new-audit-form.html` - Create and edit audits
- `audit-view.html` - View audit details

The unified audit page combines these into a single page with mode-based rendering.

## Features

- **Single Source of Truth**: One page handles all audit modes (create, edit, view)
- **Shared Components**: Reusable components from `audit-form/presentation/components/`
- **Mode-Based Rendering**: UI adapts based on the current mode
- **Permission-Aware**: Buttons and actions shown based on user permissions
- **Gradual Migration**: Feature flags allow incremental rollout

## Directory Structure

```
src/features/audit/
├── presentation/
│   ├── unified-audit.html           # Main unified page
│   ├── unified-audit-controller.ts  # Page controller
│   ├── unified-audit-config.ts      # Feature flags & configuration
│   └── index.ts                     # Module exports
└── README.md                        # This file
```

## Usage

### URL Parameters

The unified page uses URL parameters to determine mode:

| URL | Mode |
|-----|------|
| `/unified-audit.html` | Create |
| `/unified-audit.html?mode=create` | Create |
| `/unified-audit.html?mode=edit&id=xxx&scorecard=yyy&table=zzz` | Edit |
| `/unified-audit.html?id=xxx&scorecard=yyy&table=zzz` | View |
| `/unified-audit.html?mode=view&id=xxx&scorecard=yyy&table=zzz` | View |

### Programmatic Navigation

```typescript
import { getAuditPageUrl } from './unified-audit-config.js';

// Get URL for create mode
const createUrl = getAuditPageUrl('create');

// Get URL for edit mode
const editUrl = getAuditPageUrl('edit', auditId, scorecardId, tableName);

// Get URL for view mode
const viewUrl = getAuditPageUrl('view', auditId, scorecardId, tableName);
```

## Feature Flags

The unified page is controlled by feature flags for gradual rollout:

### Enable via Console

```javascript
// Enable for all users
window.unifiedAuditConfig.enableAll();

// Disable for all users
window.unifiedAuditConfig.disableAll();

// Check current config
window.unifiedAuditConfig.get();

// Enable for specific modes
window.unifiedAuditConfig.set({
  enableForCreate: true,
  enableForEdit: true,
  enableForView: false
});
```

### Enable via URL Parameter

Add `?useUnifiedAudit=true` to any URL to force the unified page.

### Enable for Specific Users

```javascript
window.unifiedAuditConfig.set({
  enabledForUsers: ['user@example.com', 'tester@example.com']
});
```

## Components Used

The unified page leverages existing modular components:

- `AuditFormOrchestrator` - Main controller that coordinates all components
- `FormHeaderComponent` - Header with employee info and metadata
- `TranscriptSection` - Left column with conversation/transcript
- `ErrorDetailsSection` - Right column with parameters and scores
- `RatingSection` - Star rating (view mode)
- `ReversalSection` - Reversal request/response (view mode)
- `ActionButtons` - Mode-specific action buttons

## Services Used

- `AuditDataService` - Load/save audit data
- `PermissionService` - Check user permissions

## Migration Guide

### Phase 1: Enable for Testing
```javascript
window.unifiedAuditConfig.set({ enabledForUsers: ['tester@example.com'] });
```

### Phase 2: Enable for Specific Modes
```javascript
window.unifiedAuditConfig.set({ 
  enableForCreate: true,
  enableForEdit: false,
  enableForView: false
});
```

### Phase 3: Enable for All
```javascript
window.unifiedAuditConfig.enableAll();
```

### Phase 4: Remove Legacy Pages
Once validated, the legacy pages can be deprecated:
- `src/features/audit-form/presentation/new-audit-form.html`
- `src/features/audit-view.html`

## Development

### Running Locally

1. Start the dev server: `npm run dev`
2. Navigate to `/src/features/audit/presentation/unified-audit.html`
3. Use URL parameters to test different modes

### Testing

To test the unified page:

```javascript
// In browser console:
window.unifiedAuditConfig.enableAll();

// Then navigate to an audit view page and verify it uses the unified page
```

## Troubleshooting

### Page Not Loading

1. Check browser console for errors
2. Verify Supabase client is initialized
3. Check URL parameters are correct

### Wrong Mode

1. Verify URL parameters: `mode`, `id`, `scorecard`, `table`
2. Check if `edit` parameter is present (implies edit mode)

### Components Not Rendering

1. Check if DOM elements exist with expected IDs
2. Verify component initialization logs in console
3. Check for JavaScript errors

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     unified-audit.html                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UnifiedAuditController                      │   │
│  │  - Parses URL to determine mode                         │   │
│  │  - Initializes services and components                  │   │
│  │  - Handles navigation and actions                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AuditFormOrchestrator                       │   │
│  │  - Coordinates all child components                     │   │
│  │  - Manages form state                                    │   │
│  │  - Handles mode switching                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Header    │     │  Transcript │     │   Error     │       │
│  │  Component  │     │   Section   │     │  Details    │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Rating    │     │  Reversal   │     │   Action    │       │
│  │   Section   │     │   Section   │     │   Buttons   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ AuditDataService│             │PermissionService│
    │  - loadAudit()  │             │  - canEdit()    │
    │  - saveAudit()  │             │  - canAck()     │
    │  - updateAudit()│             │  - canReversal()│
    └─────────────────┘             └─────────────────┘
```
