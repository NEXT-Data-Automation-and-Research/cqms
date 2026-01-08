/**
 * User Management Repository
 * Handles database operations for user management feature
 */

import { BaseRepository } from '../../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../../core/database/database-client.interface.js';
import type { User, Channel, IntercomAdmin } from '../domain/entities.js';
import { PEOPLE_USER_MANAGEMENT_FIELDS, CHANNEL_FIELDS, INTERCOM_ADMIN_CACHE_FIELDS } from '../../../../core/constants/field-whitelists.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import { apiClient } from '../../../../utils/api-client.js';

interface PeopleRow {
  email: string | null;
  name: string | null;
  role: string | null;
  department: string | null;
  channel: string | null;
  team: string | null;
  designation: string | null;
  employee_id: number | string | null; // Can be bigint from DB or string from code
  country: string | null;
  team_supervisor: string | null;
  quality_mentor: string | null;
  is_active: boolean | null;
  intercom_admin_id: string | null;
  intercom_admin_alias: string | null;
  last_login: string | null; // Stored as text in DB, can be "null" string
  login_count: number | string | null; // Stored as text in DB, can be "null" string
  avatar_url: string | null; // Avatar URL from people table
  created_at: string | null; // Stored as text in DB
  updated_at: string | null; // Stored as text in DB
}

/**
 * Helper function to normalize null values from database
 * Converts string "null" to actual null
 */
function normalizeNull(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.toLowerCase() === 'null') return null;
  return value;
}

/**
 * Helper function to parse login_count from text to number
 */
function parseLoginCount(value: any): number {
  const normalized = normalizeNull(value);
  if (normalized === null) return 0;
  if (typeof normalized === 'number') return normalized;
  const parsed = parseInt(String(normalized), 10);
  return isNaN(parsed) ? 0 : parsed;
}

export class UserManagementRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'people');
  }

  /**
   * Get all users with all fields needed for user management
   */
  async getAllUsers(): Promise<User[]> {
    return this.getCachedOrFetch(
      'user_management_all_users',
      async () => {
        const result = await this.executeQuery(
          async () => {
            return await this.db
              .from(this.tableName)
              .select(PEOPLE_USER_MANAGEMENT_FIELDS)
              .order('name', { ascending: true })
              .execute<PeopleRow[]>();
          },
          'Failed to load all users'
        );

        const rows = Array.isArray(result) ? result : [];
        const users = rows.map(row => {
          try {
            return this.mapToUser(row);
          } catch (error) {
            return null;
          }
        }).filter((user): user is User => user !== null);
        logInfo(`[UserManagementRepository] Loaded ${users.length} users`);
        return users;
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Find user by email
   */
  async getUser(email: string): Promise<User | null> {
    try {
      const result = await this.executeQuery(
        async () => {
          return await this.db
            .from(this.tableName)
            .select(PEOPLE_USER_MANAGEMENT_FIELDS)
            .eq('email', email)
            .single()
            .execute<PeopleRow>();
        },
        `Failed to find user with email: ${email}`
      );

      return result ? this.mapToUser(result) : null;
    } catch (error) {
      logError(`[UserManagementRepository] Error finding user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Create a new user
   * Uses API endpoint for writes (bypasses RLS)
   */
  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await apiClient.people.create(userData);
      
      if (error) {
        logError(`[UserManagementRepository] API error creating user ${userData.email}:`, error);
        throw new Error(error?.message || `Failed to create user: ${userData.email}`);
      }

      if (!data) {
        logError(`[UserManagementRepository] No data returned when creating user ${userData.email}`);
        throw new Error(`Failed to create user: ${userData.email} - No data returned`);
      }

      this.invalidateCache('user_management_all_users');
      logInfo(`[UserManagementRepository] Created user: ${userData.email}`);
      return this.mapToUser(data as PeopleRow);
    } catch (error) {
      logError(`[UserManagementRepository] Error creating user ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Update user by email
   * Uses API endpoint for writes (bypasses RLS)
   */
  async updateUser(email: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await apiClient.people.update(email, updates);
    
    if (error || !data) {
      throw new Error(error?.message || `Failed to update user: ${email}`);
    }

    this.invalidateCache('user_management_all_users');
    logInfo(`[UserManagementRepository] Updated user: ${email}`);
    return this.mapToUser(data as PeopleRow);
  }

  /**
   * Bulk update users
   * Uses API endpoint for writes (bypasses RLS)
   */
  async bulkUpdateUsers(emails: string[], updates: Partial<User>): Promise<void> {
    const { data, error } = await apiClient.people.bulkUpdate(emails, updates);
    
    if (error) {
      throw new Error(error.message || 'Failed to bulk update users');
    }

    this.invalidateCache('user_management_all_users');
    logInfo(`[UserManagementRepository] Bulk updated ${emails.length} users`);
  }

  /**
   * Get all active channels
   */
  async getChannels(): Promise<Channel[]> {
    return this.getCachedOrFetch(
      'user_management_channels',
      async () => {
        try {
          const result = await this.executeQuery(
            async () => {
              const result = await this.db
                .from('channels')
                .select(CHANNEL_FIELDS)
                .eq('is_active', true)
                .order('name', { ascending: true })
                .execute<Channel[]>();
              return result;
            },
            'Failed to load channels'
          );

          return Array.isArray(result) ? result : [];
        } catch (error) {
          logError('[UserManagementRepository] Error loading channels:', error);
          return [];
        }
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Get all Intercom admins
   */
  async getIntercomAdmins(): Promise<IntercomAdmin[]> {
    return this.getCachedOrFetch(
      'user_management_intercom_admins',
      async () => {
        try {
          const result = await this.executeQuery(
            async () => {
              const result = await this.db
                .from('intercom_admin_cache')
                .select(INTERCOM_ADMIN_CACHE_FIELDS)
                .order('name', { ascending: true })
                .execute<Array<{ id: number | string; email: string | null; name: string | null }>>();
              return result;
            },
            'Failed to load Intercom admins'
          );

          // Convert bigint id to string and filter out null values
          const admins: IntercomAdmin[] = (Array.isArray(result) ? result : [])
            .filter(admin => admin.id && admin.name && admin.email)
            .map(admin => ({
              id: String(admin.id), // Convert bigint to string
              email: admin.email || '',
              name: admin.name || ''
            }));

          return admins;
        } catch (error) {
          logError('[UserManagementRepository] Error loading Intercom admins:', error);
          return [];
        }
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Invalidate a specific cache by key
   */
  invalidateCacheKey(key: string): void {
    this.invalidateCache(key);
  }

  /**
   * Invalidate all caches
   */
  invalidateAllCaches(): void {
    this.invalidateCache('user_management_all_users');
    this.invalidateCache('user_management_channels');
    this.invalidateCache('user_management_intercom_admins');
  }

  /**
   * Map database row to User entity
   * Handles data type conversions and null string values
   */
  private mapToUser(row: PeopleRow): User {
    // Convert employee_id: bigint -> string
    const employeeId = row.employee_id !== null && row.employee_id !== undefined
      ? String(row.employee_id)
      : null;

    // Convert login_count: text -> number (handles "null" string)
    const loginCount = parseLoginCount(row.login_count);

    // Handle last_login: text -> string (can be ISO string or "null" string)
    const lastLogin = normalizeNull(row.last_login) as string | null;

    // Handle timestamps: text -> ISO string
    const createdAt = normalizeNull(row.created_at) as string | null || new Date().toISOString();
    const updatedAt = normalizeNull(row.updated_at) as string | null || new Date().toISOString();

    // Handle intercom_admin_id: can be string "null" -> actual null
    const intercomAdminId = normalizeNull(row.intercom_admin_id) as string | null;
    const intercomAdminAlias = normalizeNull(row.intercom_admin_alias) as string | null;

    // Handle team_supervisor and quality_mentor: can be string "null" -> actual null
    const teamSupervisor = normalizeNull(row.team_supervisor) as string | null;
    const qualityMentor = normalizeNull(row.quality_mentor) as string | null;

    return {
      email: row.email || '',
      name: row.name || 'Unknown',
      role: (row.role || 'General User') as User['role'],
      department: normalizeNull(row.department) as string | null,
      channel: normalizeNull(row.channel) as string | null,
      team: normalizeNull(row.team) as string | null,
      designation: normalizeNull(row.designation) as string | null,
      employee_id: employeeId,
      country: normalizeNull(row.country) as string | null,
      team_supervisor: teamSupervisor,
      quality_mentor: qualityMentor,
      is_active: row.is_active ?? false,
      intercom_admin_id: intercomAdminId,
      intercom_admin_alias: intercomAdminAlias,
      last_login: lastLogin,
      login_count: loginCount,
      avatar_url: normalizeNull(row.avatar_url) as string | null,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }
}

