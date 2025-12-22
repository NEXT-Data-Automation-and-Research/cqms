/**
 * Dependency Injection Container
 * 
 * Simple DI container for managing dependencies and promoting testability.
 * 
 * Usage:
 *   const container = new DIContainer();
 *   container.register('database', () => DatabaseFactory.createClient('supabase'));
 *   container.register('repository', (c) => new MyRepository(c.get('database')));
 *   const repo = container.get<MyRepository>('repository');
 */

export type Factory<T> = (container: DIContainer) => T;
export type ServiceIdentifier = string | symbol;

export class DIContainer {
  private services: Map<ServiceIdentifier, Factory<any>> = new Map();
  private singletons: Map<ServiceIdentifier, any> = new Map();
  private transient: Set<ServiceIdentifier> = new Set();

  /**
   * Register a service factory
   */
  register<T>(
    identifier: ServiceIdentifier,
    factory: Factory<T>,
    options?: { singleton?: boolean }
  ): void {
    this.services.set(identifier, factory);
    
    if (options?.singleton === false) {
      this.transient.add(identifier);
    } else {
      this.transient.delete(identifier);
    }
  }

  /**
   * Register a singleton instance
   */
  registerInstance<T>(identifier: ServiceIdentifier, instance: T): void {
    this.singletons.set(identifier, instance);
    this.transient.delete(identifier);
  }

  /**
   * Get a service instance
   */
  get<T>(identifier: ServiceIdentifier): T {
    // Check if already resolved as singleton
    if (this.singletons.has(identifier)) {
      return this.singletons.get(identifier) as T;
    }

    // Check if factory exists
    const factory = this.services.get(identifier);
    if (!factory) {
      throw new Error(`Service '${String(identifier)}' not registered`);
    }

    // Create instance
    const instance = factory(this) as T;

    // Cache if singleton
    if (!this.transient.has(identifier)) {
      this.singletons.set(identifier, instance);
    }

    return instance;
  }

  /**
   * Check if service is registered
   */
  has(identifier: ServiceIdentifier): boolean {
    return this.services.has(identifier) || this.singletons.has(identifier);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.transient.clear();
  }

  /**
   * Remove a specific service
   */
  remove(identifier: ServiceIdentifier): void {
    this.services.delete(identifier);
    this.singletons.delete(identifier);
    this.transient.delete(identifier);
  }
}

// Global container instance
export const globalContainer = new DIContainer();

