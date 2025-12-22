# Migration Project

A modern HTML/TypeScript development environment with Express server, Tailwind CSS, and authentication checking.

## Features

- 🚀 Express.js development server (port 4000)
- 🔧 Environment variable configuration with `.env`
- 📦 npm package management
- 🎨 Tailwind CSS with Google Fonts (Poppins)
- 📘 TypeScript support
- 🔐 Authentication checker with automatic redirect
- 🔄 Live reload with watch mode
- 📁 Organized project structure

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

### Configuration

1. The `.env` file will be automatically created on first install. If you need to create it manually:
```bash
npm run setup
```

Or copy the template file:
```bash
cp env.template .env
```

2. Edit `.env` file with your configuration:
```env
PORT=4000
NODE_ENV=development
APP_NAME=Migration Project
API_URL=http://localhost:4000
```

### Building the Project

Before running the server, build the project:
```bash
npm run build
```

This will:
- Compile TypeScript client files to JavaScript (in `public/js/`)
- Compile TypeScript server files to JavaScript (in `dist/`)
- Build Tailwind CSS from source

### Running the Server

Start the development server:
```bash
npm start
```

Or use the dev script (builds and starts):
```bash
npm run dev
```

For development with auto-reload:
```bash
npm run watch
```

This will watch for changes in:
- TypeScript files (auto-compile)
- Tailwind CSS files (auto-build)
- Server restarts on changes

The server will start on `http://localhost:4000` by default.

## Project Structure

```
migration/
├── public/              # Static files (served to client)
│   ├── index.html      # Auth checker page
│   ├── styles.css      # Compiled Tailwind CSS
│   └── js/             # Compiled JavaScript
│       └── auth-checker.js  # Compiled auth checker
├── src/                # Source files (TypeScript)
│   ├── auth-checker.ts # TypeScript auth checker
│   ├── app.ts          # Main application TypeScript
│   ├── server-commonjs.ts  # Express server (TypeScript)
│   ├── setup-env.ts     # Environment setup script (TypeScript)
│   ├── styles/
│   │   └── input.css   # Tailwind CSS source
│   └── auth/
│       └── presentation/
│           └── auth-page.html  # Login page
├── dist/               # Compiled server files
│   ├── server-commonjs.js
│   └── setup-env.js
├── package.json        # npm configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── .env               # Environment variables (not in git)
├── env.template       # Environment template
└── README.md          # This file
```

## Environment Variables

The project uses `.env` file for configuration. Add your environment variables in the `.env` file:

- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment mode (development/production)
- `APP_NAME` - Application name
- `API_URL` - API base URL

Add any additional environment variables as needed.

## API Endpoints

- `GET /` - Serves the main HTML page
- `GET /api/env` - Returns safe environment variables for client-side use

## Development

### TypeScript
- **Client-side TypeScript**: Add your TypeScript files in the `src` directory
  - They will be compiled to `public/js` directory
  - Use ES modules: `import` and `export`
- **Server-side TypeScript**: Server files (`server-commonjs.ts`, `setup-env.ts`)
  - Compiled to `dist/` directory
  - Uses ES modules with Node.js
  - Separate tsconfig: `tsconfig.server.json`

### Tailwind CSS & Theme System
- **Global Theme**: Edit `src/styles/theme.css` for theme variables, colors, fonts, and base styles
- **Tailwind Config**: Edit `tailwind.config.js` to extend Tailwind with theme variables
- **Build CSS**: Run `npm run build:css` to rebuild CSS
- **Watch CSS**: Use `npm run watch:css` for auto-rebuild
- **Theme Manager**: Use `src/utils/theme-manager.ts` for programmatic theme switching

#### Using Theme Variables
```css
/* In your CSS */
.my-component {
  color: var(--color-text-primary);
  background: var(--color-background);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

#### Using with Tailwind
```html
<!-- Theme-aware Tailwind classes -->
<div class="bg-primary-600 text-white p-md rounded-lg">
  <!-- Uses theme variables -->
</div>
```

#### Theme Switching (TypeScript)
```typescript
import { toggleTheme, setTheme, getCurrentTheme } from './js/utils/theme-manager.js';

// Toggle between light/dark
toggleTheme();

// Set specific theme
setTheme('dark'); // or 'light' or 'auto'

// Get current theme
const theme = getCurrentTheme();
```

### Authentication
- The `index.html` page automatically checks for authentication
- If user is not authenticated, redirects to `/src/auth/presentation/auth-page.html`
- Authentication is checked via `localStorage.getItem('userInfo')`

### File Organization
- Source files: `src/` directory
- Compiled files: `public/` directory (auto-generated)
- The server serves static files from both `public/` and `src/` directories

## Security

### Environment Variable Security

The server implements secure environment variable handling:

1. **Whitelist Approach**: Only explicitly whitelisted environment variables are exposed to the client via `/api/env` endpoint
2. **Pattern Blacklist**: Even whitelisted variables are checked against sensitive patterns (password, secret, key, token, etc.)
3. **Double Protection**: Variables must be both whitelisted AND pass pattern checks to be exposed

**Safe Variables** (exposed to client):
- `NODE_ENV`
- `APP_NAME`
- `API_URL`

**Never Exposed** (server-side only):
- Any variable containing: password, secret, key, token, auth, credential, private, database_url, connection_string, jwt, session, cookie_secret

To add a new safe variable, update the `SAFE_ENV_VARS` array in `src/server-commonjs.ts`.

### Best Practices

- Never commit `.env` files to version control (already in `.gitignore`)
- Use environment-specific `.env` files (`.env.development`, `.env.production`)
- For production, consider using a secrets management service
- Restrict file permissions on `.env` files: `chmod 600 .env`

## License

ISC

