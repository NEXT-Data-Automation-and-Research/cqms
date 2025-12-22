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
    this.state.filters = { ...this.state.filters, ...filters };
    this.applyFilters();
  }

  applyFilters(): void {
    const { employees, filters } = this.state;
    let filtered = [...employees];

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
    if (filters.qualitySupervisor) {
      filtered = filtered.filter(e => e.quality_mentor === filters.qualitySupervisor);
    }
    if (filters.teamSupervisor) {
      filtered = filtered.filter(e => e.team_supervisor === filters.teamSupervisor);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(searchLower) ||
        e.email?.toLowerCase().includes(searchLower)
      );
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
      const employee = this.state.employees.find(e => e.email === email);
      if (employee) {
        this.state.selectedEmployees.set(email, { employee, auditCount });
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
