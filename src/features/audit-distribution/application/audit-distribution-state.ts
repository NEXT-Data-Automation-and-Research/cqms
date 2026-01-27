/**
 * Audit Distribution State
 * Manages application state for audit distribution feature
 */

import type {
  Employee,
  Auditor,
  Scorecard,
  AuditAssignment,
  FilterOptions,
  PaginationState,
  AgentSummary
} from '../domain/types.js';
import { mergeFilters, cleanFilters } from './filter-utils.js';

export interface AuditDistributionState {
  employees: Employee[];
  filteredEmployees: Employee[];
  auditors: Auditor[];
  otherAuditors: Auditor[];
  scorecards: Scorecard[];
  assignments: AuditAssignment[];
  agentSummaries: AgentSummary[];
  selectedEmployees: Map<string, { employee: Employee; auditCount: number }>;
  selectedAuditors: Set<string>;
  includeOtherAuditors: boolean;
  filters: FilterOptions;
  pagination: PaginationState;
  bulkAuditCount: number;
  scheduledDate: Date | null;
  dateFilter: { start: string | null; end: string | null };
  columnFilters: {
    week: string[];
    employee: string[];
    channel: string[];
    auditor: string[];
    scheduled_date: string[];
    scorecard: string[];
    status: string[];
  };
}

export class AuditDistributionStateManager {
  private state: AuditDistributionState;

  constructor() {
    this.state = {
      employees: [],
      filteredEmployees: [],
      auditors: [],
      otherAuditors: [],
      scorecards: [],
      assignments: [],
      agentSummaries: [],
      selectedEmployees: new Map(),
      selectedAuditors: new Set(),
      includeOtherAuditors: false,
      filters: {},
      pagination: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0
      },
      bulkAuditCount: 0,
      scheduledDate: null,
      dateFilter: { start: null, end: null },
      columnFilters: {
        week: [],
        employee: [],
        channel: [],
        auditor: [],
        scheduled_date: [],
        scorecard: [],
        status: []
      }
    };
  }

  getState(): AuditDistributionState {
    return this.state;
  }

  setEmployees(employees: Employee[]): void {
    this.state.employees = employees;
    this.applyFilters();
  }

  setAuditors(auditors: Auditor[]): void {
    this.state.auditors = auditors;
  }

  setOtherAuditors(auditors: Auditor[]): void {
    this.state.otherAuditors = auditors;
  }

  setScorecards(scorecards: Scorecard[]): void {
    this.state.scorecards = scorecards;
  }

  setAssignments(assignments: AuditAssignment[]): void {
    this.state.assignments = assignments;
  }

  setAgentSummaries(summaries: AgentSummary[]): void {
    this.state.agentSummaries = summaries;
  }

  setFilters(filters: Partial<FilterOptions>): void {
    this.state.filters = mergeFilters(this.state.filters, filters);
    this.applyFilters();
  }

  replaceFilters(filters: FilterOptions): void {
    this.state.filters = cleanFilters(filters);
    this.applyFilters();
  }

  applyFilters(): void {
    const { employees, filters } = this.state;
    let filtered = [...employees];

    if (filters.role) {
      filtered = filtered.filter(e => e.designation === filters.role);
    }
    if (filters.channel) {
      filtered = filtered.filter(e => e.channel === filters.channel);
    }
    if (filters.team) {
      filtered = filtered.filter(e => e.team === filters.team);
    }
    if (filters.department) {
      filtered = filtered.filter(e => e.department === filters.department);
    }
    if (filters.country) {
      filtered = filtered.filter(e => e.country === filters.country);
    }
    if (filters.is_active) {
      if (filters.is_active === 'active') {
        filtered = filtered.filter(e => e.is_active === true);
      } else if (filters.is_active === 'inactive') {
        filtered = filtered.filter(e => e.is_active === false);
      }
      // 'all' means no filter
    }
    if (filters.qualitySupervisor) {
      filtered = filtered.filter(e => e.quality_mentor === filters.qualitySupervisor);
    }
    if (filters.teamSupervisor) {
      filtered = filtered.filter(e => e.team_supervisor === filters.teamSupervisor);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      
      // Create a lookup map for employee names by email for efficient searching
      const employeeNameMap = new Map<string, string>();
      this.state.employees.forEach(emp => {
        if (emp.email && emp.name) {
          employeeNameMap.set(emp.email.toLowerCase(), emp.name);
        }
      });
      
      filtered = filtered.filter(e => {
        // Search across all relevant fields - case-insensitive partial match
        const nameMatch = e.name?.toLowerCase().includes(searchLower) || false;
        const emailMatch = e.email?.toLowerCase().includes(searchLower) || false;
        const departmentMatch = e.department?.toLowerCase().includes(searchLower) || false;
        const teamMatch = e.team?.toLowerCase().includes(searchLower) || false;
        const channelMatch = e.channel?.toLowerCase().includes(searchLower) || false;
        const countryMatch = e.country?.toLowerCase().includes(searchLower) || false;
        const designationMatch = e.designation?.toLowerCase().includes(searchLower) || false;
        
        // Search quality mentor email and name
        let qualityMentorMatch = false;
        let qualityMentorNameMatch = false;
        if (e.quality_mentor) {
          qualityMentorMatch = e.quality_mentor.toLowerCase().includes(searchLower);
          const mentorName = employeeNameMap.get(e.quality_mentor.toLowerCase());
          if (mentorName) {
            qualityMentorNameMatch = mentorName.toLowerCase().includes(searchLower);
          }
        }
        
        // Search team supervisor email and name
        let teamSupervisorMatch = false;
        let teamSupervisorNameMatch = false;
        if (e.team_supervisor) {
          teamSupervisorMatch = e.team_supervisor.toLowerCase().includes(searchLower);
          const supervisorName = employeeNameMap.get(e.team_supervisor.toLowerCase());
          if (supervisorName) {
            teamSupervisorNameMatch = supervisorName.toLowerCase().includes(searchLower);
          }
        }
        
        // Return true if any field matches
        return nameMatch || emailMatch || departmentMatch || teamMatch || 
               channelMatch || countryMatch || designationMatch ||
               qualityMentorMatch || qualityMentorNameMatch || 
               teamSupervisorMatch || teamSupervisorNameMatch;
      });
    }

    this.state.filteredEmployees = filtered;
    this.state.pagination.totalItems = filtered.length;
    this.state.pagination.currentPage = 1;
  }

  setPagination(page: number, itemsPerPage?: number): void {
    this.state.pagination.currentPage = page;
    if (itemsPerPage !== undefined) {
      this.state.pagination.itemsPerPage = itemsPerPage;
    }
  }

  toggleEmployeeSelection(email: string, selected: boolean, auditCount: number = 1): void {
    if (selected) {
      // Try to find employee in employees first, then in filteredEmployees as fallback
      let employee = this.state.employees.find(e => e.email === email);
      if (!employee) {
        employee = this.state.filteredEmployees.find(e => e.email === email);
      }
      
      if (employee) {
        this.state.selectedEmployees.set(email, { employee, auditCount });
      } else {
        console.warn(`[AuditDistributionState] Employee not found: ${email}`);
      }
    } else {
      this.state.selectedEmployees.delete(email);
    }
  }

  toggleAuditorSelection(email: string, selected: boolean): void {
    if (selected) {
      this.state.selectedAuditors.add(email);
    } else {
      this.state.selectedAuditors.delete(email);
    }
  }

  setBulkAuditCount(count: number): void {
    this.state.bulkAuditCount = Math.max(0, Math.min(10, count));
    this.state.selectedEmployees.forEach((data) => {
      data.auditCount = this.state.bulkAuditCount;
    });
  }

  setScheduledDate(date: Date | null): void {
    this.state.scheduledDate = date;
  }

  setDateFilter(start: string | null, end: string | null): void {
    this.state.dateFilter = { start, end };
  }

  setColumnFilters(column: string, values: string[]): void {
    if (column in this.state.columnFilters) {
      (this.state.columnFilters as any)[column] = values;
    }
  }

  clearColumnFilters(): void {
    this.state.columnFilters = {
      week: [],
      employee: [],
      channel: [],
      auditor: [],
      scheduled_date: [],
      scorecard: [],
      status: []
    };
  }

  toggleIncludeOtherAuditors(): void {
    this.state.includeOtherAuditors = !this.state.includeOtherAuditors;
    if (!this.state.includeOtherAuditors) {
      this.state.otherAuditors.forEach(auditor => {
        this.state.selectedAuditors.delete(auditor.email);
      });
    }
  }
}
