/**
 * Filter Utilities
 * Helper functions for filter management
 */

import type { FilterOptions } from '../domain/types.js';

/**
 * Merge partial filters with existing filters, removing undefined/null/empty values
 */
export function mergeFilters(existing: FilterOptions, partial: Partial<FilterOptions>): FilterOptions {
  const newFilters: FilterOptions = { ...existing };
  
  if (partial.channel !== undefined) {
    if (partial.channel === null || partial.channel === '') {
      delete newFilters.channel;
    } else {
      newFilters.channel = partial.channel;
    }
  }
  if (partial.team !== undefined) {
    if (partial.team === null || partial.team === '') {
      delete newFilters.team;
    } else {
      newFilters.team = partial.team;
    }
  }
  if (partial.department !== undefined) {
    if (partial.department === null || partial.department === '') {
      delete newFilters.department;
    } else {
      newFilters.department = partial.department;
    }
  }
  if (partial.country !== undefined) {
    if (partial.country === null || partial.country === '') {
      delete newFilters.country;
    } else {
      newFilters.country = partial.country;
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
  
  if (filters.channel) cleaned.channel = filters.channel;
  if (filters.team) cleaned.team = filters.team;
  if (filters.department) cleaned.department = filters.department;
  if (filters.country) cleaned.country = filters.country;
  if (filters.qualitySupervisor) cleaned.qualitySupervisor = filters.qualitySupervisor;
  if (filters.teamSupervisor) cleaned.teamSupervisor = filters.teamSupervisor;
  if (filters.search) cleaned.search = filters.search;
  if (filters.groupBy && filters.groupBy !== 'none') cleaned.groupBy = filters.groupBy;
  
  return cleaned;
}

