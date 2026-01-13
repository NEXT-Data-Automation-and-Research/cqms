# Legacy Code Migration Guide

**Purpose**: Comprehensive guide for converting legacy HTML/JavaScript files to the new Clean Architecture codebase with security compliance and modular structure.

**Last Updated**: January 2025

---

## 📋 Table of Contents

1. [Pre-Migration Analysis](#pre-migration-analysis)
2. [Migration Process Overview](#migration-process-overview)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Security Compliance Checklist](#security-compliance-checklist)
5. [Architecture Compliance](#architecture-compliance)
6. [File Size Management](#file-size-management)
7. [CSS Migration](#css-migration)
8. [Data Migration](#data-migration)
9. [Testing & Validation](#testing--validation)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## 🔍 Pre-Migration Analysis

### Step 1: Analyze Legacy File Structure

Before starting migration, analyze the legacy file:

```bash
# Check file size
wc -l legacy-file.html

# Identify key components
grep -n "function\|class\|const\|let\|var" legacy-file.html | head -50

# Find inline styles
grep -n "<style>" legacy-file.html

# Find script blocks
grep -n "<script>" legacy-file.html

# Find database queries
grep -n "\.from\|\.select\|\.insert\|\.update\|\.delete" legacy-file.html

# Find innerHTML usage (SECURITY RISK)
grep -n "innerHTML" legacy-file.html

# Find direct Supabase access (SECURITY RISK)
grep -n "getSupabase\|createClient\|supabase\." legacy-file.html
```

### Step 2: Identify Feature Components

Break down the legacy file into logical components:

1. **UI Components**: Modals, tables, forms, buttons, cards
2. **Business Logic**: Calculations, validations, data transformations
3. **Data Access**: Database queries, API calls
4. **Event Handlers**: Click handlers, form submissions, filters
5. **State Management**: Variables that track UI state
6. **Styling**: CSS classes, inline styles

### Step 3: Map to Clean Architecture Layers

Map each component to the appropriate layer:

| Legacy Component | Target Layer | File Location |
|------------------|--------------|---------------|
| Database queries | Infrastructure | `infrastructure/{feature}-repository.ts` |
| Business rules | Application | `application/{feature}-service.ts` |
| UI rendering | Presentation | `presentation/{feature}-renderer.ts` |
| Event handlers | Presentation | `presentation/{feature}-events.ts` |
| HTML templates | Presentation | `presentation/{feature}.html` |
| Type definitions | Domain | `domain/entities.ts`, `domain/types.ts` |
| CSS styles | Presentation | `presentation/styles/{feature}.css` |

---

## 🚀 Migration Process Overview

### Migration Phases

1. **Phase 1: Setup** - Create feature directory structure
2. **Phase 2: Domain Layer** - Extract entities and types
3. **Phase 3: Infrastructure** - Create repository with database access
4. **Phase 4: Application** - Create service with business logic
5. **Phase 5: Presentation** - Create UI components and templates
6. **Phase 6: Integration** - Wire everything together
7. **Phase 7: Security** - Fix all security violations
8. **Phase 8: Testing** - Validate functionality

---

## 📝 Step-by-Step Migration

### Phase 1: Setup Feature Structure

Create the feature directory following Clean Architecture:

```bash
src/features/{feature-name}/
├── domain/
│   ├── entities.ts      # Domain entities/interfaces
│   └── types.ts         # Domain-specific types
├── infrastructure/
│   └── {feature}-repository.ts
├── application/
│   ├── {feature}-service.ts
│   └── {feature}-state.ts (if needed)
└── presentation/
    ├── {feature}.html
    ├── {feature}-loader.ts
    ├── {feature}-renderer.ts (optional)
    ├── {feature}-events.ts (optional)
    ├── components/ (if needed)
    └── styles/
        └── {feature}.css
```

**Example**:
```bash
mkdir -p src/features/scorecards/{domain,infrastructure,application,presentation/styles}
```

---

### Phase 2: Extract Domain Layer

**Goal**: Identify and extract pure business entities and types (NO dependencies on other layers)

#### 2.1: Identify Domain Entities

Look for:
- Data structures (objects, arrays)
- Type definitions
- Constants
- Enums

**Example from legacy code**:
```javascript
// Legacy code
const scorecard = {
  id: '123',
  name: 'Customer Service',
  scoringType: 'deductive',
  parameters: [...]
};
```

**Convert to**:
```typescript
// domain/entities.ts
export interface Scorecard {
  id: string;
  name: string;
  scoringType: 'deductive' | 'additive';
  parameters: ScorecardParameter[];
  passingThreshold: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ScorecardParameter {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  // ... other fields
}
```

#### 2.2: Extract Types

```typescript
// domain/types.ts
export type ScorecardStatus = 'active' | 'inactive';
export type ScoringType = 'deductive' | 'additive';

export interface ScorecardFilters {
  status?: ScorecardStatus;
  scoringType?: ScoringType;
  searchQuery?: string;
}
```

**Rules**:
- ✅ NO imports from infrastructure, application, or presentation
- ✅ Pure TypeScript types and interfaces
- ✅ Can import from other domain layers if needed
- ✅ Keep files under 250 lines

---

### Phase 3: Create Infrastructure Layer (Repository)

**Goal**: Extract all database access into a repository that extends `BaseRepository`

#### 3.1: Identify Database Queries

Find all database operations in legacy code:

```javascript
// Legacy code (WRONG - direct Supabase access)
const { data } = await supabase
  .from('scorecards')
  .select('*')  // SECURITY VIOLATION - no field whitelist
  .eq('status', 'active');
```

#### 3.2: Create Repository

```typescript
// infrastructure/scorecard-repository.ts
import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { Scorecard, ScorecardParameter } from '../domain/entities.js';
import { SCORECARD_FIELDS } from '../../../core/constants/field-whitelists.js';

export class ScorecardRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'scorecards');
  }

  async findAll(filters?: ScorecardFilters): Promise<Scorecard[]> {
    return this.executeQuery(
      async () => {
        let query = this.db
          .from(this.getTableName())
          .select(SCORECARD_FIELDS.join(',')); // ✅ Field whitelist

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.scoringType) {
          query = query.eq('scoring_type', filters.scoringType);
        }
        if (filters?.searchQuery) {
          query = query.ilike('name', `%${filters.searchQuery}%`);
        }

        const result = await query.execute<Scorecard[]>();
        return result || [];
      },
      'Failed to fetch scorecards'
    );
  }

  async findById(id: string): Promise<Scorecard | null> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .select(SCORECARD_FIELDS.join(','))
          .eq('id', id)
          .single()
          .execute<Scorecard>();
        return result || null;
      },
      `Failed to find scorecard ${id}`
    );
  }

  async create(scorecard: Omit<Scorecard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scorecard> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .insert(scorecard)
          .select(SCORECARD_FIELDS.join(','))
          .single()
          .execute<Scorecard>();
        
        this.invalidateCache('scorecards_list'); // Invalidate cache
        return result;
      },
      'Failed to create scorecard'
    );
  }

  async update(id: string, updates: Partial<Scorecard>): Promise<Scorecard> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .update(updates)
          .eq('id', id)
          .select(SCORECARD_FIELDS.join(','))
          .single()
          .execute<Scorecard>();
        
        this.invalidateCache('scorecards_list');
        return result;
      },
      `Failed to update scorecard ${id}`
    );
  }

  async delete(id: string): Promise<void> {
    return this.executeQuery(
      async () => {
        await this.db
          .from(this.getTableName())
          .delete()
          .eq('id', id)
          .execute();
        
        this.invalidateCache('scorecards_list');
      },
      `Failed to delete scorecard ${id}`
    );
  }
}
```

**Critical Rules**:
- ✅ Extend `BaseRepository`
- ✅ Use `IDatabaseClient` interface (NOT direct Supabase)
- ✅ Use field whitelists from `src/core/constants/field-whitelists.ts`
- ✅ Use `executeQuery()` wrapper for error handling
- ✅ Use `invalidateCache()` after mutations
- ✅ NO business logic (only data access)
- ✅ Keep files under 250 lines (split if needed)

**Security Fixes**:
- ❌ Remove `select('*')` → ✅ Use field whitelists
- ❌ Remove direct `getSupabase()` → ✅ Use `DatabaseFactory.createClient()`
- ❌ Remove unauthenticated access → ✅ Use authenticated helper (if needed)

---

### Phase 4: Create Application Layer (Service)

**Goal**: Extract business logic into a service that extends `BaseService`

#### 4.1: Identify Business Logic

Look for:
- Calculations
- Validations
- Data transformations
- Business rules

```javascript
// Legacy code
function calculateScore(scorecard, responses) {
  let totalScore = 0;
  if (scorecard.scoringType === 'deductive') {
    // Deductive logic
    totalScore = scorecard.maxScore;
    responses.forEach(r => {
      totalScore -= r.deduction;
    });
  } else {
    // Additive logic
    responses.forEach(r => {
      totalScore += r.score;
    });
  }
  return totalScore;
}
```

#### 4.2: Create Service

```typescript
// application/scorecard-service.ts
import { BaseService } from '../../../core/service/base-service.js';
import { ScorecardRepository } from '../infrastructure/scorecard-repository.js';
import type { Scorecard, ScorecardParameter } from '../domain/entities.js';
import { createValidationError, createBusinessError } from '../../../core/errors/app-error.js';

export class ScorecardService extends BaseService {
  constructor(private repository: ScorecardRepository) {
    super();
  }

  async getAllScorecards(filters?: ScorecardFilters): Promise<Scorecard[]> {
    this.validateInput(filters, (f) => {
      if (f?.searchQuery && f.searchQuery.length > 100) {
        return 'Search query too long';
      }
      return null;
    });

    return this.executeBusinessLogic(
      async () => {
        const scorecards = await this.repository.findAll(filters);
        return scorecards.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },
      'Failed to fetch scorecards'
    );
  }

  async createScorecard(
    data: Omit<Scorecard, 'id' | 'createdAt' | 'updatedAt'>,
    parameters: ScorecardParameter[]
  ): Promise<Scorecard> {
    // Validation
    this.validateInput(data.name, (name) => 
      !name || name.trim().length === 0 ? 'Scorecard name is required' : null
    );
    this.validateInput(data.passingThreshold, (threshold) => 
      threshold < 0 || threshold > 100 ? 'Threshold must be between 0 and 100' : null
    );
    this.validateInput(parameters, (params) => 
      !params || params.length === 0 ? 'At least one parameter is required' : null
    );

    return this.executeBusinessLogic(
      async () => {
        // Business logic: Validate parameter weights sum to 100
        const totalWeight = parameters.reduce((sum, p) => sum + p.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          throw createBusinessError('Parameter weights must sum to 100');
        }

        // Create scorecard
        const scorecard = await this.repository.create({
          ...data,
          parameters: JSON.stringify(parameters), // Store as JSON
        });

        return scorecard;
      },
      'Failed to create scorecard'
    );
  }

  calculateScore(scorecard: Scorecard, responses: Response[]): number {
    if (scorecard.scoringType === 'deductive') {
      let totalScore = scorecard.maxScore || 100;
      responses.forEach(r => {
        totalScore -= r.deduction || 0;
      });
      return Math.max(0, totalScore);
    } else {
      let totalScore = 0;
      responses.forEach(r => {
        totalScore += r.score || 0;
      });
      return Math.min(scorecard.maxScore || 100, totalScore);
    }
  }
}
```

**Critical Rules**:
- ✅ Extend `BaseService`
- ✅ Accept repository via constructor (dependency injection)
- ✅ Use `validateInput()` for input validation
- ✅ Use `executeBusinessLogic()` for error handling
- ✅ NO direct database access
- ✅ NO DOM manipulation
- ✅ Keep files under 250 lines

---

### Phase 5: Create Presentation Layer

**Goal**: Extract UI code into presentation layer with proper security

#### 5.1: Extract HTML Template

Break down large HTML files into smaller components:

```html
<!-- presentation/scorecard.html (main file, <250 lines) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Scorecards | QMS</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/presentation/styles/scorecard.css">
</head>
<body>
  <main class="main-content">
    <div id="header-container"></div>
    <div id="scorecards-container"></div>
  </main>
  <script type="module" src="/js/auth-checker.js"></script>
  <script type="module" src="/js/load-sidebar.js"></script>
  <script type="module" src="/presentation/scorecard-loader.js"></script>
</body>
</html>
```

#### 5.2: Create Loader

```typescript
// presentation/scorecard-loader.ts
import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { ScorecardRepository } from '../infrastructure/scorecard-repository.js';
import { ScorecardService } from '../application/scorecard-service.js';
import { ScorecardController } from './scorecard-controller.js';
import { logError } from '../../../utils/logging-helper.js';

async function initializeScorecards(): Promise<void> {
  try {
    const db = DatabaseFactory.createClient();
    const repository = new ScorecardRepository(db);
    const service = new ScorecardService(repository);
    const controller = new ScorecardController(service);
    
    await controller.init();
  } catch (error) {
    logError('Failed to initialize scorecards', error);
    alert('Failed to load scorecards. Please refresh the page.');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScorecards);
} else {
  initializeScorecards();
}
```

#### 5.3: Create Controller (if needed)

```typescript
// presentation/scorecard-controller.ts
import { ScorecardService } from '../application/scorecard-service.js';
import { ScorecardRenderer } from './scorecard-renderer.js';
import { ScorecardEvents } from './scorecard-events.js';
import { logError } from '../../../utils/logging-helper.js';

export class ScorecardController {
  private renderer: ScorecardRenderer;
  private events: ScorecardEvents;

  constructor(public service: ScorecardService) {
    this.renderer = new ScorecardRenderer();
    this.events = new ScorecardEvents(this);
  }

  async init(): Promise<void> {
    await this.loadScorecards();
    this.events.attachEventListeners();
  }

  async loadScorecards(): Promise<void> {
    try {
      const scorecards = await this.service.getAllScorecards();
      this.renderer.renderScorecards(scorecards);
    } catch (error) {
      logError('Failed to load scorecards', error);
      this.renderer.showError('Failed to load scorecards');
    }
  }

  async createScorecard(data: any, parameters: any[]): Promise<void> {
    try {
      await this.service.createScorecard(data, parameters);
      await this.loadScorecards(); // Refresh list
      this.renderer.closeModal();
    } catch (error) {
      logError('Failed to create scorecard', error);
      this.renderer.showError(error.message || 'Failed to create scorecard');
    }
  }
}
```

#### 5.4: Create Renderer

```typescript
// presentation/scorecard-renderer.ts
import { safeSetHTML } from '../../../utils/html-sanitizer.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';
import type { Scorecard } from '../domain/entities.js';

export class ScorecardRenderer {
  private container: HTMLElement | null;
  private modal: HTMLElement | null;

  constructor() {
    this.container = document.getElementById('scorecards-container');
    this.modal = document.getElementById('scorecard-modal');
  }

  renderScorecards(scorecards: Scorecard[]): void {
    if (!this.container) return;

    const html = this.generateScorecardsHTML(scorecards);
    safeSetHTML(this.container, html); // ✅ Security: Use safeSetHTML
  }

  private generateScorecardsHTML(scorecards: Scorecard[]): string {
    if (scorecards.length === 0) {
      return '<div class="empty-state">No scorecards found</div>';
    }

    const rows = scorecards.map(scorecard => `
      <tr>
        <td>${escapeHtml(scorecard.name)}</td>
        <td>${escapeHtml(scorecard.scoringType)}</td>
        <td>${escapeHtml(scorecard.status)}</td>
        <td>
          <button 
            class="btn-action" 
            data-action="edit" 
            data-scorecard-id="${escapeHtml(scorecard.id)}"
          >
            Edit
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <table class="scorecards-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Scoring Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  showError(message: string): void {
    // Show error message to user
    alert(escapeHtml(message)); // ✅ Security: Escape user input
  }

  closeModal(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }
}
```

**Critical Security Rules**:
- ❌ NEVER use `innerHTML` directly
- ✅ ALWAYS use `safeSetHTML()` for HTML content
- ✅ ALWAYS use `escapeHtml()` in template strings
- ✅ Use `textContent` for plain text (preferred)
- ✅ Sanitize all user input

**Example Security Fixes**:

```typescript
// ❌ WRONG - XSS vulnerability
element.innerHTML = `<div>${userData}</div>`;
element.innerHTML = scorecards.map(s => `<div>${s.name}</div>`).join('');

// ✅ CORRECT - Safe HTML
safeSetHTML(element, `<div>${escapeHtml(userData)}</div>`);
const html = scorecards.map(s => `<div>${escapeHtml(s.name)}</div>`).join('');
safeSetHTML(element, html);

// ✅ CORRECT - Plain text (preferred)
element.textContent = userData;
```

---

### Phase 6: Extract CSS

**Goal**: Move all CSS to separate files (<250 lines each)

#### 6.1: Extract Inline Styles

Find `<style>` blocks in legacy HTML and extract to CSS files:

```css
/* presentation/styles/scorecard.css */
.scorecards-container {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding: 0;
  width: 100%;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.125rem;
  width: 100%;
}

/* ... more styles ... */
```

#### 6.2: Split Large CSS Files

If CSS exceeds 250 lines, split by component:

```
presentation/styles/
├── scorecard.css          # Main styles (<250 lines)
├── scorecard-table.css    # Table styles (<250 lines)
├── scorecard-modal.css    # Modal styles (<250 lines)
└── scorecard-forms.css    # Form styles (<250 lines)
```

---

## ✅ Security Compliance Checklist

Use this checklist to ensure all security rules are followed:

### XSS Prevention
- [ ] No `innerHTML` usage - All replaced with `safeSetHTML()`
- [ ] All user data escaped with `escapeHtml()` in templates
- [ ] Plain text uses `textContent` when possible
- [ ] HTML sanitization via DOMPurify for dynamic content

### Data Protection
- [ ] No `select('*')` queries - All use field whitelists
- [ ] Field whitelists defined in `src/core/constants/field-whitelists.ts`
- [ ] Only necessary fields selected from database

### Authentication
- [ ] No direct `getSupabase()` calls for database operations
- [ ] Uses `DatabaseFactory.createClient()` (uses authenticated helper internally)
- [ ] Server-side operations use `getServerSupabase()` if needed

### Input Validation
- [ ] All user input sanitized with `sanitizeString()`
- [ ] Input validation in service layer using `validateInput()`
- [ ] CSRF tokens in POST/PUT/DELETE requests (middleware handles this)

### Error Handling
- [ ] No `console.log` - Uses `logInfo/logError/logWarn` from logging helper
- [ ] Generic error messages (no sensitive data exposed)
- [ ] Uses `AppError` or helper functions (`createDatabaseError`, etc.)

### HTML Sanitization
- [ ] All HTML content sanitized before rendering
- [ ] DOMPurify configured correctly
- [ ] Safe HTML tags/attributes whitelisted

---

## 🏗️ Architecture Compliance

### Repository Pattern
- [ ] Extends `BaseRepository`
- [ ] Uses `IDatabaseClient` interface
- [ ] Uses `executeQuery()` wrapper
- [ ] Implements cache invalidation
- [ ] NO business logic

### Service Pattern
- [ ] Extends `BaseService`
- [ ] Accepts repository via constructor
- [ ] Uses `validateInput()` for validation
- [ ] Uses `executeBusinessLogic()` wrapper
- [ ] NO direct database access
- [ ] NO DOM manipulation

### Dependency Injection
- [ ] Repository injected into service
- [ ] Service injected into controller
- [ ] Dependencies resolved in loader

### Error Handling
- [ ] Uses `AppError` or helper functions
- [ ] Appropriate error codes
- [ ] Error context included
- [ ] Errors logged properly

### Caching
- [ ] Uses `getCachedOrFetch()` for cacheable data
- [ ] Cache invalidated on mutations
- [ ] Appropriate TTL set

---

## 📏 File Size Management

### Rule: Maximum 250 Lines Per File

**Strategy**: Break down large files systematically

#### For Large TypeScript Files (>250 lines):

1. **Extract Utility Functions**:
   ```typescript
   // Before: service.ts (300 lines)
   // After:
   //   service.ts (150 lines)
   //   service-utils.ts (100 lines)
   //   service-validators.ts (50 lines)
   ```

2. **Split by Responsibility**:
   ```typescript
   // Before: renderer.ts (400 lines)
   // After:
   //   renderer.ts (100 lines) - Main orchestrator
   //   table-renderer.ts (150 lines) - Table rendering
   //   modal-renderer.ts (150 lines) - Modal rendering
   ```

3. **Extract Types**:
   ```typescript
   // Before: service.ts (300 lines with types)
   // After:
   //   service.ts (200 lines)
   //   types.ts (100 lines) - Type definitions
   ```

#### For Large HTML Files (>250 lines):

1. **Extract Components**:
   ```html
   <!-- Before: feature.html (500 lines) -->
   <!-- After: -->
   <!--   feature.html (100 lines) - Main structure -->
   <!--   components/header.html (50 lines) -->
   <!--   components/table.html (100 lines) -->
   <!--   components/modal.html (150 lines) -->
   ```

2. **Move Scripts to Separate Files**:
   ```html
   <!-- Before: Inline <script> blocks -->
   <!-- After: External TypeScript modules -->
   ```

#### For Large CSS Files (>250 lines):

1. **Split by Component**:
   ```css
   /* Before: feature.css (400 lines) */
   /* After: */
   /*   feature.css (100 lines) - Base styles */
   /*   feature-table.css (150 lines) - Table styles */
   /*   feature-modal.css (150 lines) - Modal styles */
   ```

2. **Split by Feature**:
   ```css
   /* Before: feature.css (400 lines) */
   /* After: */
   /*   feature-layout.css (100 lines) */
   /*   feature-forms.css (150 lines) */
   /*   feature-buttons.css (150 lines) */
   ```

---

## 🎨 CSS Migration

### Step 1: Extract Inline Styles

Find all `<style>` blocks in legacy HTML:

```html
<!-- Legacy code -->
<style>
  .scorecards-container { ... }
  .stats-grid { ... }
</style>
```

Extract to CSS file:

```css
/* presentation/styles/scorecard.css */
.scorecards-container { ... }
.stats-grid { ... }
```

### Step 2: Handle CSS Specificity Issues

Legacy CSS might have specificity conflicts. Use `!important` for critical display properties:

```css
/* For modals - ensure display works */
.modal.active {
  display: flex !important;
  align-items: center;
  justify-content: center;
}
```

### Step 3: Remove Inline Styles

Replace inline styles with CSS classes:

```html
<!-- ❌ Before -->
<div style="display: flex; gap: 1rem;">

<!-- ✅ After -->
<div class="flex-container">
```

```css
.flex-container {
  display: flex;
  gap: 1rem;
}
```

### Step 4: Use CSS Variables

Replace hardcoded colors with CSS variables:

```css
/* ❌ Before */
.stat-card {
  background: #ffffff;
  color: #374151;
}

/* ✅ After */
.stat-card {
  background: var(--color-background, #ffffff);
  color: var(--color-text, #374151);
}
```

---

## 💾 Data Migration

### Step 1: Identify Data Structure Changes

Legacy code might use different data structures. Map old to new:

```javascript
// Legacy structure
{
  scorecard_name: 'Customer Service',
  scoring_type: 'deductive',
  parameters: '[{...}]' // JSON string
}

// New structure
{
  name: 'Customer Service',
  scoringType: 'deductive',
  parameters: [{...}] // Array
}
```

### Step 2: Update Field Names

Database fields might need renaming:

```typescript
// In repository, map old field names to new
async findAll(): Promise<Scorecard[]> {
  const result = await this.db
    .from('scorecards')
    .select('id, name, scoring_type as scoringType, ...') // Map fields
    .execute();
  
  return result.map(item => ({
    ...item,
    parameters: JSON.parse(item.parameters || '[]'), // Transform data
  }));
}
```

### Step 3: Handle Data Validation

Add validation for migrated data:

```typescript
// In service
async migrateLegacyData(legacyData: any): Promise<Scorecard> {
  // Validate legacy structure
  if (!legacyData.scorecard_name) {
    throw createValidationError('Missing scorecard name');
  }
  
  // Transform to new structure
  return {
    name: legacyData.scorecard_name,
    scoringType: legacyData.scoring_type || 'deductive',
    parameters: JSON.parse(legacyData.parameters || '[]'),
    // ... other fields
  };
}
```

### Step 4: Security Considerations

- **Field Whitelisting**: Only select necessary fields
- **Input Sanitization**: Sanitize all user input
- **Data Validation**: Validate data structure and types
- **Error Messages**: Generic error messages (no sensitive data)

---

## 🔐 Row Level Security (RLS) Migration

**CRITICAL**: The new codebase uses Row Level Security (RLS) policies that are enforced at the database level. Legacy code might have used different access patterns that bypass RLS.

### Understanding RLS Differences

#### Legacy Code Patterns (May Not Work)

Legacy code might have used:

1. **Direct Supabase Access** (Bypasses RLS checks):
   ```javascript
   // ❌ Legacy code - might bypass RLS
   const supabase = getSupabase(); // Direct access
   const { data } = await supabase.from('users').select('*');
   ```

2. **Service Role Key** (Bypasses RLS completely):
   ```javascript
   // ❌ Legacy code - service role bypasses ALL RLS
   const supabase = createClient(url, serviceRoleKey);
   const { data } = await supabase.from('users').select('*'); // Sees ALL data
   ```

3. **No RLS Policies** (Old database might not have RLS enabled):
   ```javascript
   // ❌ Legacy code - assumes no RLS restrictions
   const { data } = await supabase
     .from('users')
     .select('*')
     .eq('email', 'anyone@example.com'); // Might fail with RLS
   ```

#### New Codebase Patterns (RLS Enforced)

New codebase uses:

1. **Authenticated Supabase Helper** (Respects RLS):
   ```typescript
   // ✅ New code - RLS enforced
   import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
   const db = DatabaseFactory.createClient(); // Uses authenticated helper internally
   const result = await db
     .from('users')
     .select(USER_FIELDS.join(',')) // Field whitelist
     .eq('id', userId)
     .execute();
   ```

2. **RLS Policies** (Database-level enforcement):
   ```sql
   -- RLS policies restrict access based on user identity
   CREATE POLICY "Users can read own data"
   ON users FOR SELECT
   USING (auth.uid() = id);
   ```

### Step 1: Identify RLS Policy Requirements

Before migrating, identify what RLS policies your feature needs:

1. **Check Existing Policies**:
   ```sql
   -- Check what RLS policies exist for your table
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE tablename = 'your_table_name';
   ```

2. **Identify Access Patterns**:
   - Who needs to read data? (All users, own data only, admins only?)
   - Who needs to write data? (Own data, admins, specific roles?)
   - What fields should be accessible? (Use field whitelists)

3. **Check Legacy Code Access**:
   ```bash
   # Find all database queries in legacy code
   grep -n "\.from\|\.select\|\.insert\|\.update\|\.delete" legacy-file.html
   ```

### Step 2: Create/Update RLS Policies

If RLS policies don't exist or need updating, create a migration:

```sql
-- src/db/migrations/XXX_add_feature_rls_policies.sql

-- Enable RLS on table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Example: Permissive read policy (all authenticated users can read)
CREATE POLICY "Authenticated users can read all records"
ON your_table FOR SELECT
USING (auth.role() = 'authenticated');

-- Example: Users can only modify their own records
CREATE POLICY "Users can update own records"
ON your_table FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Example: Only admins can insert
CREATE POLICY "Admins can insert records"
ON your_table FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM people 
    WHERE email = auth.email() 
    AND role = 'admin'
  )
);
```

**Common RLS Policy Patterns**:

| Pattern | Use Case | SQL Example |
|---------|----------|-------------|
| **Own Data Only** | Users see only their records | `USING (auth.uid() = user_id)` |
| **All Authenticated** | All logged-in users can read | `USING (auth.role() = 'authenticated')` |
| **Role-Based** | Admins have special access | `USING (EXISTS (SELECT 1 FROM people WHERE email = auth.email() AND role = 'admin'))` |
| **Team-Based** | Users see team members | `USING (team_id IN (SELECT team_id FROM people WHERE email = auth.email()))` |

### Step 3: Update Repository Code

Ensure repository uses authenticated access that respects RLS:

```typescript
// infrastructure/feature-repository.ts
import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { DatabaseFactory } from '../../../infrastructure/database-factory.js';

export class FeatureRepository extends BaseRepository {
  constructor(db?: IDatabaseClient) {
    // ✅ Use DatabaseFactory which uses authenticated helper (respects RLS)
    super(db || DatabaseFactory.createClient(), 'your_table');
  }

  async findAll(): Promise<Entity[]> {
    return this.executeQuery(
      async () => {
        // ✅ RLS policies are automatically enforced
        // DatabaseFactory uses authenticated Supabase helper
        const result = await this.db
          .from(this.getTableName())
          .select(FEATURE_FIELDS.join(',')) // ✅ Field whitelist
          .execute<Entity[]>();
        
        // ✅ RLS will filter results based on user identity
        return result || [];
      },
      'Failed to fetch entities'
    );
  }
}
```

### Step 4: Handle RLS Errors

RLS might block queries that worked in legacy code. Handle errors gracefully:

```typescript
// In repository
async findAll(): Promise<Entity[]> {
  return this.executeQuery(
    async () => {
      try {
        const result = await this.db
          .from(this.getTableName())
          .select(FEATURE_FIELDS.join(','))
          .execute<Entity[]>();
        return result || [];
      } catch (error: any) {
        // ✅ Handle RLS errors specifically
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          // RLS policy blocked access
          logWarn('RLS policy blocked access - user may not have permission');
          return []; // Return empty array instead of throwing
        }
        throw error; // Re-throw other errors
      }
    },
    'Failed to fetch entities'
  );
}
```

### Step 5: Test RLS After Migration

Test RLS policies work correctly:

1. **Test as Regular User**:
   ```typescript
   // Login as regular user
   // Try to access data
   // Verify only allowed data is returned
   ```

2. **Test as Admin**:
   ```typescript
   // Login as admin
   // Try to access data
   // Verify admin can see all data (if policy allows)
   ```

3. **Test Unauthenticated**:
   ```typescript
   // Logout
   // Try to access data
   // Verify access is denied
   ```

4. **Test Cross-User Access**:
   ```typescript
   // Login as User A
   // Try to access User B's data
   // Verify access is denied (if policy restricts)
   ```

### Common RLS Migration Issues

#### Issue 1: "Permission Denied" Errors

**Symptoms**: Queries that worked in legacy code now fail with permission errors

**Solution**:
1. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';`
2. Check existing policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. Create appropriate RLS policy for your use case
4. Verify user is authenticated: `SELECT auth.uid(), auth.email();`

#### Issue 2: Empty Results (RLS Too Restrictive)

**Symptoms**: Queries return empty arrays even though data exists

**Solution**:
1. Check RLS policy conditions - might be too restrictive
2. Verify user identity matches policy conditions
3. Test policy directly: `SET ROLE authenticated; SELECT * FROM your_table;`
4. Consider using permissive policies for reads if appropriate

#### Issue 3: Service Role Still Needed

**Symptoms**: Some operations require service role (bypasses RLS)

**Solution**:
1. Use `getServerSupabase()` for server-side operations only
2. Protect server endpoints with admin checks
3. Document why service role is needed
4. Consider creating more permissive RLS policies if appropriate

**Example**:
```typescript
// Server-side only - protected by admin check
import { getServerSupabase } from '../../../core/config/server-supabase.js';

router.post('/admin/operation', verifyAuth, requireAdmin, async (req, res) => {
  // ✅ Service role needed for admin operations
  const supabase = getServerSupabase(); // Bypasses RLS
  // ... admin operation
});
```

#### Issue 4: Legacy Code Used Service Role

**Symptoms**: Legacy code used service role key directly

**Solution**:
1. **Client-side**: Replace with `DatabaseFactory.createClient()` (uses authenticated helper)
2. **Server-side**: Move to API endpoint with admin protection
3. **Update RLS policies**: Make them more permissive if needed (but secure)

**Migration Pattern**:
```typescript
// ❌ Legacy code (client-side with service role)
const supabase = createClient(url, serviceRoleKey);
const { data } = await supabase.from('users').select('*');

// ✅ New code option 1: Client-side with RLS
const db = DatabaseFactory.createClient(); // Uses authenticated helper
const { data } = await db.from('users').select(USER_FIELDS.join(',')).execute();

// ✅ New code option 2: Server-side API (if admin operation)
// Move to API endpoint with admin check
router.get('/users', verifyAuth, requireAdmin, async (req, res) => {
  const supabase = getServerSupabase(); // Service role, but protected
  const { data } = await supabase.from('users').select('*');
  res.json(data);
});
```

### RLS Migration Checklist

- [ ] Identified all database tables used by legacy code
- [ ] Checked existing RLS policies for each table
- [ ] Created/updated RLS policies as needed
- [ ] Updated repository to use `DatabaseFactory.createClient()`
- [ ] Replaced direct Supabase access with authenticated helper
- [ ] Moved service role operations to server-side API (if needed)
- [ ] Added admin protection for service role endpoints
- [ ] Tested RLS policies with different user roles
- [ ] Handled RLS errors gracefully
- [ ] Documented RLS policy requirements

### RLS Policy Examples

#### Example 1: Own Data Only
```sql
-- Users can only see their own records
CREATE POLICY "Users can read own records"
ON your_table FOR SELECT
USING (auth.uid() = user_id);
```

#### Example 2: All Authenticated Users
```sql
-- All authenticated users can read all records
CREATE POLICY "Authenticated users can read all"
ON your_table FOR SELECT
USING (auth.role() = 'authenticated');
```

#### Example 3: Role-Based Access
```sql
-- Admins can do everything, users can only read
CREATE POLICY "Admins can manage records"
ON your_table FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM people 
    WHERE email = auth.email() 
    AND role = 'admin'
  )
);

CREATE POLICY "Users can read records"
ON your_table FOR SELECT
USING (auth.role() = 'authenticated');
```

#### Example 4: Team-Based Access
```sql
-- Users can see records from their team
CREATE POLICY "Users can read team records"
ON your_table FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM people 
    WHERE email = auth.email()
  )
);
```

### Testing RLS Policies

Create a test script to verify RLS policies:

```sql
-- Test RLS policies
-- Run as different users to verify access

-- Test 1: Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'your_table';

-- Test 2: Check existing policies
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'your_table';

-- Test 3: Test as authenticated user
SET ROLE authenticated;
SELECT * FROM your_table; -- Should return allowed rows only

-- Test 4: Test policy conditions
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email,
  auth.role() as current_role;
```

---

## 🧪 Testing & Validation

### Step 1: Functional Testing

Test all features work as before:

1. **Load Data**: Verify data loads correctly
2. **Create**: Test creating new records
3. **Update**: Test updating existing records
4. **Delete**: Test deleting records
5. **Filters**: Test all filter options
6. **Search**: Test search functionality
7. **Modals**: Test modal open/close
8. **Forms**: Test form submission and validation

### Step 2: Security Testing

Test security compliance:

1. **XSS Testing**: Try XSS payloads in inputs
2. **SQL Injection**: Test with SQL injection attempts
3. **Authentication**: Verify authentication required
4. **Authorization**: Test access control
5. **Error Messages**: Verify no sensitive data leaked

### Step 3: Performance Testing

1. **Load Time**: Compare load times
2. **Cache**: Verify caching works
3. **Database Queries**: Check query efficiency
4. **Memory**: Check for memory leaks

### Step 4: Code Quality

1. **File Sizes**: Verify all files <250 lines
2. **Type Safety**: Verify TypeScript types
3. **Linting**: Run linter and fix issues
4. **Architecture**: Verify Clean Architecture layers

---

## 🐛 Common Issues & Solutions

### Issue 1: Modal Not Displaying

**Symptoms**: Modal doesn't appear when opened

**Solution**:
```css
/* Add !important for display property */
.modal.active {
  display: flex !important;
  z-index: 1000;
}
```

```typescript
// Verify state management
openModal(): void {
  if (this.modal) {
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
```

### Issue 2: Data Not Loading

**Symptoms**: Data doesn't appear after migration

**Solution**:
1. Check field names match database
2. Verify field whitelist includes all needed fields
3. Check authentication is working
4. Verify repository query syntax

### Issue 3: Form Submission Not Working

**Symptoms**: Form submits but nothing happens

**Solution**:
1. Check event listeners attached after DOM ready
2. Verify service method is called
3. Check for JavaScript errors in console
4. Verify CSRF token is included

### Issue 4: CSS Styles Not Applied

**Symptoms**: Styles missing after migration

**Solution**:
1. Verify CSS file is linked in HTML
2. Check CSS file path is correct
3. Verify CSS specificity (might need `!important`)
4. Check for CSS conflicts

### Issue 5: TypeScript Errors

**Symptoms**: Type errors after migration

**Solution**:
1. Verify all types are defined in domain layer
2. Check imports are correct
3. Verify type compatibility
4. Add type assertions if needed (but prefer fixing types)

### Issue 6: Security Violations

**Symptoms**: Security checks fail

**Solution**:
1. Replace all `innerHTML` with `safeSetHTML()`
2. Replace `select('*')` with field whitelists
3. Replace direct Supabase access with `DatabaseFactory`
4. Add input sanitization
5. Use `escapeHtml()` in templates

---

## 📚 Example Migration: Scorecard Feature

See `src/features/settings/scorecards/` for a complete example of migrated code following all rules.

Key files:
- `domain/entities.ts` - Domain entities
- `infrastructure/scorecard-repository.ts` - Data access
- `application/scorecard-service.ts` - Business logic
- `presentation/scorecard-loader.ts` - Initialization
- `presentation/components/` - UI components

---

## 🎯 Migration Checklist

Use this checklist for each legacy file migration:

### Pre-Migration
- [ ] Analyzed legacy file structure
- [ ] Identified all components
- [ ] Mapped to Clean Architecture layers
- [ ] Identified security violations
- [ ] Created feature directory structure

### Domain Layer
- [ ] Created `domain/entities.ts` (<250 lines)
- [ ] Created `domain/types.ts` (<250 lines)
- [ ] No dependencies on other layers

### Infrastructure Layer
- [ ] Created repository extending `BaseRepository`
- [ ] Uses `IDatabaseClient` interface
- [ ] Uses field whitelists (no `select('*')`)
- [ ] Uses `executeQuery()` wrapper
- [ ] Implements cache invalidation
- [ ] File <250 lines

### Application Layer
- [ ] Created service extending `BaseService`
- [ ] Uses `validateInput()` for validation
- [ ] Uses `executeBusinessLogic()` wrapper
- [ ] No direct database access
- [ ] No DOM manipulation
- [ ] File <250 lines

### Presentation Layer
- [ ] Created HTML template (<250 lines)
- [ ] Created loader for initialization
- [ ] Created renderer (if needed)
- [ ] Created event handlers (if needed)
- [ ] Extracted CSS to separate files (<250 lines each)
- [ ] All files <250 lines

### Security
- [ ] No `innerHTML` - uses `safeSetHTML()`
- [ ] All user data escaped with `escapeHtml()`
- [ ] No `select('*')` - uses field whitelists
- [ ] No direct Supabase access
- [ ] Input sanitization added
- [ ] Error messages are generic

### Testing
- [ ] Functional testing passed
- [ ] Security testing passed
- [ ] Performance acceptable
- [ ] Code quality verified

---

## 🚀 Quick Start Prompt for AI Assistant

When migrating a legacy file, use this prompt:

```
I need to migrate a legacy HTML/JavaScript file to the new Clean Architecture codebase.

Legacy File: [path/to/legacy-file.html]
Feature Name: [feature-name]

Requirements:
1. Follow Clean Architecture (domain, infrastructure, application, presentation)
2. All files must be <250 lines
3. Security compliance (no innerHTML, field whitelists, authenticated Supabase)
4. Extract CSS to separate files
5. Use BaseRepository and BaseService patterns
6. Proper error handling with AppError
7. TypeScript with proper types

Please:
1. Analyze the legacy file structure
2. Create the feature directory structure
3. Extract domain entities and types
4. Create repository with database access
5. Create service with business logic
6. Create presentation layer with UI
7. Extract CSS to separate files
8. Fix all security violations
9. Ensure all files are <250 lines
10. Test functionality works

Start with Phase 1: Setup and analysis.
```

---

## 📖 Additional Resources

- **Security Rules**: `docs/security/SECURITY_RULES.md`
- **Architecture Guide**: `.cursorrules` (Feature Architecture section)
- **Example Migrations**: 
  - `src/features/audit-form/CONVERSION_SUMMARY.md`
  - `src/features/settings/scorecards/`
- **Base Classes**:
  - `src/core/repository/base-repository.ts`
  - `src/core/service/base-service.ts`
- **Security Utilities**:
  - `src/utils/html-sanitizer.ts`
  - `src/core/constants/field-whitelists.ts`

---

**Remember**: Migration is iterative. Start with one component, test it, then move to the next. Don't try to migrate everything at once.

