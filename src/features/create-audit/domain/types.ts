/**
 * Create Audit Domain Types
 */

export interface CreateAudit {
  id: string;
  employeeId: string;
  interactionId: string;
  scorecardId: string;
  transcript: string;
  recommendations: string;
  parameters: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

