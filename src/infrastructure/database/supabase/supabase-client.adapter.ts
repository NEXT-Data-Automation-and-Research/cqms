/**
 * Supabase Database Adapter
 * 
 * This is the "Supabase remote control" that follows our interface.
 * If we want to switch to PostgreSQL later, we just make a new adapter!
 * 
 * Usage:
 *   const db = new SupabaseClientAdapter(window.supabaseClient);
 *   const { data } = await db.from('users').select('*').execute();
 */

import { IDatabaseClient, IQueryBuilder } from '../../../core/database/database-client.interface.js';
import { SupabaseQueryBuilder } from './supabase-query-builder.js';

export class SupabaseClientAdapter implements IDatabaseClient {
  public client: any; // Supabase client (public for RPC access)
  private connected: boolean = false;

  constructor(supabaseClient: any) {
    this.client = supabaseClient;
    this.connected = true;
  }

  from(table: string): IQueryBuilder {
    return new SupabaseQueryBuilder(this.client.from(table));
  }

  get auth() {
    return this.client.auth;
  }

  async connect(): Promise<void> {
    // Supabase connects automatically
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // Supabase doesn't need explicit disconnect
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

