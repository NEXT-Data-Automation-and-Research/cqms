# Integration Guide: Modular Audit Form Components

This guide explains how to integrate the modular audit form components into your application.

## Quick Start

### Basic Integration

Add this script tag to your HTML file (after the form HTML):

```html
<script type="module">
  import { initializeModularAuditForm } from '/js/features/audit-form/presentation/audit-form-modular-loader.js';
  
  // Wait for DOM and form to be ready
  document.addEventListener('DOMContentLoaded', async () => {
    const formElement = document.getElementById('auditForm');
    if (formElement) {
      const orchestrator = await initializeModularAuditForm({
        onFormSubmit: async (formData) => {
          // Your existing form submission logic
          // formData is a FormData object with all form fields
          
          // Example: Convert to object
          const data = Object.fromEntries(formData.entries());
          console.log('Form data:', data);
          
          // Your submission code here
        },
        onFormCancel: () => {
          // Your existing cancel logic
          if (typeof closeAuditForm === 'function') {
            closeAuditForm();
          }
        }
      });
      
      // Store orchestrator for later use
      window.auditFormOrchestrator = orchestrator;
    }
  });
</script>
```

## Integration with Existing Code

The modular components are designed to work alongside your existing code. They enhance the existing DOM rather than replacing it.

### Preserving Existing Functionality

If you have existing functions like `closeAuditForm()`, `copyConversationId()`, etc., the components will call them:

```typescript
// Components will automatically call these if they exist:
window.closeAuditForm = () => { /* your code */ };
window.copyConversationId = () => { /* your code */ };
window.copyClientEmail = () => { /* your code */ };
window.clearAIAuditData = () => { /* your code */ };
```

### Form Submission Integration

The orchestrator handles form submission and includes timer duration:

```typescript
const orchestrator = await initializeModularAuditForm({
  onFormSubmit: async (formData) => {
    // Timer duration is automatically added to formData
    const duration = formData.get('auditDuration'); // in seconds
    
    // Your existing submission logic
    const formDataObj = Object.fromEntries(formData.entries());
    
    // Call your existing submit function or API
    await submitAuditForm(formDataObj);
  }
});
```

## Component-Specific Integration

### Using Individual Components

If you only want to use specific components:

```typescript
import { AuditTimer, FormHeaderComponent } from './components/index.js';

// Timer
const timerContainer = document.getElementById('auditTimerContainer') || document.body;
const timer = new AuditTimer({
  onPlay: () => console.log('Timer started'),
  onPause: () => console.log('Timer paused')
});
timer.render(timerContainer);

// Header
const headerContainer = document.getElementById('auditFormHeader');
if (headerContainer) {
  const header = new FormHeaderComponent({
    onClose: () => {
      if (typeof closeAuditForm === 'function') {
        closeAuditForm();
      }
    }
  });
  header.render(headerContainer);
}
```

### Enhancing Existing DOM

Components can enhance existing DOM without replacing HTML:

```typescript
import { TranscriptSection, ErrorDetailsSection, FormActions } from './components/index.js';

// These methods attach event listeners to existing elements
const transcript = new TranscriptSection({ /* config */ });
transcript.initializeWithExistingDOM();

const errorDetails = new ErrorDetailsSection({ /* config */ });
errorDetails.initializeWithExistingDOM();

const formActions = new FormActions({ /* config */ });
formActions.initializeWithExistingDOM();
```

## Advanced Configuration

### Custom Component Configuration

```typescript
const orchestrator = new AuditFormOrchestrator({
  timer: {
    initialTime: 0,
    onPlay: () => console.log('Timer playing'),
    onPause: () => console.log('Timer paused')
  },
  header: {
    headerOptions: {
      title: 'Custom Title',
      mode: 'edit'
    }
  },
  transcript: {
    onInteractionIdChange: (id) => {
      // Custom handler
      loadConversation(id);
    }
  },
  errorDetails: {
    onScorecardChange: (scorecardId) => {
      // Custom handler
      loadScorecardParameters(scorecardId);
    }
  },
  formActions: {
    onSubmit: () => {
      // Custom submit handler
    },
    onCancel: () => {
      // Custom cancel handler
    }
  },
  onFormSubmit: async (formData) => {
    // Main form submission handler
  },
  onFormCancel: () => {
    // Main cancel handler
  }
});

orchestrator.initialize(formElement);
```

## Accessing Component Instances

After initialization, you can access individual components:

```typescript
const orchestrator = await initializeModularAuditForm({ /* config */ });

// Access components
const timer = orchestrator.getTimer();
if (timer) {
  timer.show();
  timer.play();
}

const header = orchestrator.getHeader();
if (header) {
  header.updateMetadata({ averageScore: 85 });
}

const aiIndicator = orchestrator.getAIIndicator();
if (aiIndicator) {
  aiIndicator.showLoading();
  aiIndicator.showLoaded(95);
}

const transcript = orchestrator.getTranscript();
if (transcript) {
  const input = transcript.getInteractionIdInput();
  if (input) {
    input.value = '12345';
  }
}

const errorDetails = orchestrator.getErrorDetails();
if (errorDetails) {
  errorDetails.updateErrorCount('total', 5);
  errorDetails.updateErrorCount('critical', 2);
}

const formActions = orchestrator.getFormActions();
if (formActions) {
  formActions.setSubmitLoading(true);
}
```

## Event Handling

Components dispatch and listen to DOM events. You can also listen to these events:

```typescript
// Listen to component events
document.addEventListener('auditTimer:play', () => {
  console.log('Timer started');
});

document.addEventListener('auditTimer:pause', () => {
  console.log('Timer paused');
});

document.addEventListener('formHeader:close', () => {
  console.log('Form header closed');
});
```

## Cleanup

When done with the form, clean up components:

```typescript
const orchestrator = await initializeModularAuditForm({ /* config */ });

// Later, when closing the form:
orchestrator.destroy();
```

## Troubleshooting

### Components Not Initializing

1. Ensure DOM is ready before initialization
2. Check that required elements exist in HTML
3. Verify import paths are correct

### Event Handlers Not Firing

1. Ensure components are initialized before attaching handlers
2. Check that element IDs match expected IDs
3. Verify callbacks are properly configured

### Form Submission Issues

1. Ensure `onFormSubmit` callback is provided
2. Check that form data is being collected correctly
3. Verify timer duration is included if needed

## Migration Checklist

- [ ] Import modular loader script
- [ ] Initialize orchestrator with existing handlers
- [ ] Test form submission
- [ ] Test form cancellation
- [ ] Verify timer functionality
- [ ] Check all component interactions
- [ ] Test with existing code
- [ ] Remove old inline scripts (optional)

## Example: Full Integration

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Your existing head content -->
</head>
<body>
  <!-- Your existing form HTML -->
  <form id="auditForm">
    <!-- Form content -->
  </form>

  <!-- Existing scripts -->
  <script src="/js/existing-scripts.js"></script>

  <!-- Modular components integration -->
  <script type="module">
    import { initializeModularAuditForm } from '/js/features/audit-form/presentation/audit-form-modular-loader.js';
    
    // Wait for everything to be ready
    window.addEventListener('load', async () => {
      const formElement = document.getElementById('auditForm');
      if (!formElement) return;
      
      const orchestrator = await initializeModularAuditForm({
        onFormSubmit: async (formData) => {
          // Your existing submission logic
          const data = Object.fromEntries(formData.entries());
          
          // Call your existing submit function
          if (typeof submitAuditForm === 'function') {
            await submitAuditForm(data);
          }
        },
        onFormCancel: () => {
          // Your existing cancel logic
          if (typeof closeAuditForm === 'function') {
            closeAuditForm();
          }
        }
      });
      
      // Store for later access
      window.auditFormOrchestrator = orchestrator;
    });
  </script>
</body>
</html>
```
