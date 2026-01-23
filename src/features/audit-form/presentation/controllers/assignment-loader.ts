/**
 * Assignment Loader
 * Loads assignment data from URL and pre-fills form
 * Migrated from audit-form.html loadAssignmentFromURL()
 */

import { AuditFormService } from '../../application/audit-form-service.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import { AUDIT_ASSIGNMENT_FIELDS } from '../../../../core/constants/field-whitelists.js';
import { getSupabaseClient } from '../utils/supabase-client-helper.js';

interface Assignment {
  id: string;
  employee_email: string;
  employee_name?: string;
  auditor_email: string;
  scorecard_id: string;
  status: string;
  conversation_id?: string;
  scorecards?: {
    id: string;
    name: string;
    table_name: string;
  };
}

export class AssignmentLoader {
  constructor(private service: AuditFormService) {}

  /**
   * Load assignment from URL parameter
   */
  async loadAssignmentFromURL(assignmentId: string): Promise<void> {
    try {
      logInfo(`Loading assignment from URL: ${assignmentId}`);
      
      // Wait for Supabase to be ready
      const supabase = await getSupabaseClient();
      if (!supabase) {
        logError('Supabase client not initialized');
        alert('Error: Database connection not ready. Please refresh the page.');
        return;
      }
      
      // Load the assignment from database with scorecard info
      const { data: assignmentData, error } = await supabase
        .from('audit_assignments')
        .select(`${AUDIT_ASSIGNMENT_FIELDS}, scorecards:scorecard_id (id, name, table_name)`)
        .eq('id', assignmentId)
        .single();
      
      const assignment = assignmentData as Assignment | null;
      
      if (error) {
        logError('Error loading assignment:', error);
        alert('Error: Assignment not found. It may have been deleted or you may not have access.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (!assignment) {
        alert('Assignment not found');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // Check resource access (optional - RLS already enforces at DB level)
      // If accessControl is not available, allow access (RLS policies already verified access when fetching assignment)
      if ((window as any).accessControl && typeof (window as any).accessControl.canAccessResource === 'function') {
        const resourceAccess = (window as any).accessControl.canAccessResource('audit_assignment', assignment);
        if (resourceAccess && !resourceAccess.allowed) {
          alert(resourceAccess.reason || 'You do not have permission to access this assignment.');
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }
      // If accessControl not available, proceed (RLS already verified access at database level)
      
      // Get table name from scorecard
      const assignmentTable = assignment.scorecards?.table_name;
      const scorecardId = assignment.scorecard_id;
      
      // Check if assignment is already completed
      if (assignment.status === 'completed') {
        if (scorecardId && assignmentTable) {
          window.location.href = `audit-view.html?id=${assignment.id}&scorecard=${scorecardId}&table=${assignmentTable}`;
          return;
        }
        alert('This assignment has already been completed.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // Map assignment to expected format
      const mappedAssignment: Assignment = {
        id: assignment.id,
        employee_email: assignment.employee_email,
        employee_name: assignment.employee_name,
        auditor_email: assignment.auditor_email,
        scorecard_id: scorecardId,
        status: assignment.status,
        conversation_id: assignment.conversation_id || undefined,
        scorecards: assignment.scorecards
      };
      
      // Update assignment status to 'in_progress' if pending
      if (mappedAssignment.status === 'pending') {
        const { error: updateError } = await supabase
          .from('audit_assignments')
          .update({ status: 'in_progress' })
          .eq('id', mappedAssignment.id);
        
        if (updateError) {
          logError('Error updating assignment status:', updateError);
        }
      }
      
      // Set assignment tracking
      (window as any).currentAssignmentId = mappedAssignment.id;
      (window as any).isEditingPendingAudit = false;
      (window as any).currentEditingAuditId = null;
      (window as any).isEditingExistingAudit = false;
      (window as any).currentEditingTableName = null;
      
      // Store conversation ID
      if (mappedAssignment.conversation_id) {
        (window as any).pendingConversationId = mappedAssignment.conversation_id;
      }
      
      // Check for AI audit data
      let aiAuditData = null;
      if (mappedAssignment.conversation_id) {
        try {
          logInfo(`Checking for AI audit data for conversation: ${mappedAssignment.conversation_id}`);
          const { data: aiResult, error: aiError } = await supabase
            .from('ai_audit_results')
            .select('*')
            .eq('conversation_id', String(mappedAssignment.conversation_id))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!aiError && aiResult && aiResult.ai_scorecard_data) {
            aiAuditData = {
              scorecard_id: aiResult.scorecard_id,
              ai_scorecard_data: aiResult.ai_scorecard_data,
              ai_confidence_score: aiResult.ai_confidence_score,
              ai_notes: aiResult.ai_notes,
              batch_id: aiResult.batch_id
            };
            logInfo('Found AI audit data for conversation');
          }
        } catch (aiError) {
          logError('Error checking for AI audit data:', aiError);
        }
      }
      
      // Pre-fill form with assignment data
      await this.prefillFormFromAssignment(mappedAssignment, aiAuditData);
      
      logInfo('Assignment loaded successfully');
    } catch (error) {
      logError('Error loading assignment:', error);
      alert('Error loading assignment. Please try again.');
    }
  }

  /**
   * Pre-fill form from assignment data
   */
  private async prefillFormFromAssignment(assignment: Assignment, aiAuditData: any): Promise<void> {
    // Load employees first
    if (typeof (window as any).loadEmployees === 'function') {
      await (window as any).loadEmployees();
    }
    
    // Pre-fill employee
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    if (employeeSelect && assignment.employee_email) {
      const normalizedEmail = assignment.employee_email.toLowerCase().trim();
      for (let i = 0; i < employeeSelect.options.length; i++) {
        const optionEmail = (employeeSelect.options[i].value || '').toLowerCase().trim();
        if (optionEmail === normalizedEmail) {
          employeeSelect.selectedIndex = i;
          employeeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }
    
    // Load scorecards
    if (typeof (window as any).loadScorecards === 'function') {
      await (window as any).loadScorecards();
    }
    
    // Select scorecard
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
    if (scorecardSelect && assignment.scorecard_id) {
      scorecardSelect.value = assignment.scorecard_id;
      scorecardSelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Load scorecard parameters
      if (typeof (window as any).loadScorecardParameters === 'function') {
        await (window as any).loadScorecardParameters(assignment.scorecard_id);
      }
    }
    
    // Load conversation data if available
    if (assignment.conversation_id && typeof (window as any).loadConversationDataIntoForm === 'function') {
      const conversationData = {
        conversation_id: assignment.conversation_id,
        adminEmail: assignment.employee_email,
        aiAuditData: aiAuditData
      };
      await (window as any).loadConversationDataIntoForm(conversationData);
    }
    
    // Show form modal
    const auditFormModal = document.getElementById('auditFormModal');
    if (auditFormModal) {
      auditFormModal.style.display = 'block';
    }
  }
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadAssignmentFromURL = async (assignmentId: string) => {
    const db = DatabaseFactory.createClient();
    const repository = new (await import('../../infrastructure/audit-form-repository.js')).AuditFormRepository(db);
    const service = new AuditFormService(repository);
    const loader = new AssignmentLoader(service);
    await loader.loadAssignmentFromURL(assignmentId);
  };
}

