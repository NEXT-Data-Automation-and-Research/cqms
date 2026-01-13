/**
 * Audit Form Domain Entities
 * Core domain entities for audit form feature
 */

export interface AuditFormData {
  id?: string;
  employeeEmail: string;
  employeeName: string;
  employeeType?: string;
  employeeDepartment?: string;
  countryOfEmployee: string;
  auditorEmail?: string;
  auditorName?: string;
  interactionId: string;
  interactionDate: string;
  channel: string;
  clientEmail?: string;
  clientName?: string;
  transcript: string;
  scorecardId: string;
  scorecardTableName?: string;
  quarter?: string;
  week?: number;
  auditTimestamp?: string;
  auditType?: string;
  passingStatus?: string;
  averageScore?: number;
  totalErrorsCount?: number;
  recommendations?: string;
  validationStatus?: string;
  parameterValues?: Record<string, number>;
  parameterComments?: Record<string, string>;
  parameterFeedback?: Record<string, string[]>;
  auditDuration?: number;
  auditStartTime?: string;
  auditEndTime?: string;
  intercomAlias?: string;
  conversationId?: string;
}

export interface ScorecardParameter {
  id: string;
  scorecardId: string;
  errorName: string;
  penaltyPoints: number;
  errorCategory: string;
  fieldId: string;
  fieldType: string;
  requiresFeedback: boolean;
  displayOrder: number;
  isActive: boolean;
  parameterType?: string;
  pointsDirection?: string;
  isFailAll?: boolean;
  description?: string;
}

export interface Scorecard {
  id: string;
  name: string;
  description?: string;
  passingThreshold?: number;
  tableName: string;
  scoringType?: string;
  channels?: string;
  isActive: boolean;
  defaultForChannels?: string;
  allowOver100?: boolean;
  maxBonusPoints?: string;
  createdAt?: string;
}

export interface Employee {
  email: string;
  name: string;
  type?: string;
  department?: string;
  country?: string;
  intercomAdminId?: string;
  intercomAdminAlias?: string;
}

export interface Interaction {
  id: string;
  date: string;
  channel?: string;
  clientEmail?: string;
  clientName?: string;
  conversationId?: string;
}

