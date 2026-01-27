/**
 * Supabase Query Builder
 * 
 * This wraps Supabase's query builder to match our interface.
 * This way, our code works the same whether we use Supabase or PostgreSQL!
 * 
 * @example
 * ```typescript
 * const query = new SupabaseQueryBuilder(supabase.from('users'));
 * const { data, error } = await query
 *   .select(['id', 'name'])
 *   .eq('active', true)
 *   .order('name', { ascending: true })
 *   .limit(10)
 *   .execute<User[]>();
 * ```
 */

import { IQueryBuilder } from '../../../core/database/query-builder.interface.js';
import {
  validateColumn,
  validateSelectColumns,
  validateInsertData,
  validateUpdateData,
  validateLimit,
  validateInValues,
  validateLikePattern,
  validateNotOperator,
} from './query-validators.js';

type SupabaseQuery = any; // Supabase query builder type

export class SupabaseQueryBuilder implements IQueryBuilder {
  private query: SupabaseQuery;

  /**
   * Creates a new SupabaseQueryBuilder instance
   * @param query - The Supabase query builder instance
   */
  constructor(query: SupabaseQuery) {
    if (!query) {
      throw new Error('Query builder cannot be null or undefined');
    }
    this.query = query;
  }

  /**
   * Select columns to retrieve
   * @param columns - Column names (string or array)
   * @param options - Select options (e.g., { count: 'exact', head: true })
   * @returns Query builder instance for method chaining
   */
  select(columns: string | string[], options?: { count?: string; head?: boolean }): IQueryBuilder {
    validateSelectColumns(columns);
    
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    
    if (options) {
      this.query = this.query.select(cols, options);
    } else {
      this.query = this.query.select(cols);
    }
    return this;
  }

  /**
   * Insert new data
   * @param data - Data to insert (object or array of objects)
   * @returns Query builder instance for method chaining
   */
  insert(data: any): IQueryBuilder {
    validateInsertData(data);
    this.query = this.query.insert(data);
    return this;
  }

  /**
   * Update existing data
   * @param data - Data to update
   * @returns Query builder instance for method chaining
   */
  update(data: any): IQueryBuilder {
    validateUpdateData(data);
    this.query = this.query.update(data);
    return this;
  }

  /**
   * Delete data
   * @returns Query builder instance for method chaining
   */
  delete(): IQueryBuilder {
    this.query = this.query.delete();
    return this;
  }

  /**
   * Filter: equals
   */
  eq(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.eq(column, value);
    return this;
  }

  /**
   * Filter: not equals
   */
  neq(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.neq(column, value);
    return this;
  }

  /**
   * Filter: greater than
   */
  gt(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.gt(column, value);
    return this;
  }

  /**
   * Filter: greater than or equal
   */
  gte(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.gte(column, value);
    return this;
  }

  /**
   * Filter: less than
   */
  lt(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.lt(column, value);
    return this;
  }

  /**
   * Filter: less than or equal
   */
  lte(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.lte(column, value);
    return this;
  }

  /**
   * Filter: value in array
   */
  in(column: string, values: any[]): IQueryBuilder {
    validateColumn(column);
    validateInValues(values);
    this.query = this.query.in(column, values);
    return this;
  }

  /**
   * Filter: like pattern matching (case-sensitive)
   */
  like(column: string, pattern: string): IQueryBuilder {
    validateColumn(column);
    validateLikePattern(pattern);
    this.query = this.query.like(column, pattern);
    return this;
  }

  /**
   * Filter: not (negation)
   */
  not(column: string, operator: string, value: any): IQueryBuilder {
    validateColumn(column);
    validateNotOperator(operator);
    this.query = this.query.not(column, operator, value);
    return this;
  }

  /**
   * Filter: is (null check)
   */
  is(column: string, value: any): IQueryBuilder {
    validateColumn(column);
    this.query = this.query.is(column, value);
    return this;
  }

  /**
   * Filter: case-insensitive like
   */
  ilike(column: string, pattern: string): IQueryBuilder {
    validateColumn(column);
    validateLikePattern(pattern);
    this.query = this.query.ilike(column, pattern);
    return this;
  }

  /**
   * Sort results
   */
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder {
    validateColumn(column);
    const ascending = options?.ascending ?? true;
    this.query = this.query.order(column, { ascending });
    return this;
  }

  /**
   * Limit number of results
   */
  limit(count: number): IQueryBuilder {
    validateLimit(count);
    this.query = this.query.limit(count);
    return this;
  }

  /**
   * Return single result (instead of array)
   */
  single(): IQueryBuilder {
    this.query = this.query.single();
    return this;
  }

  /**
   * Return single result or null if not found (doesn't throw error)
   */
  maybeSingle(): IQueryBuilder {
    this.query = this.query.maybeSingle();
    return this;
  }

  /**
   * Execute the query
   * @returns Promise with data and error in Supabase format
   */
  async execute<T = any>(): Promise<{ data: T | null; error: any }> {
    try {
      const result = await this.query;
      
      // Normalize the response format
      return {
        data: result.data as T | null,
        error: result.error || null,
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

