# Database Abstraction Layer Proposal

## Overview
This document outlines how to make the architecture database-agnostic, allowing easy migration from Supabase to any other database (PostgreSQL, MySQL, MongoDB, etc.).

## Enhanced Structure

```
src/
├── core/                          # NEW: Core abstractions
│   ├── database/
│   │   ├── database-client.interface.ts    # Database client interface
│   │   ├── query-builder.interface.ts      # Query builder interface
│   │   └── database-adapter.interface.ts   # Adapter interface
│   └── repository/
│       └── repository.interface.ts         # Base repository interface
│
├── infrastructure/
│   ├── database/
│   │   ├── supabase/
│   │   │   ├── supabase-client.adapter.ts  # Supabase implementation
│   │   │   └── supabase-query-builder.ts   # Supabase query builder
│   │   └── postgresql/                    # Future: PostgreSQL adapter
│   │       ├── postgresql-client.adapter.ts
│   │       └── postgresql-query-builder.ts
│   └── database-factory.ts                # Factory to create DB client
│
└── features/
    └── [feature-name]/
        ├── domain/
        ├── infrastructure/
        │   └── [feature]-repository.ts    # Uses database interface
        ├── application/
        └── presentation/
```

## Key Components

### 1. Database Client Interface

```typescript
// src/core/database/database-client.interface.ts
export interface IDatabaseClient {
  // Table operations
  from(table: string): IQueryBuilder;
  
  // Auth operations (if needed)
  auth?: {
    getUser(): Promise<{ data: { user: any }, error: any }>;
    getSession(): Promise<{ data: { session: any }, error: any }>;
  };
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

### 2. Query Builder Interface

```typescript
// src/core/database/query-builder.interface.ts
export interface IQueryBuilder {
  select(columns: string | string[]): IQueryBuilder;
  insert(data: any): IQueryBuilder;
  update(data: any): IQueryBuilder;
  delete(): IQueryBuilder;
  eq(column: string, value: any): IQueryBuilder;
  neq(column: string, value: any): IQueryBuilder;
  gt(column: string, value: any): IQueryBuilder;
  gte(column: string, value: any): IQueryBuilder;
  lt(column: string, value: any): IQueryBuilder;
  lte(column: string, value: any): IQueryBuilder;
  in(column: string, values: any[]): IQueryBuilder;
  like(column: string, pattern: string): IQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder;
  limit(count: number): IQueryBuilder;
  single(): IQueryBuilder;
  
  // Execute query
  execute<T = any>(): Promise<{ data: T | null; error: any }>;
}
```

### 3. Repository Interface

```typescript
// src/core/repository/repository.interface.ts
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

### 4. Database Factory

```typescript
// src/infrastructure/database-factory.ts
import { IDatabaseClient } from '../core/database/database-client.interface.js';
import { SupabaseClientAdapter } from './database/supabase/supabase-client.adapter.js';
// Future: import { PostgreSQLClientAdapter } from './database/postgresql/postgresql-client.adapter.js';

export class DatabaseFactory {
  static createClient(type: 'supabase' | 'postgresql' | 'mysql' = 'supabase'): IDatabaseClient {
    switch (type) {
      case 'supabase':
        return new SupabaseClientAdapter();
      // case 'postgresql':
      //   return new PostgreSQLClientAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}
```

## Migration Example

### Before (Supabase-specific):
```typescript
// infrastructure/auditor-dashboard-repository.ts
export class AuditorDashboardRepository {
  async loadAllUsers(): Promise<Auditor[]> {
    if (!window.supabaseClient) {
      throw new Error('Supabase client not available');
    }
    
    const { data, error } = await window.supabaseClient
      .from('users')
      .select('email, name, role')
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  }
}
```

### After (Database-agnostic):
```typescript
// infrastructure/auditor-dashboard-repository.ts
import { IDatabaseClient } from '../../core/database/database-client.interface.js';
import type { Auditor } from '../domain/entities.js';

export class AuditorDashboardRepository {
  constructor(private db: IDatabaseClient) {}
  
  async loadAllUsers(): Promise<Auditor[]> {
    const { data, error } = await this.db
      .from('users')
      .select(['email', 'name', 'role'])
      .eq('is_active', true)
      .execute<Auditor>();
    
    if (error) throw error;
    return data || [];
  }
}
```

### Usage in Application Layer:
```typescript
// application/auditor-dashboard-controller.ts
import { DatabaseFactory } from '../../infrastructure/database-factory.js';
import { AuditorDashboardRepository } from '../infrastructure/auditor-dashboard-repository.js';

const db = DatabaseFactory.createClient('supabase'); // Change to 'postgresql' to switch
const repository = new AuditorDashboardRepository(db);
```

## Benefits

1. **Zero Changes to Domain Layer**: Domain entities remain pure
2. **Zero Changes to Application Layer**: Business logic unchanged
3. **Zero Changes to Presentation Layer**: UI remains the same
4. **Only Infrastructure Changes**: Just swap the adapter implementation
5. **Type Safety**: Full TypeScript support with interfaces
6. **Testability**: Easy to mock database for unit tests

## Migration Path

### Phase 1: Add Abstraction Layer (Non-breaking)
1. Create interfaces in `src/core/database/`
2. Create Supabase adapter implementing interfaces
3. Update repositories to use interface (keep Supabase implementation)
4. Test that everything still works

### Phase 2: Dependency Injection
1. Update repositories to accept database client via constructor
2. Use factory pattern to create database client
3. Update controllers to inject database client

### Phase 3: Future Database Support
1. Create new adapter for target database (e.g., PostgreSQL)
2. Update factory to support new database
3. Change one line: `DatabaseFactory.createClient('postgresql')`
4. Done! 🎉

## Configuration

```typescript
// src/config/database.config.ts
export const DATABASE_CONFIG = {
  type: process.env.DATABASE_TYPE || 'supabase', // 'supabase' | 'postgresql' | 'mysql'
  // ... other config
};
```

## Example: PostgreSQL Adapter (Future)

```typescript
// src/infrastructure/database/postgresql/postgresql-client.adapter.ts
import { IDatabaseClient, IQueryBuilder } from '../../../core/database/database-client.interface.js';
import { PostgreSQLQueryBuilder } from './postgresql-query-builder.js';

export class PostgreSQLClientAdapter implements IDatabaseClient {
  private connection: any; // pg.Pool or similar
  
  from(table: string): IQueryBuilder {
    return new PostgreSQLQueryBuilder(this.connection, table);
  }
  
  // ... implement other methods
}
```

## Conclusion

The current structure is **90% flexible**. Adding this abstraction layer makes it **100% flexible** for database migration. The domain, application, and presentation layers remain completely unchanged when switching databases.

