# Database Reorganization Proposal
## New Schema Structure & Implementation Plan

**Document Version:** 1.0  
**Date:** January 25, 2025  
**Status:** Proposal  
**Prepared For:** Express CQMS Development Team

---

## Executive Summary

This proposal outlines a comprehensive database reorganization strategy to address scalability, maintainability, and performance concerns in the Express CQMS application. The reorganization consolidates fragmented schemas, establishes proper referential integrity, and provides a foundation for future growth.

### Key Objectives
- **Unify fragmented audit data** into a single, scalable model
- **Consolidate user/employee data** into a single source of truth
- **Establish proper relationships** with foreign key constraints
- **Improve query performance** through optimized indexes and materialized views
- **Maintain backward compatibility** during migration

### Expected Benefits
- **50-70% reduction** in query complexity for audit reports
- **Improved data integrity** through proper constraints
- **Better scalability** for handling millions of audit records
- **Easier maintenance** with unified schemas
- **Enhanced analytics** capabilities through normalized data

---

## 1. Proposed New Schema Structure

### 1.1 Core Identity & Authentication Tables

#### **employees** (Unified User/Employee Table)
**Purpose**: Single source of truth for all users and employees in the system

```sql
CREATE TABLE employees (
  -- Primary Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  employee_id TEXT UNIQUE, -- Legacy employee identifier
  
  -- Personal Information
  name TEXT NOT NULL,
  display_name TEXT, -- Optional display name override
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Organizational Structure
  role_id UUID NOT NULL REFERENCES roles(id),
  department_id UUID REFERENCES departments(id),
  designation TEXT, -- Job title/designation
  channel_id UUID REFERENCES channels(id),
  team_id UUID REFERENCES teams(id),
  
  -- Hierarchy & Relationships
  supervisor_id UUID REFERENCES employees(id),
  quality_mentor_id UUID REFERENCES employees(id),
  reporting_manager_id UUID REFERENCES employees(id), -- Alternative to supervisor
  
  -- Location & Geography
  country_code TEXT REFERENCES countries(code),
  region TEXT,
  office_location TEXT,
  
  -- External System Integrations
  intercom_admin_id TEXT,
  intercom_admin_alias TEXT,
  slack_user_id TEXT,
  google_workspace_id TEXT,
  
  -- Status & Access Control
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('standard', 'elevated', 'admin')),
  
  -- Activity Tracking
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMPTZ,
  
  -- Preferences & Settings
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "in_app": true,
    "categories": {
      "system": true,
      "task": true,
      "message": true,
      "reminder": true
    }
  }'::jsonb NOT NULL,
  ui_preferences JSONB DEFAULT '{}'::jsonb,
  device_info JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete
  version INTEGER DEFAULT 1 NOT NULL -- Optimistic locking
  
  -- Constraints
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT no_self_supervisor CHECK (supervisor_id != id),
  CONSTRAINT no_self_mentor CHECK (quality_mentor_id != id OR quality_mentor_id IS NULL)
);

-- Indexes for employees
CREATE INDEX idx_employees_email ON employees(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_auth_user_id ON employees(auth_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_employee_id ON employees(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_role_id ON employees(role_id) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_employees_department_id ON employees(department_id) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_employees_channel_id ON employees(channel_id) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_employees_team_id ON employees(team_id) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_employees_supervisor_id ON employees(supervisor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_is_active ON employees(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_created_at ON employees(created_at DESC) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_employees_name_search ON employees USING GIN(to_tsvector('english', name || ' ' || COALESCE(email, '')));

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### **roles** (Role Reference Table)
**Purpose**: Centralized role definitions with hierarchy

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Short code (e.g., 'ADMIN', 'AUDITOR')
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 10), -- Hierarchy level
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb, -- Role-specific permissions
  is_system_role BOOLEAN DEFAULT false NOT NULL, -- Cannot be deleted
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_roles_level ON roles(level) WHERE is_active = true;
CREATE INDEX idx_roles_code ON roles(code) WHERE is_active = true;

-- Insert default roles
INSERT INTO roles (name, code, level, description, is_system_role) VALUES
  ('General User', 'USER', 0, 'Basic user with minimal access', true),
  ('Employee', 'EMPLOYEE', 1, 'Standard employee access', true),
  ('Quality Analyst', 'QA', 1, 'Quality analyst access', true),
  ('Auditor', 'AUDITOR', 2, 'Auditor access', true),
  ('Quality Supervisor', 'QA_SUPERVISOR', 2, 'Quality supervisor access', true),
  ('Manager', 'MANAGER', 3, 'Manager access', true),
  ('Admin', 'ADMIN', 4, 'Administrator access', true),
  ('Super Admin', 'SUPER_ADMIN', 5, 'Full system access', true)
ON CONFLICT (code) DO NOTHING;
```

#### **departments** (Department Reference Table)
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE, -- Department code
  description TEXT,
  parent_department_id UUID REFERENCES departments(id), -- Hierarchical structure
  manager_id UUID REFERENCES employees(id),
  budget_code TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_departments_code ON departments(code) WHERE is_active = true;
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE is_active = true;
```

#### **teams** (Team Reference Table)
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE, -- Team code
  channel_id UUID REFERENCES channels(id),
  supervisor_id UUID REFERENCES employees(id),
  department_id UUID REFERENCES departments(id),
  description TEXT,
  capacity INTEGER, -- Team capacity
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_team_name_channel UNIQUE (name, channel_id)
);

CREATE INDEX idx_teams_channel_id ON teams(channel_id) WHERE is_active = true;
CREATE INDEX idx_teams_supervisor_id ON teams(supervisor_id) WHERE is_active = true;
CREATE INDEX idx_teams_department_id ON teams(department_id) WHERE is_active = true;
```

#### **channels** (Communication Channel Reference)
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Channel code (e.g., 'EMAIL', 'CHAT')
  description TEXT,
  icon_url TEXT,
  color_hex TEXT, -- UI color
  default_scorecard_id UUID REFERENCES scorecards(id), -- Default scorecard for channel
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_channels_code ON channels(code) WHERE is_active = true;
CREATE INDEX idx_channels_display_order ON channels(display_order) WHERE is_active = true;
```

#### **countries** (Country Reference Table)
```sql
CREATE TABLE countries (
  code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
  name TEXT NOT NULL,
  iso_alpha3 TEXT UNIQUE, -- ISO 3166-1 alpha-3
  numeric_code TEXT,
  region TEXT,
  timezone TEXT,
  currency_code TEXT
);

-- Insert common countries
INSERT INTO countries (code, name, iso_alpha3) VALUES
  ('US', 'United States', 'USA'),
  ('GB', 'United Kingdom', 'GBR'),
  ('IN', 'India', 'IND'),
  ('PH', 'Philippines', 'PHL'),
  ('CA', 'Canada', 'CAN')
ON CONFLICT (code) DO NOTHING;
```

---

### 1.2 Scorecard Management Tables

#### **scorecards** (Enhanced Scorecard Table)
```sql
CREATE TABLE scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  code TEXT UNIQUE, -- Scorecard code/identifier
  description TEXT,
  
  -- Scoring Configuration
  passing_threshold NUMERIC(5,2) DEFAULT 80.00,
  scoring_type TEXT DEFAULT 'percentage' CHECK (scoring_type IN ('percentage', 'points')),
  allow_over_100 BOOLEAN DEFAULT false NOT NULL,
  max_bonus_points NUMERIC(5,2) DEFAULT 0,
  
  -- Channel & Scope
  channel_id UUID REFERENCES channels(id), -- NULL = all channels
  applicable_departments UUID[], -- Array of department IDs
  applicable_teams UUID[], -- Array of team IDs
  
  -- Versioning
  version INTEGER DEFAULT 1 NOT NULL,
  parent_scorecard_id UUID REFERENCES scorecards(id), -- For versioning
  is_current_version BOOLEAN DEFAULT true NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  effective_from TIMESTAMPTZ, -- When this version becomes effective
  effective_until TIMESTAMPTZ, -- When this version expires
  
  -- Constraints
  CONSTRAINT valid_threshold CHECK (passing_threshold >= 0 AND passing_threshold <= 100),
  CONSTRAINT valid_version CHECK (version > 0)
);

CREATE INDEX idx_scorecards_code ON scorecards(code) WHERE is_active = true AND is_archived = false;
CREATE INDEX idx_scorecards_channel_id ON scorecards(channel_id) WHERE is_active = true;
CREATE INDEX idx_scorecards_parent_id ON scorecards(parent_scorecard_id);
CREATE INDEX idx_scorecards_is_current ON scorecards(is_current_version) WHERE is_active = true;
CREATE INDEX idx_scorecards_effective_dates ON scorecards(effective_from, effective_until) WHERE is_active = true;
```

#### **scorecard_parameters** (Fixed Naming - Scorecard Parameters)
```sql
CREATE TABLE scorecard_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  
  -- Parameter Definition
  error_name TEXT NOT NULL, -- Display name
  field_id TEXT NOT NULL, -- Technical identifier (snake_case)
  description TEXT,
  
  -- Scoring Configuration
  penalty_points NUMERIC(5,2) DEFAULT 0 NOT NULL,
  parameter_type TEXT DEFAULT 'error' CHECK (parameter_type IN ('error', 'achievement', 'bonus')),
  points_direction TEXT DEFAULT 'deduct' CHECK (points_direction IN ('deduct', 'add')),
  
  -- Field Configuration
  field_type TEXT DEFAULT 'counter' CHECK (field_type IN ('counter', 'radio', 'checkbox', 'text', 'textarea')),
  error_category TEXT, -- Category grouping
  is_fail_all BOOLEAN DEFAULT false NOT NULL, -- Fails entire audit if triggered
  
  -- AI & Automation
  enable_ai_audit BOOLEAN DEFAULT false NOT NULL,
  ai_prompt TEXT, -- Prompt for AI analysis
  ai_confidence_threshold NUMERIC(3,2) DEFAULT 0.80, -- Minimum confidence for AI
  
  -- Feedback & Comments
  requires_feedback BOOLEAN DEFAULT false NOT NULL,
  feedback_required_for TEXT[], -- When feedback is required (e.g., ['error', 'warning'])
  
  -- Display & Ordering
  display_order INTEGER DEFAULT 0 NOT NULL,
  section TEXT, -- Group parameters into sections
  is_visible BOOLEAN DEFAULT true NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_field_per_scorecard UNIQUE (scorecard_id, field_id),
  CONSTRAINT valid_penalty_points CHECK (penalty_points >= 0),
  CONSTRAINT valid_ai_confidence CHECK (ai_confidence_threshold >= 0 AND ai_confidence_threshold <= 1)
);

CREATE INDEX idx_scorecard_parameters_scorecard_id ON scorecard_parameters(scorecard_id) WHERE is_active = true;
CREATE INDEX idx_scorecard_parameters_display_order ON scorecard_parameters(scorecard_id, display_order) WHERE is_active = true;
CREATE INDEX idx_scorecard_parameters_field_id ON scorecard_parameters(scorecard_id, field_id) WHERE is_active = true;
CREATE INDEX idx_scorecard_parameters_ai_enabled ON scorecard_parameters(scorecard_id) WHERE enable_ai_audit = true AND is_active = true;
```

---

### 1.3 Unified Audit Tables

#### **audits** (Unified Audit Table)
**Purpose**: Single table for all audit data, replacing dynamic scorecard-specific tables

```sql
CREATE TABLE audits (
  -- Primary Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  employee_id UUID NOT NULL REFERENCES employees(id),
  auditor_id UUID NOT NULL REFERENCES employees(id),
  scorecard_id UUID NOT NULL REFERENCES scorecards(id),
  
  -- Assignment Link
  assignment_id UUID REFERENCES audit_assignments(id), -- Optional link to assignment
  
  -- Interaction Data
  interaction_id TEXT, -- External interaction ID
  interaction_date DATE NOT NULL,
  interaction_type TEXT, -- 'email', 'chat', 'call', 'ticket'
  channel_id UUID REFERENCES channels(id),
  
  -- Client Information
  client_email TEXT,
  client_name TEXT,
  client_id TEXT, -- External client identifier
  
  -- Transcript & Content
  transcript TEXT,
  transcript_summary TEXT, -- AI-generated summary
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment metadata
  
  -- Scoring (Normalized)
  total_score NUMERIC(5,2),
  max_possible_score NUMERIC(5,2),
  percentage_score NUMERIC(5,2), -- Calculated: (total_score / max_possible_score) * 100
  passing_status TEXT CHECK (passing_status IN ('pass', 'fail', 'pending', 'needs_review')),
  passing_threshold NUMERIC(5,2), -- Snapshot of threshold at time of audit
  
  -- Error Breakdown
  critical_errors_count INTEGER DEFAULT 0,
  significant_errors_count INTEGER DEFAULT 0,
  minor_errors_count INTEGER DEFAULT 0,
  total_errors_count INTEGER DEFAULT 0,
  
  -- Parameter Scores (JSONB for flexibility)
  parameter_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- {field_id: count/score}
  parameter_feedback JSONB DEFAULT '{}'::jsonb, -- {field_id: [feedback_array]}
  parameter_comments JSONB DEFAULT '{}'::jsonb, -- {field_id: comment_text}
  
  -- Status Workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'validated', 'rejected', 'archived')),
  validation_status TEXT CHECK (validation_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  acknowledgement_status TEXT CHECK (acknowledgement_status IN ('pending', 'acknowledged', 'disputed', 'not_required')),
  
  -- Timing & Duration
  audit_start_time TIMESTAMPTZ,
  audit_end_time TIMESTAMPTZ,
  audit_duration INTEGER, -- Duration in seconds
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  
  -- Reversal Workflow
  reversal_requested_at TIMESTAMPTZ,
  reversal_requested_by UUID REFERENCES employees(id),
  reversal_reason TEXT,
  reversal_responded_at TIMESTAMPTZ,
  reversal_responded_by UUID REFERENCES employees(id),
  reversal_approved BOOLEAN,
  reversal_notes TEXT,
  
  -- Recommendations & Feedback
  recommendations TEXT,
  strengths TEXT[], -- Array of strengths identified
  improvement_areas TEXT[], -- Array of areas for improvement
  coaching_notes TEXT,
  
  -- Agent Status (Pre/Post Audit)
  agent_pre_status TEXT,
  agent_post_status TEXT,
  
  -- Period Tracking
  quarter TEXT, -- Q1, Q2, Q3, Q4
  week INTEGER, -- Week number
  period_start_date DATE,
  period_end_date DATE,
  
  -- AI & Automation
  ai_assisted BOOLEAN DEFAULT false NOT NULL,
  ai_confidence_score NUMERIC(3,2), -- Overall AI confidence
  ai_review_required BOOLEAN DEFAULT false,
  
  -- Metadata & Versioning
  version INTEGER DEFAULT 1 NOT NULL,
  parent_audit_id UUID REFERENCES audits(id), -- For revisions/corrections
  revision_reason TEXT,
  
  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for additional data
  tags TEXT[], -- Array of tags for categorization
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete
  
  -- Constraints
  CONSTRAINT valid_score CHECK (total_score >= 0),
  CONSTRAINT valid_percentage CHECK (percentage_score >= 0 AND percentage_score <= 100),
  CONSTRAINT valid_duration CHECK (audit_duration >= 0),
  CONSTRAINT valid_dates CHECK (audit_end_time IS NULL OR audit_start_time IS NULL OR audit_end_time >= audit_start_time),
  CONSTRAINT no_self_audit CHECK (employee_id != auditor_id)
);

-- Primary Indexes
CREATE INDEX idx_audits_employee_id ON audits(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_auditor_id ON audits(auditor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_scorecard_id ON audits(scorecard_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_assignment_id ON audits(assignment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_channel_id ON audits(channel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_interaction_id ON audits(interaction_id) WHERE deleted_at IS NULL;

-- Status & Workflow Indexes
CREATE INDEX idx_audits_status ON audits(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_passing_status ON audits(passing_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_validation_status ON audits(validation_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_acknowledgement_status ON audits(acknowledgement_status) WHERE deleted_at IS NULL;

-- Time-based Indexes
CREATE INDEX idx_audits_interaction_date ON audits(interaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_submitted_at ON audits(submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_created_at ON audits(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_audit_start_time ON audits(audit_start_time DESC) WHERE deleted_at IS NULL;

-- Composite Indexes for Common Queries
CREATE INDEX idx_audits_auditor_status_date ON audits(auditor_id, status, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_employee_date ON audits(employee_id, interaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_scorecard_date ON audits(scorecard_id, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_channel_date ON audits(channel_id, interaction_date DESC) WHERE deleted_at IS NULL;

-- Period Indexes
CREATE INDEX idx_audits_quarter_week ON audits(quarter, week) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_period_dates ON audits(period_start_date, period_end_date) WHERE deleted_at IS NULL;

-- Reversal Indexes
CREATE INDEX idx_audits_reversal_requested ON audits(reversal_requested_at) WHERE reversal_requested_at IS NOT NULL AND deleted_at IS NULL;

-- JSONB Indexes (GIN for efficient JSONB queries)
CREATE INDEX idx_audits_parameter_scores ON audits USING GIN(parameter_scores) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_parameter_feedback ON audits USING GIN(parameter_feedback) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_metadata ON audits USING GIN(metadata) WHERE deleted_at IS NULL;
CREATE INDEX idx_audits_tags ON audits USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-text search index for transcript
CREATE INDEX idx_audits_transcript_search ON audits USING GIN(to_tsvector('english', COALESCE(transcript, '')));

-- Partial Indexes for Performance
CREATE INDEX idx_audits_active_submitted ON audits(submitted_at DESC) WHERE status = 'submitted' AND deleted_at IS NULL;
CREATE INDEX idx_audits_pending_acknowledgement ON audits(acknowledgement_status, submitted_at DESC) WHERE acknowledgement_status = 'pending' AND deleted_at IS NULL;
CREATE INDEX idx_audits_reversal_pending ON audits(reversal_requested_at) WHERE reversal_approved IS NULL AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to calculate percentage_score
CREATE OR REPLACE FUNCTION calculate_audit_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_score IS NOT NULL AND NEW.max_possible_score IS NOT NULL AND NEW.max_possible_score > 0 THEN
    NEW.percentage_score := (NEW.total_score / NEW.max_possible_score) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_audit_percentage_trigger
  BEFORE INSERT OR UPDATE OF total_score, max_possible_score ON audits
  FOR EACH ROW
  EXECUTE FUNCTION calculate_audit_percentage();
```

#### **audit_errors** (Normalized Error Breakdown)
**Purpose**: Detailed error tracking per parameter

```sql
CREATE TABLE audit_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES scorecard_parameters(id),
  
  -- Error Details
  error_count INTEGER DEFAULT 0 NOT NULL,
  error_severity TEXT CHECK (error_severity IN ('critical', 'significant', 'minor')),
  
  -- Feedback & Comments
  feedback TEXT[], -- Array of feedback messages
  comments TEXT,
  
  -- AI Analysis (if applicable)
  ai_detected BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_error_count CHECK (error_count >= 0),
  CONSTRAINT valid_ai_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  CONSTRAINT unique_audit_parameter UNIQUE (audit_id, parameter_id)
);

CREATE INDEX idx_audit_errors_audit_id ON audit_errors(audit_id);
CREATE INDEX idx_audit_errors_parameter_id ON audit_errors(parameter_id);
CREATE INDEX idx_audit_errors_severity ON audit_errors(error_severity) WHERE error_count > 0;
```

#### **audit_assignments** (Enhanced Assignment Table)
```sql
CREATE TABLE audit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships (Proper Foreign Keys)
  employee_id UUID NOT NULL REFERENCES employees(id),
  auditor_id UUID NOT NULL REFERENCES employees(id),
  assigner_id UUID REFERENCES employees(id), -- Who created the assignment
  scorecard_id UUID REFERENCES scorecards(id),
  
  -- Assignment Details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  due_date DATE,
  week INTEGER,
  quarter TEXT,
  
  -- External References
  interaction_id TEXT,
  conversation_id TEXT, -- Intercom conversation ID
  intercom_alias TEXT,
  source_type TEXT CHECK (source_type IN ('manual', 'automated', 'import', 'api')),
  
  -- Completion Tracking
  completed_at TIMESTAMPTZ,
  audit_id UUID REFERENCES audits(id), -- Link to completed audit
  completion_notes TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES employees(id),
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT no_self_assignment CHECK (employee_id != auditor_id),
  CONSTRAINT valid_due_date CHECK (due_date IS NULL OR due_date >= scheduled_date)
);

CREATE INDEX idx_audit_assignments_employee_id ON audit_assignments(employee_id) WHERE status != 'cancelled';
CREATE INDEX idx_audit_assignments_auditor_id ON audit_assignments(auditor_id) WHERE status != 'cancelled';
CREATE INDEX idx_audit_assignments_assigner_id ON audit_assignments(assigner_id);
CREATE INDEX idx_audit_assignments_scorecard_id ON audit_assignments(scorecard_id) WHERE status != 'cancelled';
CREATE INDEX idx_audit_assignments_status ON audit_assignments(status);
CREATE INDEX idx_audit_assignments_scheduled_date ON audit_assignments(scheduled_date DESC);
CREATE INDEX idx_audit_assignments_due_date ON audit_assignments(due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_audit_assignments_auditor_status_date ON audit_assignments(auditor_id, status, scheduled_date DESC);
CREATE INDEX idx_audit_assignments_week_quarter ON audit_assignments(week, quarter) WHERE status != 'cancelled';
```

---

### 1.4 Event & Calendar Tables

#### **events** (Enhanced Event Management)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('meeting', 'training', 'calibration', 'standup', 'other')),
  
  -- Scheduling
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  is_all_day BOOLEAN DEFAULT false NOT NULL,
  
  -- Recurrence (if applicable)
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  recurrence_rule TEXT, -- RRULE format
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES events(id), -- For recurring series
  
  -- Participants
  organizer_id UUID NOT NULL REFERENCES employees(id),
  participant_ids UUID[] NOT NULL DEFAULT '{}', -- Array of employee IDs
  required_participants UUID[], -- Required vs optional
  external_participants JSONB DEFAULT '[]'::jsonb, -- External email addresses
  
  -- Meeting Details
  meet_link TEXT, -- Google Meet, Zoom, etc.
  location TEXT,
  meeting_notes TEXT,
  agenda JSONB DEFAULT '[]'::jsonb, -- Structured agenda
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  cancellation_reason TEXT,
  
  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  reminder_minutes_before INTEGER[], -- Array of reminder times (e.g., [15, 60])
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time OR is_all_day = true),
  CONSTRAINT valid_participants CHECK (array_length(participant_ids, 1) > 0)
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_date ON events(date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_status ON events(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_type ON events(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_participants ON events USING GIN(participant_ids) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_recurring ON events(parent_event_id) WHERE is_recurring = true;
```

---

### 1.5 Notification Tables

#### **notifications** (Enhanced Notification Table)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  action_url TEXT, -- Deep link to relevant page
  
  -- Classification
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder')),
  category TEXT CHECK (category IN ('system', 'task', 'message', 'reminder', 'audit', 'assignment')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status Tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'dismissed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Delivery Channels
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'], -- ['in_app', 'email', 'push']
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN GENERATED ALWAYS AS (expires_at IS NOT NULL AND expires_at < NOW()) STORED,
  
  -- Related Entities
  related_audit_id UUID REFERENCES audits(id),
  related_assignment_id UUID REFERENCES audit_assignments(id),
  related_event_id UUID REFERENCES events(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id) WHERE status != 'dismissed';
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
```

#### **notification_subscriptions** (Web Push Subscriptions)
```sql
CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(auth_user_id) ON DELETE CASCADE,
  
  -- Web Push Subscription Details
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, -- Public key
  auth TEXT NOT NULL, -- Auth secret
  
  -- Device Metadata
  user_agent TEXT,
  platform TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  screen_resolution TEXT,
  language TEXT,
  timezone TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_subscriptions_user_id ON notification_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX idx_notification_subscriptions_endpoint ON notification_subscriptions(endpoint);
CREATE INDEX idx_notification_subscriptions_active ON notification_subscriptions(is_active) WHERE is_active = true;
```

---

### 1.6 Permission & Access Control Tables

#### **access_control_rules** (Role-Based Permissions)
```sql
CREATE TABLE access_control_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Definition
  rule_type TEXT NOT NULL CHECK (rule_type IN ('page', 'feature', 'api_endpoint', 'action')),
  resource_name TEXT NOT NULL, -- e.g., 'user-management.html', 'create_audit'
  
  -- Access Control
  allowed_roles UUID[], -- Array of role IDs
  min_role_level INTEGER, -- Minimum hierarchy level required
  denied_roles UUID[], -- Roles explicitly denied (takes precedence)
  
  -- Conditions
  conditions JSONB DEFAULT '{}'::jsonb, -- Additional conditions (e.g., department, channel)
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Metadata
  description TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_rule_resource UNIQUE (rule_type, resource_name),
  CONSTRAINT valid_min_level CHECK (min_role_level IS NULL OR min_role_level >= 0)
);

CREATE INDEX idx_access_control_rules_type_name ON access_control_rules(rule_type, resource_name) WHERE is_active = true;
CREATE INDEX idx_access_control_rules_allowed_roles ON access_control_rules USING GIN(allowed_roles) WHERE is_active = true;
```

#### **user_access_rules** (Individual User Permissions)
```sql
CREATE TABLE user_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Rule Definition
  rule_type TEXT NOT NULL CHECK (rule_type IN ('page', 'feature', 'api_endpoint', 'action')),
  resource_name TEXT NOT NULL,
  
  -- Access Type
  access_type TEXT NOT NULL CHECK (access_type IN ('allow', 'deny')), -- Deny takes precedence
  
  -- Conditions
  conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  reason TEXT, -- Why this rule exists
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_user_rule UNIQUE (user_id, rule_type, resource_name)
);

CREATE INDEX idx_user_access_rules_user_id ON user_access_rules(user_id) WHERE is_active = true;
CREATE INDEX idx_user_access_rules_type_name ON user_access_rules(rule_type, resource_name) WHERE is_active = true;
CREATE INDEX idx_user_access_rules_expires_at ON user_access_rules(expires_at) WHERE expires_at IS NOT NULL;
```

---

### 1.7 Audit Logging & History Tables

#### **audit_events** (Audit Event Log)
**Purpose**: Track all changes to audits for compliance and history

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'status_changed', 'score_changed',
    'reversal_requested', 'reversal_approved', 'reversal_rejected',
    'validated', 'rejected', 'acknowledged', 'commented', 'deleted'
  )),
  
  -- Actor
  actor_id UUID REFERENCES employees(id),
  actor_email TEXT, -- Denormalized for historical records
  
  -- Change Tracking
  changes JSONB, -- Before/after state: {"field": {"before": value, "after": value}}
  old_values JSONB, -- Snapshot of old values
  new_values JSONB, -- Snapshot of new values
  
  -- Context
  reason TEXT, -- Why the change was made
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_events_audit_id ON audit_events(audit_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_audit_type_date ON audit_events(audit_id, event_type, created_at DESC);
```

#### **api_access_logs** (Enhanced API Logging)
```sql
CREATE TABLE api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id),
  user_email TEXT, -- Denormalized
  
  -- Request Details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  path_params JSONB,
  query_params JSONB,
  request_body_size INTEGER, -- Size in bytes
  
  -- Response Details
  status_code INTEGER,
  response_time_ms INTEGER,
  response_size INTEGER,
  
  -- Network Details
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  error_code TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_access_logs_user_id ON api_access_logs(user_id);
CREATE INDEX idx_api_access_logs_timestamp ON api_access_logs(timestamp DESC);
CREATE INDEX idx_api_access_logs_endpoint ON api_access_logs(endpoint);
CREATE INDEX idx_api_access_logs_method ON api_access_logs(method);
CREATE INDEX idx_api_access_logs_success ON api_access_logs(success);
CREATE INDEX idx_api_access_logs_status_code ON api_access_logs(status_code);
CREATE INDEX idx_api_access_logs_user_timestamp ON api_access_logs(user_id, timestamp DESC);
```

---

### 1.8 Materialized Views for Performance

#### **audit_statistics** (Pre-computed Audit Statistics)
```sql
CREATE MATERIALIZED VIEW audit_statistics AS
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  e.employee_id AS employee_code,
  s.id AS scorecard_id,
  s.name AS scorecard_name,
  c.id AS channel_id,
  c.name AS channel_name,
  d.id AS department_id,
  d.name AS department_name,
  
  -- Counts
  COUNT(*) AS total_audits,
  COUNT(*) FILTER (WHERE a.passing_status = 'pass') AS passed_audits,
  COUNT(*) FILTER (WHERE a.passing_status = 'fail') AS failed_audits,
  COUNT(*) FILTER (WHERE a.status = 'submitted') AS submitted_audits,
  COUNT(*) FILTER (WHERE a.status = 'validated') AS validated_audits,
  
  -- Scores
  AVG(a.percentage_score) AS average_score,
  MIN(a.percentage_score) AS min_score,
  MAX(a.percentage_score) AS max_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.percentage_score) AS median_score,
  
  -- Duration
  AVG(a.audit_duration) AS average_duration_seconds,
  MIN(a.audit_duration) AS min_duration_seconds,
  MAX(a.audit_duration) AS max_duration_seconds,
  
  -- Errors
  SUM(a.critical_errors_count) AS total_critical_errors,
  SUM(a.significant_errors_count) AS total_significant_errors,
  SUM(a.total_errors_count) AS total_errors,
  AVG(a.total_errors_count) AS average_errors_per_audit,
  
  -- Reversals
  COUNT(*) FILTER (WHERE a.reversal_requested_at IS NOT NULL) AS reversal_requests,
  COUNT(*) FILTER (WHERE a.reversal_approved = true) AS approved_reversals,
  
  -- Dates
  MIN(a.interaction_date) AS first_audit_date,
  MAX(a.interaction_date) AS last_audit_date,
  MAX(a.submitted_at) AS last_submitted_at,
  
  -- Period
  a.quarter,
  a.week
  
FROM audits a
JOIN employees e ON a.employee_id = e.id
JOIN scorecards s ON a.scorecard_id = s.id
LEFT JOIN channels c ON a.channel_id = c.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE a.deleted_at IS NULL
GROUP BY 
  e.id, e.name, e.employee_id,
  s.id, s.name,
  c.id, c.name,
  d.id, d.name,
  a.quarter, a.week;

CREATE UNIQUE INDEX ON audit_statistics(employee_id, scorecard_id, channel_id, department_id, quarter, week);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_audit_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audit_statistics;
END;
$$ LANGUAGE plpgsql;
```

#### **auditor_performance** (Auditor Performance Metrics)
```sql
CREATE MATERIALIZED VIEW auditor_performance AS
SELECT
  a.auditor_id,
  e.name AS auditor_name,
  s.id AS scorecard_id,
  s.name AS scorecard_name,
  c.id AS channel_id,
  c.name AS channel_name,
  
  -- Period
  DATE_TRUNC('month', a.submitted_at) AS month,
  a.quarter,
  a.week,
  
  -- Assignment Metrics
  COUNT(DISTINCT aa.id) AS assignments_received,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'completed') AS assignments_completed,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'in_progress') AS assignments_in_progress,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'pending') AS assignments_pending,
  
  -- Audit Metrics
  COUNT(a.id) AS audits_completed,
  AVG(a.percentage_score) AS average_score_given,
  AVG(a.audit_duration) AS average_duration_seconds,
  
  -- Timeliness
  AVG(EXTRACT(EPOCH FROM (aa.completed_at - aa.scheduled_date))) AS avg_days_to_complete,
  COUNT(*) FILTER (WHERE aa.completed_at <= aa.due_date) AS completed_on_time,
  COUNT(*) FILTER (WHERE aa.completed_at > aa.due_date) AS completed_late,
  
  -- Quality Metrics
  COUNT(*) FILTER (WHERE a.reversal_requested_at IS NOT NULL) AS audits_with_reversals,
  COUNT(*) FILTER (WHERE a.validation_status = 'approved') AS audits_approved,
  COUNT(*) FILTER (WHERE a.validation_status = 'rejected') AS audits_rejected
  
FROM audits a
JOIN employees e ON a.auditor_id = e.id
JOIN scorecards s ON a.scorecard_id = s.id
LEFT JOIN channels c ON a.channel_id = c.id
LEFT JOIN audit_assignments aa ON a.assignment_id = aa.id
WHERE a.deleted_at IS NULL
  AND a.submitted_at IS NOT NULL
GROUP BY 
  a.auditor_id, e.name,
  s.id, s.name,
  c.id, c.name,
  DATE_TRUNC('month', a.submitted_at),
  a.quarter, a.week;

CREATE UNIQUE INDEX ON auditor_performance(auditor_id, scorecard_id, channel_id, month, quarter, week);
```

---

## 2. Database Functions & Triggers

### 2.1 Common Utility Functions

```sql
-- Update updated_at timestamp (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate audit percentage score
CREATE OR REPLACE FUNCTION calculate_audit_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_score IS NOT NULL AND NEW.max_possible_score IS NOT NULL AND NEW.max_possible_score > 0 THEN
    NEW.percentage_score := (NEW.total_score / NEW.max_possible_score) * 100;
    
    -- Update passing status based on threshold
    IF NEW.passing_threshold IS NOT NULL THEN
      IF NEW.percentage_score >= NEW.passing_threshold THEN
        NEW.passing_status := 'pass';
      ELSE
        NEW.passing_status := 'fail';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  changes JSONB := '{}'::jsonb;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type := 'updated';
    -- Build changes object
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      changes := jsonb_set(changes, '{status}', jsonb_build_object('before', OLD.status, 'after', NEW.status));
    END IF;
    IF OLD.total_score IS DISTINCT FROM NEW.total_score THEN
      changes := jsonb_set(changes, '{total_score}', jsonb_build_object('before', OLD.total_score, 'after', NEW.total_score));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    event_type := 'deleted';
  END IF;
  
  -- Insert event log
  INSERT INTO audit_events (audit_id, event_type, actor_id, changes, old_values, new_values)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    event_type,
    COALESCE(NEW.updated_by, OLD.updated_by),
    changes,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit event triggers
CREATE TRIGGER audit_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();
```

---

## 3. Row Level Security (RLS) Policies

### 3.1 Employees Table RLS

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can read own profile"
ON employees FOR SELECT
USING (auth.uid() = auth_user_id);

-- Users can read all active employees (for directory)
CREATE POLICY "Users can read active employees"
ON employees FOR SELECT
USING (is_active = true AND deleted_at IS NULL);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON employees FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth.uid() = auth_user_id AND
  -- Prevent users from changing sensitive fields
  (OLD.role_id = NEW.role_id) AND
  (OLD.department_id = NEW.department_id) AND
  (OLD.is_active = NEW.is_active)
);

-- Admins can manage all employees
CREATE POLICY "Admins can manage employees"
ON employees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN roles r ON e.role_id = r.id
    WHERE e.auth_user_id = auth.uid()
    AND r.level >= 4 -- Admin level
  )
);
```

### 3.2 Audits Table RLS

```sql
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Auditors can read their own audits
CREATE POLICY "Auditors can read own audits"
ON audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = audits.auditor_id
    AND e.auth_user_id = auth.uid()
  )
);

-- Employees can read audits about them
CREATE POLICY "Employees can read own audits"
ON audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = audits.employee_id
    AND e.auth_user_id = auth.uid()
  )
);

-- Auditors can create/update their own audits
CREATE POLICY "Auditors can manage own audits"
ON audits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = audits.auditor_id
    AND e.auth_user_id = auth.uid()
  )
);

-- Admins can read all audits
CREATE POLICY "Admins can read all audits"
ON audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN roles r ON e.role_id = r.id
    WHERE e.auth_user_id = auth.uid()
    AND r.level >= 4
  )
);
```

---

## 4. Migration Strategy

### Phase 1: Foundation Tables (Week 1-2)
1. Create reference tables (`roles`, `departments`, `teams`, `channels`, `countries`)
2. Create `employees` table
3. Migrate data from `users` → `employees`
4. Migrate data from `people` → `employees` (merge by email)
5. Update application code to use `employees`

### Phase 2: Scorecard Enhancement (Week 2-3)
1. Enhance `scorecards` table structure
2. Rename `scorecard_perameters` → `scorecard_parameters`
3. Add missing indexes and constraints
4. Update scorecard management code

### Phase 3: Audit Unification (Week 3-5)
1. Create `audits` table
2. Create `audit_errors` table
3. Create `audit_events` table
4. Migrate data from dynamic audit tables → `audits`
5. Update audit creation/update code
6. Create materialized views

### Phase 4: Relationship Fixes (Week 5-6)
1. Update `audit_assignments` with proper FKs
2. Update `events` table structure
3. Update `notifications` table structure
4. Add missing indexes
5. Update RLS policies

### Phase 5: Optimization & Cleanup (Week 6-7)
1. Create materialized views
2. Add performance indexes
3. Implement audit event logging
4. Performance testing
5. Deprecate old tables
6. Final validation

---

## 5. Benefits Summary

### 5.1 Data Integrity
- ✅ Proper foreign key relationships
- ✅ Check constraints for data validation
- ✅ Unique constraints prevent duplicates
- ✅ Cascade delete/update policies

### 5.2 Performance
- ✅ Optimized indexes for common queries
- ✅ Materialized views for aggregations
- ✅ JSONB indexes for flexible queries
- ✅ Partial indexes for filtered queries

### 5.3 Scalability
- ✅ Unified audit model supports millions of records
- ✅ Partitioning-ready structure
- ✅ Efficient query patterns
- ✅ Archive-friendly with soft deletes

### 5.4 Maintainability
- ✅ Single source of truth for employees
- ✅ Unified audit schema
- ✅ Clear relationships
- ✅ Consistent naming conventions

### 5.5 Flexibility
- ✅ JSONB for scorecard-specific data
- ✅ Normalized for common fields
- ✅ Extensible metadata fields
- ✅ Versioning support

---

## 6. Risk Mitigation

### 6.1 Data Migration Risks
- **Risk**: Data loss or corruption during migration
- **Mitigation**: 
  - Comprehensive backups before migration
  - Validation scripts to verify data integrity
  - Rollback plan with ability to revert
  - Staged migration with validation checkpoints

### 6.2 Performance Risks
- **Risk**: Slower queries during transition
- **Mitigation**:
  - Gradual migration with performance monitoring
  - Load testing before full rollout
  - Query optimization and index tuning
  - Read replicas for reporting

### 6.3 Application Downtime
- **Risk**: Service interruption during migration
- **Mitigation**:
  - Blue-green deployment strategy
  - Feature flags for gradual rollout
  - Database views for backward compatibility
  - Staged rollout with rollback capability

### 6.4 Data Integrity Issues
- **Risk**: Referential integrity violations
- **Mitigation**:
  - Foreign key constraints
  - Data validation scripts
  - Referential integrity checks
  - Data quality monitoring

---

## 7. Success Metrics

### 7.1 Performance Metrics
- **Query Performance**: 50-70% reduction in query time for audit reports
- **Index Efficiency**: 90%+ index usage for common queries
- **Materialized View Refresh**: < 30 seconds for full refresh

### 7.2 Data Quality Metrics
- **Referential Integrity**: 100% foreign key constraint compliance
- **Data Completeness**: 95%+ required fields populated
- **Duplicate Records**: < 0.1% duplicate rate

### 7.3 Operational Metrics
- **Migration Success Rate**: 99%+ successful migrations
- **Rollback Time**: < 15 minutes rollback capability
- **Zero Data Loss**: 100% data preservation during migration

---

## 8. Next Steps

1. **Review & Approval**: Team review of proposal
2. **Proof of Concept**: Create POC with sample data
3. **Migration Scripts**: Develop automated migration scripts
4. **Testing**: Comprehensive testing in staging environment
5. **Documentation**: Update API and database documentation
6. **Training**: Team training on new schema
7. **Rollout**: Phased production rollout

---

*Document Version: 1.0*  
*Last Updated: January 25, 2025*  
*Status: Proposal - Awaiting Review*
