# Home Feature Context Guide

**Purpose**: Quick reference guide for understanding the Home Dashboard feature structure, data flow, and module organization. This document helps AI assistants and developers quickly navigate the codebase.

**Last Updated**: 2024

---

## ⚡ Quick Reference

| What You Need | File Location |
|--------------|---------------|
| **Main Entry Point** | `presentation/home-page.html` |
| **Orchestrator** | `infrastructure/home-main.ts` (182 lines) |
| **State Management** | `infrastructure/state.ts` → `homeState` |
| **All Modules** | `infrastructure/modules/` |
| **Statistics Logic** | `modules/stats-calculator.ts` + `stats-renderer.ts` |
| **Audit Loading** | `modules/audit-loader.ts` + `audit-renderer.ts` |
| **Updates Feed** | `modules/updates-loader.ts` + `updates-renderer.ts` |
| **Filters** | `modules/filter-manager.ts` + `action-handlers.ts` |
| **Date Filtering** | `infrastructure/date-filter-manager.ts` |
| **User Profile** | `modules/user-profile-manager.ts` |
| **Notifications** | `modules/notification-manager.ts` |
| **Event Listeners** | `modules/event-listeners.ts` |
| **UI Visibility** | `modules/ui-visibility-manager.ts` |
| **User Actions** | `modules/action-handlers.ts` |
| **Components** | `components/` directory |
| **Types** | `infrastructure/types.ts` + `domain/types.ts` |
| **Utilities** | `infrastructure/utils.ts` |

---

## 📁 Directory Structure

```
src/features/home/
├── application/              # Business logic layer (currently minimal)
├── components/               # Reusable UI components
│   ├── action-buttons/      # Filter and action buttons
│   ├── assigned-audits/    # Assigned audits list component
│   ├── header/              # Top navigation header
│   ├── stats-cards/         # Statistics cards display
│   ├── updates-feed/        # Recent updates feed
│   └── user-profile-dashboard/  # User profile section
├── domain/                  # Domain entities and types
│   ├── entities.ts         # Domain entities
│   └── types.ts            # Domain type definitions
├── infrastructure/         # Infrastructure layer (main logic)
│   ├── modules/            # Feature modules (see below)
│   ├── component-loader.ts # Dynamic component loader
│   ├── data-service.ts     # Data service utilities
│   ├── date-filter-manager.ts  # Date/week filtering logic
│   ├── date-filter.ts      # Date filter utilities
│   ├── home-main.ts        # ⭐ MAIN ORCHESTRATOR (182 lines)
│   ├── home-state.ts       # State management class
│   ├── state.ts            # ⭐ Singleton state instance
│   ├── types.ts            # TypeScript type definitions
│   └── utils.ts            # Utility functions
├── presentation/           # Presentation layer
│   ├── home-page.html      # ⭐ Main HTML entry point
│   └── header-handler.ts  # Header interaction handler
└── styles/                 # Feature-specific styles
    └── home-page-inline.css
```

---

## 🎯 Entry Points

### Primary Entry Point
**File**: `src/features/home/presentation/home-page.html`
- Main HTML page that loads all components
- Initializes Supabase first
- Loads components dynamically via `component-loader.ts`
- Imports `home-main.ts` after components are loaded

### Main Orchestrator
**File**: `src/features/home/infrastructure/home-main.ts` (182 lines)
- **Purpose**: Coordinates all dashboard modules
- **Initialization Flow**:
  1. Waits for `DOMContentLoaded`
  2. Initializes user state from localStorage
  3. Sets up UI visibility based on user role
  4. Waits for Supabase client
  5. Loads users (with caching)
  6. Loads all dashboard data in parallel
  7. Populates filters (non-blocking)

---

## 🧩 Module Architecture

The home feature follows a **modular architecture** where `home-main.ts` acts as an orchestrator that delegates to specialized modules.

### Core Modules (`infrastructure/modules/`)

#### 1. **Date & Filter Management**
- **`date-filter-manager.ts`** - Manages week/date range filtering
  - Handles week navigation
  - Date range selection
  - Period calculation for queries

#### 2. **Data Loading Modules** (Loader Pattern)
- **`updates-loader.ts`** (361 lines) - Loads recent audit updates
- **`audit-loader.ts`** (181 lines) - Loads assigned audits
- **`events-loader.ts`** (107 lines) - Loads upcoming events
- **`stats-calculator.ts`** (572 lines) - Calculates statistics

#### 3. **Rendering Modules** (Renderer Pattern)
- **`updates-renderer.ts`** (174 lines) - Renders updates feed
- **`audit-renderer.ts`** (301 lines) - Renders assigned audits list
- **`events-renderer.ts`** (79 lines) - Renders upcoming events
- **`stats-renderer.ts`** (140 lines) - Renders statistics cards

#### 4. **UI Management Modules**
- **`filter-manager.ts`** (137 lines) - Populates and manages filters
- **`user-profile-manager.ts`** (264 lines) - User profile and avatar management
- **`ui-visibility-manager.ts`** (68 lines) - Controls UI visibility by role
- **`notification-manager.ts`** (354 lines) - Notification handling
- **`event-listeners.ts`** (208 lines) - Sets up all event listeners

#### 5. **Action Handlers**
- **`action-handlers.ts`** (90 lines) - Handles filter/date/sort actions
  - `applyFilters()` - Applies channel/status/agent filters
  - `applyDateFilter()` - Applies date range filter
  - `clearDateFilter()` - Clears date filter
  - `sortAssignedAudits()` - Sorts audit list
  - `toggleSortMenu()` - Toggles sort dropdown

---

## 🔄 Data Flow

### Initialization Sequence

```
1. home-page.html loads
   ↓
2. Supabase initializes (supabase-init.js)
   ↓
3. Components load dynamically (component-loader.ts)
   ├── header.html
   ├── user-profile-dashboard.html
   ├── action-buttons.html
   ├── stats-cards.html
   ├── updates-feed.html
   └── assigned-audits.html
   ↓
4. home-main.ts initializes (DOMContentLoaded)
   ├── Initialize state from localStorage
   ├── Setup UI visibility (agent vs manager)
   ├── Wait for Supabase client
   ├── Load users (with cache)
   └── Load dashboard data in parallel:
       ├── Recent updates
       ├── Statistics
       ├── Assigned audits
       ├── Notifications
       └── Upcoming events
```

### State Management

**File**: `src/features/home/infrastructure/state.ts`
- **Singleton**: `homeState` (exported instance)
- **State Properties**:
  - `currentUserEmail`, `currentUserRole`, `isAgent`
  - `allUsers[]`, `allAssignments[]`, `assignedAudits[]`
  - `notifications[]`, `unreadNotificationCount`
  - `dateFilter`, `currentFilters`, `currentWeek`, `useWeekFilter`
  - `sortBy` (for audit sorting)

### Data Loading Pattern

**Loader → State → Renderer**

1. **Loader** fetches data from Supabase
2. Data stored in `homeState` or module state
3. **Renderer** reads from state and updates DOM

Example:
```typescript
// Loader
const updates = await updatesLoader.loadRecentUpdates(period, users);
// State (implicit via homeState or return value)
// Renderer
updatesRenderer.render(updates);
```

---

## 🔌 Global Functions

Functions exposed on `window` object for HTML `onclick` handlers:

**Defined in `home-main.ts`:**
- `window.logout()` - Logs out user
- `window.applyFilters()` - Applies filters
- `window.applyDateFilter()` - Applies date filter
- `window.clearDateFilter()` - Clears date filter
- `window.sortAssignedAudits()` - Sorts audits
- `window.toggleSortMenu()` - Toggles sort menu
- `window.showNotifications()` - Shows notifications
- `window.hideNotifications()` - Hides notifications

**Defined in `components/header/header.ts`:**
- `window.hideNotifications()` - Hides notification modal
- `window.hideCalendar()` - Hides calendar modal
- `window.hideGrid()` - Hides grid modal
- `window.hideAvatarLogout()` - Hides avatar menu

**Defined in `date-filter-manager.ts` (via date-filter.ts):**
- `window.getDhakaNow()` - Gets current time in Dhaka timezone
- `window.getDhakaWeekNumber()` - Gets week number
- `window.getDhakaWeekDates()` - Gets week start/end dates
- `window.formatDhakaDate()` - Formats date for display
- And other date utility functions...

---

## 🎨 Component Structure

### HTML Components (Loaded Dynamically)

1. **Header** (`components/header/header.html`)
   - Navigation bar
   - Notifications, calendar, quick actions
   - User avatar menu

2. **User Profile Dashboard** (`components/user-profile-dashboard/`)
   - User avatar and info
   - Premium dashboard features
   - Initializes independently

3. **Action Buttons** (`components/action-buttons/`)
   - Date filter controls
   - Week navigation
   - Filter dropdowns

4. **Stats Cards** (`components/stats-cards/`)
   - Statistics display cards
   - Different cards for agents vs managers

5. **Updates Feed** (`components/updates-feed/`)
   - Recent audit updates list
   - Real-time updates

6. **Assigned Audits** (`components/assigned-audits/`)
   - List of assigned audits
   - Sorting and filtering
   - Status indicators

---

## 🔍 Key Files Reference

### State & Types
- **`infrastructure/state.ts`** - Singleton state instance (`homeState`)
- **`infrastructure/types.ts`** - TypeScript interfaces
- **`domain/types.ts`** - Domain type definitions

### Utilities
- **`infrastructure/utils.ts`** - Helper functions
  - `formatTimestamp()`, `getStatusText()`, `escapeHtml()`
  - `viewAudit()`, `viewAuditDetails()`

### Date Management
- **`infrastructure/date-filter-manager.ts`** - Date filtering logic
- **`infrastructure/date-filter.ts`** - Date utility functions

### Component Loading
- **`infrastructure/component-loader.ts`** - Dynamic component loader

---

## 🚀 Common Tasks & Where to Find Code

### Adding a New Dashboard Section
1. Create loader in `modules/` (e.g., `my-data-loader.ts`)
2. Create renderer in `modules/` (e.g., `my-data-renderer.ts`)
3. Import in `home-main.ts`
4. Add to `initializeDashboard()` parallel load
5. Create HTML component in `components/`

### Modifying Statistics
- **Calculation**: `modules/stats-calculator.ts`
- **Rendering**: `modules/stats-renderer.ts`
- **Display**: `components/stats-cards/stats-cards.html`

### Modifying Filters
- **Population**: `modules/filter-manager.ts`
- **Application**: `modules/action-handlers.ts`
- **UI**: `components/action-buttons/action-buttons.html`

### Modifying Date Filtering
- **Logic**: `infrastructure/date-filter-manager.ts`
- **Actions**: `modules/action-handlers.ts`
- **Utilities**: `infrastructure/date-filter.ts`

### Modifying Audit List
- **Loading**: `modules/audit-loader.ts`
- **Rendering**: `modules/audit-renderer.ts`
- **Sorting**: `modules/action-handlers.ts` → `sortAssignedAudits()`
- **UI**: `components/assigned-audits/assigned-audits.html`

### Modifying User Profile
- **Management**: `modules/user-profile-manager.ts`
- **Component**: `components/user-profile-dashboard/`

### Modifying Notifications
- **Management**: `modules/notification-manager.ts`
- **Display**: `components/header/header.html`

### Adding Event Listeners
- **Setup**: `modules/event-listeners.ts`
- Add new listener methods to `EventListenersManager` class

---

## 📊 Module Dependencies

```
home-main.ts (Orchestrator)
├── DateFilterManager
├── UpdatesLoader → UpdatesRenderer
├── AuditLoader → AuditRenderer
├── StatsCalculator → StatsRenderer
├── FilterManager
├── UserProfileManager
├── EventListenersManager
├── EventsLoader → EventsRenderer
├── NotificationManager
├── UIVisibilityManager
└── ActionHandlers
    ├── DateFilterManager
    ├── UpdatesLoader + UpdatesRenderer
    ├── StatsCalculator + StatsRenderer
    ├── AuditLoader + AuditRenderer
    └── NotificationManager
```

---

## 🎭 User Role Differences

### Agent View (`isAgent: true`)
- Shows "My Audits" section
- Shows pass rate and acknowledgment cards
- Hides manager-specific stats
- Different filter options

### Manager View (`isAgent: false`)
- Shows "My Assigned Audits" section
- Shows duration, quality score, conducted, remaining cards
- More comprehensive statistics
- Different sorting defaults

**Handled by**: `UIVisibilityManager.setup(isAgent)`

---

## 🔐 Authentication & Security

- **Authentication**: Checked via `auth-checker.js` (loaded first)
- **Supabase**: Initialized before any components
- **User Info**: Stored in `localStorage.getItem('userInfo')`
- **State**: Initialized from user info in `homeState.initialize()`

---

## 💾 Caching Strategy

- **Users**: Cached in `sessionStorage` for 5 minutes
  - Key: `cachedUsers`, `cachedUsersTime`
  - Managed in `loadUsersWithCache()` in `home-main.ts`

- **Other Data**: No explicit caching (fetched on each load)
  - Consider adding cache for stats/updates if needed

---

## 🐛 Debugging Tips

1. **Check State**: `console.log(homeState)` in browser console
2. **Check Supabase**: Verify `window.supabaseClient` exists
3. **Check Components**: Verify all components loaded in DOM
4. **Check Modules**: Each module can be tested independently
5. **Check Filters**: `homeState.currentFilters` shows active filters
6. **Check Date Filter**: `dateFilterManager.getDateFilter()` shows date range

---

## 📝 File Size Compliance

All files must be **≤ 250 lines** (per cursor rules).

**Current Status**:
- ✅ `home-main.ts`: 182 lines
- ✅ `ui-visibility-manager.ts`: 68 lines
- ✅ `action-handlers.ts`: 90 lines
- ⚠️ Some modules exceed limit (noted in module list above)

---

## 🔄 Refactoring History

The `home-main.ts` file was refactored from **4,316 lines** to **182 lines** by:
1. Extracting loaders (data fetching)
2. Extracting renderers (UI updates)
3. Extracting managers (business logic)
4. Creating action handlers (user interactions)
5. Creating UI visibility manager (role-based UI)

See `infrastructure/REFACTORING_GUIDE.md` for details.

---

## 📚 Related Documentation

- `infrastructure/REFACTORING_GUIDE.md` - Refactoring documentation
- `infrastructure/modules/README.md` - Module documentation
- `CYBERSECURITY_ASSESSMENT_COMPREHENSIVE.md` - Security notes

---

**Quick Navigation**:
- **Main Entry**: `presentation/home-page.html`
- **Orchestrator**: `infrastructure/home-main.ts`
- **State**: `infrastructure/state.ts` → `homeState`
- **Modules**: `infrastructure/modules/`
- **Components**: `components/`

