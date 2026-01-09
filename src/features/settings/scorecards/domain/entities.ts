/**
 * Scorecard Domain Entities
 * Core domain models for scorecard management
 */

export interface Scorecard {
  id: string;
  name: string;
  description?: string | null;
  passing_threshold?: number | null;
  table_name: string;
  scoring_type?: string | null;
  channels?: string | null;
  is_active?: boolean | null;
  default_for_channels?: string | null;
  allow_over_100?: boolean | null;
  max_bonus_points?: string | number | null;
  version?: number | null;
  parent_scorecard_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  audit_count?: number;
}

export interface ScorecardParameter {
  id?: string;
  scorecard_id: string;
  error_name: string;
  penalty_points: number;
  parameter_type: 'error' | 'achievement' | 'bonus';
  error_category: string;
  field_type: 'counter' | 'radio';
  field_id: string;
  description?: string | null;
  enable_ai_audit?: boolean;
  prompt?: string | null;
  is_fail_all?: boolean;
  points_direction?: string;
  requires_feedback?: boolean;
  display_order?: number;
  is_active?: boolean;
  created_at?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export type ScoringType = 'deductive' | 'additive' | 'hybrid';
export type ParameterType = 'error' | 'achievement' | 'bonus';
export type FieldType = 'counter' | 'radio';
export type ErrorCategory = 'Critical Fail Error' | 'Critical Error' | 'Significant Error' | 'Major Error' | 'Minor Error' | 'Critical' | 'Significant' | 'Major' | 'Minor';

