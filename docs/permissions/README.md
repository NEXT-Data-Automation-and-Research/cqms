# Permission Management System

A comprehensive permission management system that supports both **role-based** and **individual-level** permissions without relying on Row Level Security (RLS).

## Features

- ✅ **Role-Based Permissions**: Define permissions by role (Super Admin, Admin, Employee, etc.)
- ✅ **Individual Permissions**: Override permissions for specific users
- ✅ **Hierarchical Roles**: Role levels for easy bulk permission management
- ✅ **Multiple Rule Types**: Support for pages, features, API endpoints, and actions
- ✅ **Permission Caching**: Built-in caching for performance
- ✅ **No RLS Dependency**: All checks happen at application level
- ✅ **Easy to Use**: Simple middleware and utility functions

## Quick Start

### 1. Apply Database Migration

```bash
# Apply the role hierarchy migration (optional but recommended)
psql -d your_database -f src/db/migrations/016_create_role_hierarchy_table.sql
```

### 2. Protect an API Route

```typescript
import { verifyAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

router.get('/users',
  verifyAuth,
  requirePermission('view_users', 'feature'),
  getUsersHandler
);
```

### 3. Check Permission in Frontend

```typescript
import { hasPermission } from '../utils/permissions.js';

if (await hasPermission('create_audit', 'feature')) {
  // Show create button
}
```

## Architecture

### Permission Check Flow

```
1. User Request
   ↓
2. Authentication Middleware (verifyAuth)
   ↓
3. Permission Middleware (requirePermission)
   ↓
4. Permission Service checks:
   a. Individual DENY rules (blocks if found)
   b. Individual ALLOW rules (grants if found)
   c. Role-based rules (checks allowed_roles or min_role_level)
   d. Default: Deny
   ↓
5. Route Handler (if access granted)
```

### Database Tables

#### `access_control_rules` (Role-Based)
- `rule_type`: 'page', 'feature', 'api_endpoint', 'action'
- `resource_name`: e.g., 'view_users', 'user-management.html'
- `allowed_roles`: JSON array of roles: ['Super Admin', 'Admin']
- `min_role_level`: Minimum hierarchy level required
- `is_active`: Enable/disable rule

#### `user_access_rule` (Individual)
- `user_email`: Specific user
- `rule_type`: Same as access_control_rules
- `resource_name`: Same as access_control_rules
- `access_type`: 'allow' or 'deny' (deny takes precedence)
- `is_active`: Enable/disable rule

#### `role_hierarchy` (Optional Enhancement)
- `role_name`: Role name
- `level`: Hierarchy level (0-5)
- `description`: Role description

## Role Hierarchy

```
Level 5: Super Admin
Level 4: Admin
Level 3: Manager
Level 2: Auditor, Quality Supervisor
Level 1: Employee, Quality Analyst
Level 0: General User
```

## API Endpoints

### Permission Checking
- `POST /api/permissions/check` - Check permission for current user
- `GET /api/permissions/user` - Get current user's permissions summary

### Permission Management (Admin Only)
- `GET /api/permissions/rules` - List all role-based rules
- `POST /api/permissions/rules` - Create role-based rule
- `PUT /api/permissions/rules/:id` - Update role-based rule
- `DELETE /api/permissions/rules/:id` - Delete role-based rule

- `GET /api/permissions/user-rules/:email` - Get user's individual rules
- `POST /api/permissions/user-rules` - Create individual user rule
- `DELETE /api/permissions/user-rules/:id` - Delete individual user rule

## Files Structure

```
src/
├── core/
│   └── permissions/
│       └── permission.service.ts      # Core permission logic
├── api/
│   ├── middleware/
│   │   └── permission.middleware.ts   # Express middleware
│   └── routes/
│       └── permissions.routes.ts      # Permission management API
├── utils/
│   └── permissions.ts                 # Frontend utilities
└── db/
    └── migrations/
        └── 016_create_role_hierarchy_table.sql
```

## Documentation

- [Proposal Document](./PERMISSION_SYSTEM_PROPOSAL.md) - Detailed system design
- [Usage Examples](./USAGE_EXAMPLES.md) - Code examples and patterns

## Common Use Cases

### Use Case 1: Protect Admin Routes

```typescript
router.get('/admin/users',
  verifyAuth,
  requireRole('Super Admin', 'Admin'),
  getUsersHandler
);
```

### Use Case 2: Feature-Based Access

```typescript
router.post('/audits',
  verifyAuth,
  requirePermission('create_audits', 'action'),
  createAuditHandler
);
```

### Use Case 3: Page Access Control

```typescript
// Frontend
if (await canAccessPage('/settings/user-management')) {
  showNavigationLink();
}
```

### Use Case 4: Individual Override

```typescript
// Admin grants specific user access to a page
POST /api/permissions/user-rules
{
  "userEmail": "user@example.com",
  "ruleType": "page",
  "resourceName": "auditor-dashboard.html",
  "accessType": "allow"
}
```

## Security Considerations

1. **Default Deny**: All permissions denied by default
2. **Explicit Allow**: Must explicitly grant access
3. **Deny Override**: Individual deny rules override allows
4. **Audit Trail**: All permission changes logged
5. **Cache Invalidation**: Permission changes invalidate cache immediately
6. **Rate Limiting**: Permission checks rate-limited to prevent abuse

## Migration Guide

### Step 1: Apply Migration
```bash
# Optional: Add role hierarchy table
psql -d your_database -f src/db/migrations/016_create_role_hierarchy_table.sql
```

### Step 2: Create Initial Rules
Use the API or directly insert into `access_control_rules`:

```sql
INSERT INTO access_control_rules (rule_type, resource_name, allowed_roles, is_active)
VALUES 
  ('feature', 'view_users', '["Super Admin", "Admin"]', true),
  ('page', 'user-management.html', '["Super Admin", "Admin"]', true);
```

### Step 3: Update Routes
Add permission middleware to existing routes:

```typescript
// Before
router.get('/users', verifyAuth, getUsersHandler);

// After
router.get('/users', verifyAuth, requirePermission('view_users', 'feature'), getUsersHandler);
```

### Step 4: Update Frontend
Add permission checks to UI components:

```typescript
import { hasPermission } from '../utils/permissions.js';

if (await hasPermission('create_audit', 'feature')) {
  // Show create button
}
```

## Troubleshooting

### Permission Check Always Returns False
1. Check if rule exists in `access_control_rules` table
2. Verify `is_active` is `true`
3. Check user's role matches `allowed_roles` or meets `min_role_level`
4. Look for individual deny rules in `user_access_rule`

### Cache Not Updating
- Permission changes automatically clear cache
- Manually clear: `permissionService.clearCache()`
- Frontend cache: `clearPermissionCache()`

### Performance Issues
- Permission checks are cached for 5 minutes (backend) and 2 minutes (frontend)
- Use `hasPermissionCached()` for frequently checked permissions
- Consider adding database indexes on `user_email` and `resource_name`

## Support

For questions or issues, refer to:
- [Proposal Document](./PERMISSION_SYSTEM_PROPOSAL.md)
- [Usage Examples](./USAGE_EXAMPLES.md)
- Code comments in `permission.service.ts` and `permission.middleware.ts`
