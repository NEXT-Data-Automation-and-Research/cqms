# Home Page Component Architecture

This directory contains a modular, component-based implementation of the home page.

## Directory Structure

```
home/
├── components/              # Reusable UI components
│   ├── header/             # Header with action buttons, notifications, calendar, quick actions
│   │   ├── header.html     # Header HTML structure
│   │   └── header.js       # Header JavaScript (modal handlers)
│   ├── user-profile-dashboard/  # User profile bar with info pills
│   │   └── user-profile-dashboard.html
│   ├── action-buttons/     # Week navigation, date picker, filters
│   │   └── action-buttons.html
│   ├── stats-cards/        # Statistics cards (audits, scores, etc.)
│   │   └── stats-cards.html
│   ├── updates-feed/      # Updates feed sidebar
│   │   └── updates-feed.html
│   └── assigned-audits/   # Assigned audits list
│       └── assigned-audits.html
├── infrastructure/         # Core functionality
│   ├── home-main.js       # Main JavaScript logic (state, data loading, UI updates)
│   ├── home-state.js      # State management (if separated)
│   └── component-loader.js # Utility to dynamically load components
├── presentation/          # Page presentation
│   └── home-page.html     # Main page (now clean and modular)
└── styles/                # Page-specific styles
    └── home-page-inline.css # Extracted inline styles
```

## Component Loading

Components are loaded dynamically using the `component-loader.js` utility. The main page (`home-page.html`) contains placeholder containers that are populated with component HTML at runtime.

### How It Works

1. **Main Page** (`home-page.html`): Contains minimal HTML structure with placeholder divs
2. **Component Loader** (`component-loader.js`): Fetches component HTML files and injects them into placeholders
3. **Components**: Each component is a self-contained HTML file that can be reused

### Adding a New Component

1. Create a new directory in `components/` (e.g., `components/my-component/`)
2. Create `my-component.html` with the component HTML
3. Add a placeholder in `home-page.html`: `<div id="my-component-container"></div>`
4. Add to the component loader in `home-page.html`:
   ```javascript
   { path: '/src/features/home/components/my-component/my-component.html', target: '#my-component-container' }
   ```

## Component JavaScript

Each component can have its own JavaScript file if needed. For example:
- `header.js` handles modal show/hide functions
- Component-specific logic should be in separate files within the component directory

## Styling

- **Global styles**: `/styles.css`, `/theme.css`, `/sidebar.css`
- **Page-specific styles**: `/home-page.css`
- **Component-specific styles**: Extracted to `/src/features/home/styles/home-page-inline.css`

## Benefits of This Architecture

1. **Modularity**: Each component is self-contained and reusable
2. **Maintainability**: Easy to find and update specific features
3. **Readability**: Main page is now ~100 lines instead of 1254 lines
4. **Reusability**: Components can be used in other pages
5. **Separation of Concerns**: HTML, CSS, and JS are properly separated

## File Sizes

- **Before**: `home-page.html` - 1254 lines
- **After**: `home-page.html` - ~100 lines
- **Components**: Each component is 50-200 lines, easy to understand

## Development Workflow

1. Edit component HTML in `components/[component-name]/[component-name].html`
2. Edit component JS in `components/[component-name]/[component-name].js` (if needed)
3. Edit styles in `styles/home-page-inline.css` or component-specific CSS files
4. Main page logic remains in `infrastructure/home-main.js`

