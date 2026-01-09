# CSS Pattern Guide: Container/Table Structure

## Problem

When creating list/table views, CSS structure issues can cause layout problems. The most common issue is **mixing container styles with table styles** on the same selector.

## Correct Pattern (Reference: `user-management-table.css`)

### Structure
```css
/* Container wrapper - has background, padding, border-radius, box-shadow */
.users-table {
    background: #ffffff;
    border-radius: 0.5rem;
    padding: 0.75rem;
    border: 0.0625rem solid #e5e7eb;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    box-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05);
}

/* Table element - nested inside container */
.users-table table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.525rem;
    table-layout: fixed;
}

/* Table cells - nested selectors */
.users-table th,
.users-table td {
    padding: 0.625rem 0.5rem;
    text-align: left;
    /* ... */
}
```

### HTML Structure
```html
<div class="users-table">
    <div class="table-header">
        <!-- Header content -->
    </div>
    <table>
        <!-- Table content -->
    </table>
</div>
```

## Incorrect Pattern (What NOT to do)

### ❌ Wrong: Container styles on table element
```css
/* WRONG: Container styles applied directly to table */
.scorecards-table {
    background: #ffffff;  /* ❌ Container style */
    padding: 1rem;        /* ❌ Container style */
    border-radius: 0.5rem; /* ❌ Container style */
    width: 100%;
    border-collapse: separate; /* ✓ Table style */
    table-layout: fixed;  /* ✓ Table style */
}
```

### ✅ Correct: Separate container and table
```css
/* Container wrapper */
.scorecards-table-section {
    background: #ffffff;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 0.0625rem solid #e5e7eb;
    box-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05);
}

/* Table element - nested selector */
.scorecards-table-section table,
.scorecards-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
}
```

## Detection Rules

### Container Styles (should be on wrapper div)
- `background` / `background-color`
- `padding`
- `border-radius`
- `box-shadow`
- `border` (outer border)
- `max-width` (with `width: 100%`)

### Table Styles (should be on table element)
- `border-collapse`
- `border-spacing`
- `table-layout`
- `width` (can be on both, but check context)

### Red Flags
1. **Container styles on table selector** - If a selector like `.table-name` has `background`, `padding`, `border-radius`, it's likely wrong
2. **Missing container wrapper** - If you have table styles but no container wrapper, you're missing structure
3. **No nested selectors** - If container and table are separate classes without nesting, consider using nested pattern

## Automatic Detection

Use the CSS Pattern Validator:

```bash
# Validate a single file
npm run validate:css src/features/settings/scorecards/presentation/scorecards-table.css

# Validate a directory
npm run validate:css src/features/settings/scorecards/presentation/

# Compare with reference
npm run validate:css src/features/settings/scorecards/presentation/scorecards-table.css src/features/settings/user-management/presentation/user-management-table.css
```

## Quick Checklist

When creating a new table/list view CSS file:

- [ ] Container wrapper class exists (e.g., `.table-section`, `.list-container`)
- [ ] Container has: `background`, `padding`, `border-radius`, `box-shadow`
- [ ] Table selector is nested: `.container table` or separate class
- [ ] Table has: `border-collapse`, `border-spacing`, `table-layout`
- [ ] All table cell selectors use nested pattern: `.container th`, `.container td`
- [ ] `box-sizing: border-box` is set on container
- [ ] Responsive breakpoints included (`@media` queries)
- [ ] Column widths use percentage or fixed units
- [ ] Text alignment specified per column (left/center/right)

## Common Issues Fixed

### Issue 1: Container styles on table
**Symptom:** Table has background/padding but layout breaks
**Fix:** Move container styles to wrapper div

### Issue 2: Missing container wrapper
**Symptom:** Table looks flat, no card-like appearance
**Fix:** Add container wrapper with background, padding, border-radius

### Issue 3: Inconsistent nesting
**Symptom:** Some styles work, others don't
**Fix:** Use consistent nested selector pattern throughout

## Examples

### ✅ Good Example: `user-management-table.css`
- Container: `.users-table` (wrapper div)
- Table: `.users-table table` (nested)
- Cells: `.users-table th`, `.users-table td` (nested)

### ✅ Good Example: `scorecards-table.css` (after fix)
- Container: `.scorecards-table-section` (wrapper div)
- Table: `.scorecards-table-section table`, `.scorecards-table` (nested + direct)
- Cells: `.scorecards-table-section table th`, `.scorecards-table th` (nested + direct)

### ❌ Bad Example: Before fix
- Container styles mixed with table styles on `.scorecards-table`
- No clear separation between container and table
- Layout breaks due to conflicting styles

## Related Files

- Reference pattern: `src/features/settings/user-management/presentation/user-management-table.css`
- Validator script: `scripts/css-pattern-validator.js`
- Fixed example: `src/features/settings/scorecards/presentation/scorecards-table.css`


