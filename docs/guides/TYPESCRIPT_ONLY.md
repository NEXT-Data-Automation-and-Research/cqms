# TypeScript-Only Project Policy

## Overview

This project uses **TypeScript exclusively** for all source code. JavaScript files in `public/js/` are **auto-generated** from TypeScript source files and should **never be edited directly**.

## Project Structure

```
src/                    # TypeScript source files (EDIT THESE)
├── features/          # Feature modules
├── utils/             # Utility functions
├── infrastructure/    # Infrastructure code
└── ...

public/js/              # Compiled JavaScript (AUTO-GENERATED - DO NOT EDIT)
├── features/          # Compiled from src/features/
├── utils/             # Compiled from src/utils/
└── ...
```

## Rules

### ✅ DO

- Write all source code in TypeScript (`.ts` files in `src/`)
- Edit TypeScript files in `src/` directory
- Run `npm run build:ts` or `npm run watch:ts` to compile
- Use TypeScript types, interfaces, and type safety features
- Import using `.js` extension (points to compiled output): `import { x } from './file.js'`

### ❌ DON'T

- **NEVER** edit JavaScript files in `public/js/` directly
- **NEVER** create new `.js` files in `src/` directory
- **NEVER** manually write JavaScript that should be TypeScript
- **NEVER** commit compiled `.js` files (they're auto-generated)

## Build Process

1. **Development**: `npm run watch:ts` - Auto-compiles on save
2. **Production**: `npm run build:ts` - One-time compilation
3. **Full Build**: `npm run build` - Compiles TypeScript + CSS + server

## File Locations

- **Source**: `src/features/sidebar/presentation/sidebar-loader.ts`
- **Compiled**: `public/js/features/sidebar/presentation/sidebar-loader.js` (auto-generated)

## Import Paths

When importing in TypeScript files, use paths that point to the compiled output:

```typescript
// ✅ Correct - points to compiled JS
import { SidebarLoader } from '/js/features/sidebar/presentation/sidebar-loader.js'

// ✅ Correct - relative import with .js extension
import { something } from './other-file.js'
```

## Migration Guide

If you find a `.js` file in `src/`:

1. Rename it to `.ts`
2. Add TypeScript types
3. Fix any type errors
4. Delete the old `.js` file
5. Rebuild: `npm run build:ts`

## IDE Configuration

- Use TypeScript language server
- Enable strict type checking
- Show errors for any `.js` files in `src/`
- Auto-format with TypeScript formatter

