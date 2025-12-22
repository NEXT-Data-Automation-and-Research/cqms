# Styles Directory

This directory contains global theme and styling configuration.

## Files

### `theme.css`
Global theme configuration file containing:
- CSS custom properties (variables) for colors, fonts, spacing, etc.
- Light and dark theme definitions
- Base typography styles
- Utility classes
- Scrollbar styling
- Focus and selection styles

**Key Variables:**
- `--font-family-primary`: Primary font (Poppins)
- `--color-primary-*`: Primary color palette (50-900)
- `--color-background`: Background colors
- `--color-text-*`: Text colors
- `--spacing-*`: Spacing scale (xs, sm, md, lg, xl, 2xl, 3xl, xxl, container)
- `--radius-*`: Border radius values
- `--transition-*`: Transition durations

### `auth-components.css`
Reusable authentication page components:
- Auth layout (left/right panels)
- Form elements (inputs, labels, buttons)
- Error/success messages
- Google Sign-In container
- Reset password form
- Animations and transitions

**Key Classes:**
- `.auth-container`: Main container for auth pages
- `.auth-left-panel`: Left branding panel
- `.auth-right-panel`: Right form panel
- `.auth-form`: Form container
- `.form-input`: Input fields
- `.btn-primary`: Primary button
- `.link-primary`: Primary link style
- `.password-error`: Error message container

### `input.css`
Main entry point for Tailwind CSS compilation:
- Imports `theme.css` for global theme variables
- Imports `auth-components.css` for auth components
- Includes Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)

## Usage

The compiled CSS is output to `public/styles.css` and automatically included in HTML files.

## Theme Variables

All theme variables are defined as CSS custom properties in `:root` and can be accessed in your CSS:

```css
.my-element {
  color: var(--color-text-primary);
  background-color: var(--color-background);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

## Dark Mode

Dark mode is supported via the `data-theme="dark"` attribute or `.dark` class on the root element. The theme manager (`src/utils/theme-manager.ts`) handles theme switching automatically.

## Fonts

The project uses **Poppins** as the primary font family, loaded from Google Fonts. Font weights available:
- 300 (Light)
- 400 (Normal)
- 500 (Medium)
- 600 (Semibold)
- 700 (Bold)
- 800 (Extrabold)

## Auth Page Styling

The auth page uses reusable component classes from `auth-components.css`. All styles are theme-aware and use CSS variables, making them easy to customize and maintain.

**Example Usage:**
```html
<div class="auth-container">
  <div class="auth-left-panel">
    <h1 class="auth-main-heading">Welcome</h1>
  </div>
  <div class="auth-right-panel">
    <form class="auth-form">
      <input class="form-input" type="email">
      <button class="btn-primary">Submit</button>
    </form>
  </div>
</div>
```
