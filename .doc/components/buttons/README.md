# Button Components

Reusable button components following industry standards.

## Primary Button

### File Structure
- `primary-button.html` - Component template/example
- `primary-button.css` - Component-specific styles

### Usage

#### Basic Usage
```html
<button class="primary-button primary-button--md">
  <span class="primary-button__text">Login</span>
</button>
```

#### With Different Text
```html
<button class="primary-button primary-button--md">
  <span class="primary-button__text">Continue</span>
</button>

<button class="primary-button primary-button--md">
  <span class="primary-button__text">Submit</span>
</button>
```

#### Sizes
```html
<!-- Small -->
<button class="primary-button primary-button--sm">
  <span class="primary-button__text">Small Button</span>
</button>

<!-- Medium (default) -->
<button class="primary-button primary-button--md">
  <span class="primary-button__text">Medium Button</span>
</button>

<!-- Large -->
<button class="primary-button primary-button--lg">
  <span class="primary-button__text">Large Button</span>
</button>
```

#### Full Width
```html
<button class="primary-button primary-button--md primary-button--full">
  <span class="primary-button__text">Full Width Button</span>
</button>
```

#### Loading State
```html
<button class="primary-button primary-button--md" data-loading="true">
  <span class="primary-button__text">Loading...</span>
  <span class="primary-button__loader" aria-hidden="true"></span>
</button>
```

#### Disabled State
```html
<button class="primary-button primary-button--md" disabled>
  <span class="primary-button__text">Disabled</span>
</button>
```

#### With Type Attribute
```html
<button type="submit" class="primary-button primary-button--md">
  <span class="primary-button__text">Submit Form</span>
</button>
```

### TypeScript Helper (Optional)

Import and use the helper functions:

```typescript
import { createPrimaryButton, setButtonLoading, setButtonText } from './components/buttons/primary-button';

// Create a button programmatically
const button = createPrimaryButton('Login', {
  size: 'md',
  fullWidth: true,
  type: 'submit'
});

// Set loading state
setButtonLoading(button, true);

// Update button text
setButtonText(button, 'Processing...');
```

Or use the global helper:
```javascript
// Available on window.PrimaryButton
const button = window.PrimaryButton.create('Login', { fullWidth: true });
window.PrimaryButton.setLoading(button, true);
```

### Features

- ✅ Gradient background with primary color
- ✅ Hover, active, and focus states
- ✅ Loading state with spinner
- ✅ Disabled state
- ✅ Multiple sizes (sm, md, lg)
- ✅ Full width option
- ✅ Ripple effect on click
- ✅ Dark mode support
- ✅ Accessible (ARIA attributes)
- ✅ Smooth animations

### Styling

The button uses CSS custom properties from the global theme, making it easy to customize:
- `--color-primary-500` to `--color-primary-800` for gradient
- `--spacing-*` for padding
- `--radius-*` for border radius
- `--transition-fast` for animations

