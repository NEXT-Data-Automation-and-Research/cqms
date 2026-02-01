/**
 * Query Builder Interface
 * 
 * This is like a "menu" for database operations.
 * Works the same way for any database.
 * 
 * Example:
 *   db.from('users')
 *     .select(['name', 'email'])
 *     .eq('active', true)
 *     .execute()
 */

export interface IQueryBuilder {
  /**
   * Select columns to retrieve
   * @param columns - Column names (string or array)
   * @param options - Select options (e.g., { count: 'exact', head: true })
   */
  select(columns: string | string[], options?: { count?: string; head?: boolean }): IQueryBuilder;
  
  /**
   * Insert new data
   * @param data - Data to insert
   */
  insert(data: any): IQueryBuilder;
  
  /**
   * Update existing data
   * @param data - Data to update
   */
  update(data: any): IQueryBuilder;
  
  /**
   * Delete data
   */
  delete(): IQueryBuilder;
  
  /**
   * Filter: equals
   * @param column - Column name
   * @param value - Value to match
   */
  eq(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: not equals
   */
  neq(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: greater than
   */
  gt(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: greater than or equal
   */
  gte(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: less than
   */
  lt(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: less than or equal
   */
  lte(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: value in array
   */
  in(column: string, values: any[]): IQueryBuilder;
  
  /**
   * Filter: like pattern matching
   */
  like(column: string, pattern: string): IQueryBuilder;
  
  /**
   * Filter: not (negation)
   * @param column - Column name
   * @param operator - Operator ('is', 'eq', etc.)
   * @param value - Value to negate
   */
  not(column: string, operator: string, value: any): IQueryBuilder;
  
  /**
   * Filter: is (null check)
   * @param column - Column name
   * @param value - Value to check (usually null)
   */
  is(column: string, value: any): IQueryBuilder;
  
  /**
   * Filter: case-insensitive like
   * @param column - Column name
   * @param pattern - Pattern to match
   */
  ilike(column: string, pattern: string): IQueryBuilder;
  
  /**
   * Sort results
   * @param column - Column to sort by
   * @param options - Sort options (ascending/descending)
   */
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder;
  
  /**
   * Limit number of results
   */
  limit(count: number): IQueryBuilder;
  
  /**
   * Set range of results (for pagination and bypassing default limits)
   * @param from - Start index (0-based)
   * @param to - End index (inclusive)
   */
  range(from: number, to: number): IQueryBuilder;
  
  /**
   * Return single result (instead of array)
   */
  single(): IQueryBuilder;
  
  /**
   * Return single result or null if not found (doesn't throw error)
   */
  maybeSingle(): IQueryBuilder;
  
  /**
   * Execute the query
   * @returns Promise with data and error
   */
  execute<T = any>(): Promise<{ data: T | null; error: any }>;
}

