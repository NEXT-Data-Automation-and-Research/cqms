/**
 * User Management Service
 * Business logic for user management operations
 */

import { BaseService } from '../../../../core/service/base-service.js';
import { UserManagementRepository } from '../infrastructure/user-management-repository.js';
import type { User } from '../domain/entities.js';
import type { UserStatistics, CreateUserData, UpdateUserData, BulkEditData, CSVUserRow, BulkUploadResult } from '../domain/types.js';
import { createValidationError, createBusinessError } from '../../../../core/errors/app-error.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import { sanitizeString } from '../../../../api/utils/validation.js';
import { generateDefaultPasswordHash } from '../../../../utils/password-utils.js';
import type { UserRole } from '../domain/types.js';

export class UserManagementService extends BaseService {
  constructor(private repository: UserManagementRepository) {
    super();
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return this.executeBusinessLogic(
      async () => {
        const users = await this.repository.getAllUsers();
        return this.sortUsersByAccessLevel(users);
      },
      'Failed to load users'
    );
  }

  /**
   * Calculate user statistics
   */
  async calculateStatistics(users: User[]): Promise<UserStatistics> {
    return this.executeBusinessLogic(
      async () => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.is_active).length;
        const inactiveUsers = totalUsers - activeUsers;
        const superAdmins = users.filter(u => u.role === 'Super Admin').length;
        const admins = users.filter(u => u.role === 'Admin').length;
        const qualityAnalysts = users.filter(u => u.role === 'Quality Analyst').length;
        const employees = users.filter(u => u.role === 'Employee').length;
        
        // Recent logins (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLogins = users.filter(u => {
          if (!u.last_login) return false;
          const lastLoginDate = new Date(u.last_login);
          return lastLoginDate >= sevenDaysAgo;
        }).length;
        
        // Department stats - match actual department names
        const qptUsers = users.filter(u => 
          u.department === 'Quality, Performance & Training' || u.department === 'QPT'
        ).length;
        const cexUsers = users.filter(u => 
          u.department === 'Client Experience' || u.department === 'CEx'
        ).length;
        
        return {
          totalUsers,
          activeUsers,
          inactiveUsers,
          superAdmins,
          admins,
          qualityAnalysts,
          employees,
          recentLogins,
          qptUsers,
          cexUsers
        };
      },
      'Failed to calculate statistics'
    );
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Validate and sanitize input
    const validRoles: UserRole[] = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    
    this.validateInput(data, (d) => {
      if (!d.name || d.name.trim().length === 0) {
        return 'Name is required';
      }
      if (d.name.trim().length > 100) {
        return 'Name must be 100 characters or less';
      }
      if (!d.email || d.email.trim().length === 0) {
        return 'Email is required';
      }
      if (d.email.trim().length > 255) {
        return 'Email must be 255 characters or less';
      }
      if (!this.isValidEmail(d.email)) {
        return 'Invalid email format';
      }
      if (!d.role) {
        return 'Role is required';
      }
      if (!validRoles.includes(d.role as UserRole)) {
        return `Invalid role. Must be one of: ${validRoles.join(', ')}`;
      }
      return true;
    });

    return this.executeBusinessLogic(
      async () => {
        // Sanitize all string inputs
        const sanitizedEmail = sanitizeString(data.email.toLowerCase().trim(), 255);
        const sanitizedName = sanitizeString(data.name.trim(), 100);
        const sanitizedRole = data.role as UserRole;
        
        // Check if email already exists
        const existing = await this.repository.getUser(sanitizedEmail);
        if (existing) {
          throw createBusinessError('A user with this email already exists');
        }

        // Sanitize optional fields
        const sanitizedDepartment = data.department ? sanitizeString(data.department, 100) : null;
        const sanitizedChannel = data.channel ? sanitizeString(data.channel, 100) : null;
        const sanitizedTeam = data.team ? sanitizeString(data.team, 100) : null;
        const sanitizedTeamSupervisor = data.team_supervisor ? sanitizeString(data.team_supervisor, 255) : null;
        const sanitizedQualityMentor = data.quality_mentor ? sanitizeString(data.quality_mentor, 255) : null;
        const sanitizedDesignation = data.designation ? sanitizeString(data.designation, 100) : null;
        const sanitizedCountry = data.country ? sanitizeString(data.country, 100) : null;
        const sanitizedIntercomAdminId = data.intercom_admin_id ? sanitizeString(data.intercom_admin_id, 50) : null;
        const sanitizedIntercomAdminAlias = data.intercom_admin_alias ? sanitizeString(data.intercom_admin_alias, 100) : null;
        const sanitizedEmployeeId = data.employee_id ? sanitizeString(data.employee_id, 50) : null;

        // Generate default password hash
        // SECURITY: Currently uses email as password (for compatibility)
        // TODO: Implement proper password generation and hashing
        const passwordHash = generateDefaultPasswordHash(sanitizedEmail);
        const userData: Partial<User> = {
          email: sanitizedEmail,
          name: sanitizedName,
          role: sanitizedRole,
          department: sanitizedDepartment,
          channel: sanitizedChannel,
          team: sanitizedTeam,
          team_supervisor: sanitizedTeamSupervisor,
          quality_mentor: sanitizedQualityMentor,
          designation: sanitizedDesignation,
          employee_id: sanitizedEmployeeId,
          country: sanitizedCountry,
          is_active: data.is_active,
          intercom_admin_id: sanitizedIntercomAdminId,
          intercom_admin_alias: sanitizedIntercomAdminAlias,
          password_hash: passwordHash,
          login_count: 0,
          last_login: null
        };

        return await this.repository.createUser(userData);
      },
      'Failed to create user'
    );
  }

  /**
   * Update user
   */
  async updateUser(email: string, data: UpdateUserData): Promise<User> {
    const validRoles: UserRole[] = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    
    this.validateInput(email, (e) => {
      if (!e || e.trim().length === 0) {
        return 'Email is required';
      }
      if (e.trim().length > 255) {
        return 'Email must be 255 characters or less';
      }
      if (!this.isValidEmail(e)) {
        return 'Invalid email format';
      }
      return true;
    });

    return this.executeBusinessLogic(
      async () => {
        const sanitizedEmail = sanitizeString(email.toLowerCase().trim(), 255);
        const updates: Partial<User> = {};
        
        if (data.name !== undefined) {
          if (!data.name || data.name.trim().length === 0) {
            throw createValidationError('Name cannot be empty', { field: 'name' });
          }
          if (data.name.trim().length > 100) {
            throw createValidationError('Name must be 100 characters or less', { field: 'name' });
          }
          updates.name = sanitizeString(data.name.trim(), 100);
        }
        if (data.role !== undefined) {
          if (data.role && !validRoles.includes(data.role as UserRole)) {
            throw createValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, { field: 'role' });
          }
          updates.role = data.role;
        }
        if (data.department !== undefined) updates.department = data.department ? sanitizeString(data.department, 100) : null;
        if (data.channel !== undefined) updates.channel = data.channel ? sanitizeString(data.channel, 100) : null;
        if (data.team !== undefined) updates.team = data.team ? sanitizeString(data.team, 100) : null;
        if (data.team_supervisor !== undefined) updates.team_supervisor = data.team_supervisor ? sanitizeString(data.team_supervisor, 255) : null;
        if (data.quality_mentor !== undefined) updates.quality_mentor = data.quality_mentor ? sanitizeString(data.quality_mentor, 255) : null;
        if (data.designation !== undefined) updates.designation = data.designation ? sanitizeString(data.designation, 100) : null;
        if (data.employee_id !== undefined) {
          if (data.employee_id && data.employee_id.trim().length > 50) {
            throw createValidationError('Employee ID must be 50 characters or less', { field: 'employee_id' });
          }
          updates.employee_id = data.employee_id ? sanitizeString(String(parseInt(data.employee_id, 10)), 50) : null;
        }
        if (data.country !== undefined) updates.country = data.country ? sanitizeString(data.country, 100) : null;
        if (data.is_active !== undefined) updates.is_active = data.is_active;
        if (data.intercom_admin_id !== undefined) updates.intercom_admin_id = data.intercom_admin_id ? sanitizeString(data.intercom_admin_id, 50) : null;
        if (data.intercom_admin_alias !== undefined) updates.intercom_admin_alias = data.intercom_admin_alias ? sanitizeString(data.intercom_admin_alias, 100) : null;

        return await this.repository.updateUser(sanitizedEmail, updates);
      },
      'Failed to update user'
    );
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(emails: string[], data: BulkEditData): Promise<void> {
    const validRoles: UserRole[] = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    
    this.validateInput(emails, (e) => {
      if (!Array.isArray(e) || e.length === 0) {
        return 'At least one user must be selected';
      }
      // Validate each email
      for (const email of e) {
        if (!email || email.trim().length === 0) {
          return 'Invalid email in selection';
        }
        if (email.trim().length > 255) {
          return 'Email too long';
        }
        if (!this.isValidEmail(email)) {
          return `Invalid email format: ${email}`;
        }
      }
      return true;
    });

    return this.executeBusinessLogic(
      async () => {
        const updates: Partial<User> = {};
        
        if (data.team !== undefined) updates.team = data.team ? sanitizeString(data.team, 100) : null;
        if (data.department !== undefined) updates.department = data.department ? sanitizeString(data.department, 100) : null;
        if (data.channel !== undefined) updates.channel = data.channel ? sanitizeString(data.channel, 100) : null;
        if (data.teamSupervisor !== undefined) updates.team_supervisor = data.teamSupervisor ? sanitizeString(data.teamSupervisor, 255) : null;
        if (data.qualitySupervisor !== undefined) updates.quality_mentor = data.qualitySupervisor ? sanitizeString(data.qualitySupervisor, 255) : null;
        if (data.role !== undefined) {
          if (data.role && !validRoles.includes(data.role as UserRole)) {
            throw createValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, { field: 'role' });
          }
          updates.role = data.role;
        }

        if (Object.keys(updates).length === 0) {
          throw createBusinessError('No fields to update');
        }

        // Sanitize email addresses
        const sanitizedEmails = emails.map(e => sanitizeString(e.toLowerCase().trim(), 255));
        await this.repository.bulkUpdateUsers(sanitizedEmails, updates);
      },
      'Failed to bulk update users'
    );
  }

  /**
   * Process CSV bulk upload
   */
  async processBulkUpload(rows: CSVUserRow[]): Promise<BulkUploadResult> {
    return this.executeBusinessLogic(
      async () => {
        const errors: string[] = [];
        const usersToCreate: Partial<User>[] = [];
        const validRoles: UserRole[] = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // +2 because row 1 is header

          // Validate and sanitize required fields
          if (!row.Name || row.Name.trim().length === 0) {
            errors.push(`Row ${rowNum}: Name is required`);
            continue;
          }
          const sanitizedName = sanitizeString(row.Name.trim(), 100);
          if (sanitizedName.length === 0) {
            errors.push(`Row ${rowNum}: Name contains invalid characters`);
            continue;
          }

          if (!row.Email || row.Email.trim().length === 0) {
            errors.push(`Row ${rowNum}: Email is required`);
            continue;
          }
          const sanitizedEmail = sanitizeString(row.Email.toLowerCase().trim(), 255);
          if (sanitizedEmail.length === 0) {
            errors.push(`Row ${rowNum}: Email contains invalid characters`);
            continue;
          }
          if (!this.isValidEmail(sanitizedEmail)) {
            errors.push(`Row ${rowNum}: Invalid email format: ${row.Email}`);
            continue;
          }

          const role = (row.Role || 'Employee').trim() as UserRole;
          if (!validRoles.includes(role)) {
            errors.push(`Row ${rowNum}: Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
            continue;
          }

          // Check if email already exists
          const existing = await this.repository.getUser(sanitizedEmail);
          if (existing) {
            errors.push(`Row ${rowNum}: Email already exists: ${row.Email}`);
            continue;
          }

          // Sanitize optional fields
          const sanitizedDepartment = row.Department ? sanitizeString(row.Department, 100) : null;
          const sanitizedChannel = row.Channel ? sanitizeString(row.Channel, 100) : null;
          const sanitizedTeam = row.Team ? sanitizeString(row.Team, 100) : null;
          const sanitizedDesignation = row.Designation ? sanitizeString(row.Designation, 100) : null;
          const sanitizedEmployeeId = row['Employee ID'] ? sanitizeString(row['Employee ID'], 50) : null;
          const sanitizedCountry = row.Country ? sanitizeString(row.Country, 100) : null;
          const sanitizedTeamSupervisor = row['Team Supervisor'] ? sanitizeString(row['Team Supervisor'], 255) : null;
          const sanitizedQualityMentor = row['Quality Mentor'] ? sanitizeString(row['Quality Mentor'], 255) : null;

          usersToCreate.push({
            email: sanitizedEmail,
            name: sanitizedName,
            role: role,
            department: sanitizedDepartment,
            channel: sanitizedChannel,
            team: sanitizedTeam,
            designation: sanitizedDesignation,
            employee_id: sanitizedEmployeeId,
            country: sanitizedCountry,
            team_supervisor: sanitizedTeamSupervisor,
            quality_mentor: sanitizedQualityMentor,
            is_active: (row.Status || 'Active').toLowerCase() === 'active',
            password_hash: generateDefaultPasswordHash(sanitizedEmail),
            login_count: 0,
            last_login: null
          });
        }

        // Create users in batches
        let successCount = 0;
        let failCount = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < usersToCreate.length; i += BATCH_SIZE) {
          const batch = usersToCreate.slice(i, i + BATCH_SIZE);
          try {
            for (const userData of batch) {
              await this.repository.createUser(userData);
              successCount++;
            }
          } catch (error) {
            failCount += batch.length;
            errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        return {
          success: successCount,
          failed: failCount,
          errors
        };
      },
      'Failed to process bulk upload'
    );
  }

  /**
   * Get channels
   */
  async getChannels() {
    return this.repository.getChannels();
  }

  /**
   * Get Intercom admins
   */
  async getIntercomAdmins() {
    return this.repository.getIntercomAdmins();
  }

  /**
   * Sort users by access level
   */
  private sortUsersByAccessLevel(users: User[]): User[] {
    const roleHierarchy: Record<string, number> = {
      'Super Admin': 4,
      'Admin': 3,
      'Quality Analyst': 2,
      'Employee': 1,
      'General User': 0
    };

    return users.sort((a, b) => {
      const aLevel = roleHierarchy[a.role || ''] || 0;
      const bLevel = roleHierarchy[b.role || ''] || 0;
      
      if (aLevel !== bLevel) {
        return bLevel - aLevel; // Higher level first
      }
      
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

