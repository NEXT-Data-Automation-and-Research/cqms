/**
 * Filter Utilities
 * Helper functions for filter management
 */

import type { FilterOptions } from '../domain/types.js';

function isEmptyFilterValue(v: string | string[] | null | undefined): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === '';
}

/**
 * Merge partial filters with existing filters, removing undefined/null/empty values
 */
export function mergeFilters(existing: FilterOptions, partial: Partial<FilterOptions>): FilterOptions {
  const newFilters: FilterOptions = { ...existing };
  
  if (partial.channel !== undefined) {
    if (isEmptyFilterValue(partial.channel)) {
      delete newFilters.channel;
    } else {
      newFilters.channel = partial.channel;
    }
  }
  if (partial.team !== undefined) {
    if (isEmptyFilterValue(partial.team)) {
      delete newFilters.team;
    } else {
      newFilters.team = partial.team;
    }
  }
  if (partial.department !== undefined) {
    if (isEmptyFilterValue(partial.department)) {
      delete newFilters.department;
    } else {
      newFilters.department = partial.department;
    }
  }
  if (partial.country !== undefined) {
    if (isEmptyFilterValue(partial.country)) {
      delete newFilters.country;
    } else {
      newFilters.country = partial.country;
    }
  }
  if (partial.role !== undefined) {
    if (isEmptyFilterValue(partial.role)) {
      delete newFilters.role;
    } else {
      newFilters.role = partial.role;
    }
  }
  if (partial.qualitySupervisor !== undefined) {
    if (partial.qualitySupervisor === null || partial.qualitySupervisor === '') {
      delete newFilters.qualitySupervisor;
    } else {
      newFilters.qualitySupervisor = partial.qualitySupervisor;
    }
  }
  if (partial.teamSupervisor !== undefined) {
    if (partial.teamSupervisor === null || partial.teamSupervisor === '') {
      delete newFilters.teamSupervisor;
    } else {
      newFilters.teamSupervisor = partial.teamSupervisor;
    }
  }
  if (partial.search !== undefined) {
    if (partial.search === null || partial.search === '') {
      delete newFilters.search;
    } else {
      newFilters.search = partial.search;
    }
  }
  if (partial.groupBy !== undefined) {
    if (partial.groupBy === null || partial.groupBy === 'none') {
      delete newFilters.groupBy;
    } else {
      newFilters.groupBy = partial.groupBy;
    }
  }
  
  return newFilters;
}

/**
 * Clean and validate filter options, removing empty/null/undefined values
 */
export function cleanFilters(filters: FilterOptions): FilterOptions {
  const cleaned: FilterOptions = {};
  
  if (!isEmptyFilterValue(filters.channel)) cleaned.channel = filters.channel!;
  if (!isEmptyFilterValue(filters.team)) cleaned.team = filters.team!;
  if (!isEmptyFilterValue(filters.department)) cleaned.department = filters.department!;
  if (!isEmptyFilterValue(filters.country)) cleaned.country = filters.country!;
  if (!isEmptyFilterValue(filters.role)) cleaned.role = filters.role!;
  if (filters.qualitySupervisor) cleaned.qualitySupervisor = filters.qualitySupervisor;
  if (filters.teamSupervisor) cleaned.teamSupervisor = filters.teamSupervisor;
  if (filters.search) cleaned.search = filters.search;
  if (filters.groupBy && filters.groupBy !== 'none') cleaned.groupBy = filters.groupBy;
  if (filters.is_active) cleaned.is_active = filters.is_active;
  
  return cleaned;
}

