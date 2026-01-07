/**
 * Dummy Data Service for Audit Distribution
 * This file provides mock data for development and can be removed later
 * when connected to the actual database.
 */

import type {
  Employee,
  Auditor,
  Scorecard,
  AuditAssignment,
  AgentSummary
} from '../domain/types.js';

export class AuditDistributionDummyData {
  /**
   * Generate dummy employees
   */
  static getDummyEmployees(): Employee[] {
    return [
      {
        id: '1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        avatar_url: null,
        channel: 'Email',
        team: 'Support Team A',
        department: 'Customer Service',
        country: 'USA',
        designation: 'Agent',
        quality_mentor: 'qa1@example.com',
        team_supervisor: 'supervisor1@example.com',
        is_active: true
      },
      {
        id: '2',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        avatar_url: null,
        channel: 'Chat',
        team: 'Support Team B',
        department: 'Customer Service',
        country: 'UK',
        designation: 'Senior Agent',
        quality_mentor: 'qa2@example.com',
        team_supervisor: 'supervisor2@example.com',
        is_active: true
      },
      {
        id: '3',
        email: 'bob.johnson@example.com',
        name: 'Bob Johnson',
        avatar_url: null,
        channel: 'Phone',
        team: 'Support Team A',
        department: 'Sales',
        country: 'USA',
        designation: 'Agent',
        quality_mentor: 'qa1@example.com',
        team_supervisor: 'supervisor1@example.com',
        is_active: true
      },
      {
        id: '4',
        email: 'alice.brown@example.com',
        name: 'Alice Brown',
        avatar_url: null,
        channel: 'Email',
        team: 'Support Team C',
        department: 'Customer Service',
        country: 'Canada',
        designation: 'Agent',
        quality_mentor: 'qa3@example.com',
        team_supervisor: 'supervisor3@example.com',
        is_active: true
      },
      {
        id: '5',
        email: 'charlie.wilson@example.com',
        name: 'Charlie Wilson',
        avatar_url: null,
        channel: 'Chat',
        team: 'Support Team B',
        department: 'Customer Service',
        country: 'UK',
        designation: 'Agent',
        quality_mentor: 'qa2@example.com',
        team_supervisor: 'supervisor2@example.com',
        is_active: true
      }
    ];
  }

  /**
   * Generate dummy auditors
   */
  static getDummyAuditors(): Auditor[] {
    return [
      {
        id: 'qa1',
        email: 'qa1@example.com',
        name: 'Quality Analyst One',
        role: 'Quality Analyst',
        is_active: true
      },
      {
        id: 'qa2',
        email: 'qa2@example.com',
        name: 'Quality Analyst Two',
        role: 'Quality Analyst',
        is_active: true
      },
      {
        id: 'qa3',
        email: 'qa3@example.com',
        name: 'Quality Analyst Three',
        role: 'Quality Analyst',
        is_active: true
      },
      {
        id: 'admin1',
        email: 'admin1@example.com',
        name: 'Admin User',
        role: 'Admin',
        is_active: true
      },
      {
        id: 'super1',
        email: 'super1@example.com',
        name: 'Super Admin',
        role: 'Super Admin',
        is_active: true
      }
    ];
  }

  /**
   * Generate dummy scorecards
   */
  static getDummyScorecards(): Scorecard[] {
    return [
      {
        id: 'sc1',
        name: 'Email Support Scorecard',
        table_name: 'email_audits',
        channels: 'Email',
        is_active: true
      },
      {
        id: 'sc2',
        name: 'Chat Support Scorecard',
        table_name: 'chat_audits',
        channels: 'Chat',
        is_active: true
      },
      {
        id: 'sc3',
        name: 'Phone Support Scorecard',
        table_name: 'phone_audits',
        channels: 'Phone',
        is_active: true
      }
    ];
  }

  /**
   * Generate dummy audit assignments
   */
  static getDummyAssignments(): AuditAssignment[] {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return [
      {
        id: 'aa1',
        employee_email: 'john.doe@example.com',
        employee_name: 'John Doe',
        auditor_email: 'qa1@example.com',
        scorecard_id: 'sc1',
        status: 'pending',
        scheduled_date: now.toISOString().split('T')[0],
        week: 1,
        created_at: now.toISOString(),
        assigned_by: 'admin1@example.com'
      },
      {
        id: 'aa2',
        employee_email: 'jane.smith@example.com',
        employee_name: 'Jane Smith',
        auditor_email: 'qa2@example.com',
        scorecard_id: 'sc2',
        status: 'in_progress',
        scheduled_date: yesterday.toISOString().split('T')[0],
        week: 1,
        created_at: yesterday.toISOString(),
        assigned_by: 'admin1@example.com'
      },
      {
        id: 'aa3',
        employee_email: 'bob.johnson@example.com',
        employee_name: 'Bob Johnson',
        auditor_email: 'qa1@example.com',
        scorecard_id: 'sc3',
        status: 'completed',
        scheduled_date: yesterday.toISOString().split('T')[0],
        week: 1,
        created_at: yesterday.toISOString(),
        assigned_by: 'admin1@example.com'
      }
    ];
  }

  /**
   * Generate dummy agent summaries
   */
  static getDummyAgentSummaries(): AgentSummary[] {
    return [
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        channel: 'Email',
        target: 22,
        totalAudits: 5,
        completedAudits: 3,
        auditorBreakdown: new Map([
          ['qa1@example.com', { name: 'Quality Analyst One', count: 3 }],
          ['qa2@example.com', { name: 'Quality Analyst Two', count: 2 }]
        ])
      },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        channel: 'Chat',
        target: 22,
        totalAudits: 4,
        completedAudits: 2,
        auditorBreakdown: new Map([
          ['qa2@example.com', { name: 'Quality Analyst Two', count: 4 }]
        ])
      }
    ];
  }
}

