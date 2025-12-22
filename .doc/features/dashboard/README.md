# Auditor Dashboard - Clean Architecture

This feature follows a clean architecture pattern similar to Flutter, with clear separation of concerns across layers.

## Architecture Overview

```
dashboard/
├── domain/              # Domain Layer - Pure business entities and types
│   ├── entities.ts      # Domain entities (Auditor, TeamStats, etc.)
│   └── types.ts         # Type definitions and enums
│
├── infrastructure/      # Infrastructure Layer - Database operations
│   └── auditor-dashboard-repository.ts  # All database calls
│
├── application/         # Application Layer - State and business logic
│   ├── auditor-dashboard-state.ts       # Application state management
│   ├── auditor-dashboard-service.ts     # Business logic and calculations
│   └── auditor-dashboard-controller.ts  # Main orchestrator
│
└── presentation/        # Presentation Layer - UI components
    ├── auditor-dashboard-renderer.ts    # UI rendering logic
    ├── auditor-dashboard-events.ts      # Event handlers
    ├── components/                      # HTML components
    │   ├── auditor-dashboard-stats.html
    │   └── auditor-dashboard-filters.html
    ├── styles/                          # CSS styles
    │   └── auditor-dashboard.css
    └── auditor-dashboard-refactored.html  # Main HTML file
```

## Layer Responsibilities

### Domain Layer
- **Pure entities**: No dependencies on infrastructure or framework
- **Type definitions**: Interfaces, types, and enums
- **Business rules**: Core domain logic (if any)

### Infrastructure Layer
- **Database operations**: All Supabase queries
- **Data transformation**: Convert database results to domain entities
- **External services**: Any third-party integrations

### Application Layer
- **State management**: Centralized application state
- **Business logic**: Calculations, aggregations, data processing
- **Orchestration**: Coordinates between layers

### Presentation Layer
- **UI rendering**: DOM manipulation and updates
- **Event handling**: User interactions
- **Styling**: CSS and visual components
- **Components**: Reusable HTML fragments

## Usage

### Initialization

```typescript
import { auditorDashboardController } from './application/auditor-dashboard-controller.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await auditorDashboardController.initialize();
});
```

### Accessing State

```typescript
import { auditorDashboardState } from './application/auditor-dashboard-state.js';

// Read state
const currentTab = auditorDashboardState.currentTab;
const teamStats = auditorDashboardState.teamStats;
```

### Loading Data

```typescript
// Load team stats
await auditorDashboardController.loadTeamStats();

// Load standup view
await auditorDashboardController.loadStandupView();
```

## Key Features

1. **Clean Separation**: Each layer has a single responsibility
2. **Testability**: Easy to mock and test each layer independently
3. **Maintainability**: Changes in one layer don't affect others
4. **Reusability**: Domain entities can be reused across features
5. **Type Safety**: Full TypeScript support with proper types

## Theme Integration

All styles use global theme variables from `/theme.css`:
- `--primary-color`: Primary brand color
- `--font-family`: Font family
- `--spacing-*`: Spacing scale
- `--radius-*`: Border radius values
- `--shadow-*`: Shadow definitions

## Migration Notes

The original `auditor-dashboard.html` (5189 lines) has been refactored into:
- **Domain**: 2 files (~200 lines)
- **Infrastructure**: 1 file (~400 lines)
- **Application**: 3 files (~600 lines)
- **Presentation**: 4 files (~800 lines)

Total: ~2000 lines (vs 5189 original) with better organization and maintainability.

## Next Steps

1. Add unit tests for each layer
2. Implement error handling and retry logic
3. Add loading states and error boundaries
4. Optimize data fetching with caching
5. Add real-time updates via Supabase subscriptions

