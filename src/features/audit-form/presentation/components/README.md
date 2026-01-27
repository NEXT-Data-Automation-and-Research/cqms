# Audit Form Modular Components

This directory contains modular, reusable components for the audit form. Each component is self-contained and can be used independently or together via the `AuditFormOrchestrator`.

## Components Overview

### 1. **AuditTimer** (`audit-timer.ts`)
Handles the floating timer display and controls.

**Features:**
- Play/Pause/Reset functionality
- Draggable timer chip
- Elapsed time tracking
- Configurable callbacks

**Usage:**
```typescript
import { AuditTimer } from './audit-timer.js';

const timer = new AuditTimer({
  onPlay: () => console.log('Timer started'),
  onPause: () => console.log('Timer paused'),
  onReset: () => console.log('Timer reset'),
  onClose: () => console.log('Timer closed')
});

timer.render(containerElement);
timer.show();
timer.play();
```

### 2. **FormHeaderComponent** (`form-header-component.ts`)
Manages the form header with employee info, metadata cards, and close button.

**Features:**
- Employee information display/edit
- Metadata cards (Date, Quarter, Week, Errors, Status, Score)
- Close button with ESC key support
- Uses existing `header-template.ts` for HTML generation

**Usage:**
```typescript
import { FormHeaderComponent } from './form-header-component.js';

const header = new FormHeaderComponent({
  onClose: () => console.log('Form closed'),
  headerOptions: {
    title: 'Create New Audit',
    mode: 'edit'
  }
});

header.render(containerElement);
header.updateMetadata({ averageScore: 85, passingStatus: 'Pass' });
```

### 3. **AIAuditIndicatorComponent** (`ai-audit-indicator-component.ts`)
Displays AI audit loading/success banner.

**Features:**
- Loading state with spinner
- Success state with confidence score
- Clear button
- Auto-hide functionality

**Usage:**
```typescript
import { AIAuditIndicatorComponent } from './ai-audit-indicator-component.js';

const indicator = new AIAuditIndicatorComponent({
  onClear: () => console.log('AI data cleared')
});

indicator.render(containerElement);
indicator.showLoading();
indicator.showLoaded(95); // 95% confidence
indicator.hide();
```

### 4. **TranscriptSection** (`transcript-section.ts`)
Manages the left column with interaction details and chat/transcript view.

**Features:**
- Interaction ID input
- Date, client name, and email fields
- Chat view and text view toggle
- Conversation details grid
- Copy buttons for ID and email

**Usage:**
```typescript
import { TranscriptSection } from './transcript-section.js';

const transcript = new TranscriptSection({
  onInteractionIdChange: (id) => console.log('ID changed:', id),
  onViewChat: () => console.log('View chat clicked'),
  onCopyConversationId: () => console.log('ID copied')
});

transcript.render(containerElement);
// Or use with existing DOM:
transcript.initializeWithExistingDOM();
```

### 5. **ErrorDetailsSection** (`error-details-section.ts`)
Handles the right column with error counts, parameters table, score, and recommendations.

**Features:**
- Error count displays (Total, Critical Fail, Critical, Significant, Major, Minor)
- Scorecard and channel selection
- Error parameters table
- Average score and passing status
- Recommendations editor

**Usage:**
```typescript
import { ErrorDetailsSection } from './error-details-section.js';

const errorDetails = new ErrorDetailsSection({
  onScorecardChange: (id) => console.log('Scorecard changed:', id),
  onChannelChange: (channel) => console.log('Channel changed:', channel)
});

errorDetails.render(containerElement);
// Or use with existing DOM:
errorDetails.initializeWithExistingDOM();

errorDetails.updateErrorCount('total', 5);
errorDetails.updateErrorCount('critical', 2);
```

### 6. **FormActions** (`form-actions.ts`)
Manages validation dropdown and action buttons (Cancel/Submit).

**Features:**
- Validation status dropdown
- Cancel and Submit buttons
- Loading state management
- Form submission handling

**Usage:**
```typescript
import { FormActions } from './form-actions.js';

const formActions = new FormActions({
  onSubmit: () => console.log('Form submitted'),
  onCancel: () => console.log('Form cancelled'),
  onValidationStatusChange: (status) => console.log('Status:', status)
});

formActions.render(containerElement);
// Or use with existing DOM:
formActions.initializeWithExistingDOM();

formActions.setSubmitLoading(true);
```

### 7. **SplitterComponent** (`splitter-component.ts`)
Provides resizable splitter between left and right columns.

**Features:**
- Drag-to-resize functionality
- Minimum/maximum width constraints
- Smooth resizing

**Usage:**
```typescript
import { SplitterComponent } from './splitter-component.js';

const splitter = new SplitterComponent();
splitter.render(splitterElement, leftColumn, rightColumn);
```

### 8. **AuditFormOrchestrator** (`audit-form-orchestrator.ts`)
Main controller that ties all components together.

**Features:**
- Initializes all components
- Coordinates component interactions
- Handles form submission
- Works with existing HTML structure (enhances rather than replaces)

**Usage:**
```typescript
import { AuditFormOrchestrator } from './audit-form-orchestrator.js';

const orchestrator = new AuditFormOrchestrator({
  onFormSubmit: async (formData) => {
    // Handle form submission
    console.log('Submitting form...');
  },
  onFormCancel: () => {
    // Handle form cancellation
    console.log('Form cancelled');
  }
});

const formElement = document.getElementById('auditForm') as HTMLFormElement;
orchestrator.initialize(formElement);

// Access individual components:
const timer = orchestrator.getTimer();
const header = orchestrator.getHeader();
// etc.
```

## Integration with Existing HTML

The components are designed to work with the existing HTML structure in `new-audit-form.html`. They enhance the existing DOM rather than replacing it, ensuring backward compatibility.

### Option 1: Use Orchestrator (Recommended)

```typescript
import { initializeModularAuditForm } from './audit-form-modular-loader.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const orchestrator = await initializeModularAuditForm({
    onFormSubmit: async (formData) => {
      // Your submission logic
    },
    onFormCancel: () => {
      // Your cancellation logic
    }
  });
});
```

### Option 2: Use Individual Components

```typescript
import { AuditTimer, FormHeaderComponent, TranscriptSection } from './components/index.js';

// Initialize components individually
const timer = new AuditTimer({ /* config */ });
timer.render(document.getElementById('auditTimerContainer'));

const header = new FormHeaderComponent({ /* config */ });
header.render(document.getElementById('auditFormHeader'));

const transcript = new TranscriptSection({ /* config */ });
transcript.initializeWithExistingDOM(); // Works with existing DOM
```

## Component Communication

Components communicate through:
1. **Event callbacks** - Passed during initialization
2. **DOM events** - Components dispatch and listen to standard DOM events
3. **Orchestrator** - Coordinates interactions between components

## Benefits of Modular Architecture

1. **Separation of Concerns** - Each component handles a specific responsibility
2. **Reusability** - Components can be used independently or in different contexts
3. **Testability** - Each component can be tested in isolation
4. **Maintainability** - Changes to one component don't affect others
5. **Scalability** - Easy to add new components or modify existing ones
6. **Flexibility** - Components can be swapped or customized per use case

## File Structure

```
components/
├── audit-timer.ts                    # Timer component
├── form-header-component.ts          # Header component
├── ai-audit-indicator-component.ts   # AI indicator component
├── transcript-section.ts             # Transcript section component
├── error-details-section.ts         # Error details section component
├── form-actions.ts                   # Form actions component
├── splitter-component.ts            # Splitter component
├── audit-form-orchestrator.ts       # Main orchestrator
├── index.ts                         # Component exports
└── README.md                        # This file
```

## TypeScript Types

All components export TypeScript interfaces for their configuration:

- `AuditTimerConfig`
- `FormHeaderConfig`
- `AIAuditIndicatorConfig`
- `TranscriptSectionConfig`
- `ErrorDetailsSectionConfig`
- `FormActionsConfig`
- `AuditFormOrchestratorConfig`

## Best Practices

1. **Always initialize components after DOM is ready**
2. **Use the orchestrator for full form integration**
3. **Use individual components for partial integration**
4. **Clean up components when done** (call `destroy()` method)
5. **Handle errors in callbacks appropriately**
6. **Test components in isolation before integration**

## Migration Guide

To migrate from monolithic HTML to modular components:

1. Keep existing HTML structure
2. Import and initialize `AuditFormOrchestrator`
3. Pass existing form submission/cancellation handlers
4. Components will enhance existing DOM elements
5. Gradually replace inline scripts with component methods

## Future Enhancements

- Component state management
- Event bus for component communication
- Component lifecycle hooks
- Unit tests for each component
- Storybook documentation
- Accessibility improvements
