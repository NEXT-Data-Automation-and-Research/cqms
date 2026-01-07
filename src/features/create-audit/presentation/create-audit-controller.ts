/**
 * Create Audit Controller
 * Main controller orchestrating all components and managing state
 */

import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';

// Use runtime import path (will be resolved at runtime in browser)
// TypeScript will compile this but the actual import happens at runtime
async function getLoadComponents() {
  try {
    // @ts-ignore - Runtime import path
    const module = await import('/js/features/home/infrastructure/component-loader.js');
    return module.loadComponents || module.componentLoader?.loadComponents;
  } catch (error) {
    logError('Failed to load component loader:', error);
    return null;
  }
}

// Dummy data for demonstration
const dummyEmployees = [
  { id: '1', name: 'John Doe', email: 'john.doe@example.com', type: 'Agent', department: 'Support' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', type: 'Agent', department: 'Sales' },
  { id: '3', name: 'Bob Johnson', email: 'bob.johnson@example.com', type: 'Supervisor', department: 'Support' }
];

const dummyPendingAudits = [
  {
    id: '1',
    employeeName: 'John Doe',
    employeeEmail: 'john.doe@example.com',
    interactionId: '12345',
    interactionDate: '2024-01-15',
    scorecardName: 'Customer Service Scorecard',
    status: 'pending'
  },
  {
    id: '2',
    employeeName: 'Jane Smith',
    employeeEmail: 'jane.smith@example.com',
    interactionId: '12346',
    interactionDate: '2024-01-16',
    scorecardName: 'Sales Scorecard',
    status: 'in-progress'
  }
];

const dummyStats = {
  auditsConducted: 45,
  avgQualityScore: 87.5,
  remaining: 12,
  passRate: 92,
  reversalTotal: 5,
  reversalActive: 2,
  reversalResolved: 3,
  inProgress: 8,
  daysRemaining: '15 days',
  avgDuration: '25 min'
};

const dummyScorecards = [
  {
    id: '1',
    name: 'Customer Service Scorecard',
    scoringType: 'percentage',
    parameters: [
      { id: 'p1', name: 'Greeting', type: 'radio', options: ['Yes', 'No'] },
      { id: 'p2', name: 'Resolution', type: 'counter' },
      { id: 'p3', name: 'Feedback', type: 'feedback' }
    ]
  },
  {
    id: '2',
    name: 'Sales Scorecard',
    scoringType: 'points',
    parameters: [
      { id: 'p4', name: 'Product Knowledge', type: 'radio', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
      { id: 'p5', name: 'Closing Attempts', type: 'counter' }
    ]
  }
];

export class CreateAuditController {
  private formData: any = {
    employee: null,
    interaction: null,
    scorecard: null,
    parameters: [],
    transcript: '',
    recommendations: ''
  };
  private assignedAuditsSidebar: any = null;
  private conversationsPanel: any = null;

  async init(): Promise<void> {
    try {
      logInfo('Initializing Create Audit Controller...');
      
      // Load HTML components first
      await this.loadHTMLComponents();
      
      // Then initialize JavaScript components
      await this.initializeJSComponents();
      
      logInfo('✓ Create Audit Controller initialized');
    } catch (error) {
      logError('Error initializing Create Audit Controller:', error);
    }
  }

  private async loadHTMLComponents(): Promise<void> {
    try {
      const loadComponentsFn = await getLoadComponents();
      if (!loadComponentsFn) {
        logError('Failed to load component loader');
        return;
      }

      // Load stats section HTML
      const statsContainer = document.querySelector('#stats-section-container');
      if (statsContainer) {
        await loadComponentsFn([
          { path: '/src/features/create-audit/presentation/components/stats-section/stats-section.html', target: '#stats-section-container' }
        ]);
      }

      // Load assigned audits sidebar HTML
      const sidebarContainer = document.querySelector('#assigned-audits-sidebar-container');
      if (sidebarContainer) {
        await loadComponentsFn([
          { path: '/src/features/create-audit/presentation/components/assigned-audits-sidebar/assigned-audits-sidebar.html', target: '#assigned-audits-sidebar-container' }
        ]);
      }

      // Load conversations panel HTML
      const conversationsContainer = document.querySelector('#conversations-panel-container');
      if (conversationsContainer) {
        await loadComponentsFn([
          { path: '/src/features/create-audit/presentation/components/conversations-panel/conversations-panel.html', target: '#conversations-panel-container' }
        ]);
      }
    } catch (error) {
      logError('Error loading HTML components:', error);
    }
  }

  private async initializeJSComponents(): Promise<void> {
    // Initialize components after HTML is loaded
    this.initializeStatsSection();
    
    // Initialize conversations panel first, then sidebar
    // This ensures conversationsPanel is available when sidebar callback is set up
    await this.initializeConversationsPanel();
    await this.initializeAssignedAuditsSidebar();
  }

  private initializeStatsSection(): void {
    const container = document.querySelector('#stats-section-container');
    if (!container) return;

    // Load stats cards component
    getLoadComponents().then((loadComponentsFn: any) => {
      if (loadComponentsFn) {
        return loadComponentsFn([
          { path: '/src/features/home/components/stats-cards/stats-cards.html', target: '#statsCardsContainer' }
        ]);
      }
    }).then(() => {
      // Update stats values
      this.updateStatsValues();
    }).catch((err: any) => {
      logError('Error loading stats cards:', err);
    });

    // Add toggle functionality
    const toggle = container.querySelector('#statsToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const content = container.querySelector('#statsContent');
        const icon = toggle.querySelector('.stats-toggle-icon');
        if (content) {
          content.classList.toggle('expanded');
          if (icon && icon instanceof HTMLElement) {
            icon.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        }
      });
    }
  }

  private updateStatsValues(): void {
    const update = (id: string, value: string | number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };

    update('statsAuditsConductedCount', dummyStats.auditsConducted);
    update('statsAvgQualityScore', dummyStats.avgQualityScore.toFixed(1));
    update('statsRemainingCount', dummyStats.remaining);
    update('statsReversalTotalCount', dummyStats.reversalTotal);
    update('statsReversalActiveCount', dummyStats.reversalActive);
    update('statsReversalResolvedCount', dummyStats.reversalResolved);
    update('statsInProgressCount', dummyStats.inProgress);
    update('statsAvgDuration', dummyStats.avgDuration);
    if (dummyStats.passRate !== undefined) {
      update('statsPassRate', `${dummyStats.passRate}%`);
    }
  }

  private async initializeAssignedAuditsSidebar(): Promise<void> {
    // Dynamic import for the sidebar component
    // @ts-ignore - Runtime import path
    const module = await import('/js/features/create-audit/presentation/components/assigned-audits-sidebar/assigned-audits-sidebar.js');
    const sidebar = new module.AssignedAuditsSidebar('assigned-audits-sidebar-container');
    
    // When an employee is selected, update the conversations panel
    sidebar.onEmployeeSelect((employee: any) => {
      try {
        logInfo('👤 Employee selected callback fired', {
          employeeEmail: employee?.employee_email,
          employeeName: employee?.employee_name,
          conversationsPanelExists: !!this.conversationsPanel,
          hasEmployee: !!employee
        });
        
        if (!employee) {
          logError('Employee callback received null/undefined employee');
          return;
        }
        
        if (!this.conversationsPanel) {
          logError('ConversationsPanel is null, cannot display employee', {
            employeeEmail: employee?.employee_email
          });
          return;
        }
        
        logInfo('📞 Calling displayEmployee', {
          employeeEmail: employee?.employee_email
        });
        
        // Pass the employee summary to the conversations panel
        // The panel will automatically pull yesterday's conversations
        this.conversationsPanel.displayEmployee(employee);
        
        logInfo('✅ displayEmployee call completed');
      } catch (error) {
        logError('Error in employee select callback:', error);
        // Don't re-throw - we've logged it, let the UI continue
      }
    });
    
    this.assignedAuditsSidebar = sidebar;
    logInfo('✓ Assigned Audits Sidebar initialized');
  }

  private async initializeConversationsPanel(): Promise<void> {
    try {
      // Dynamic import for the conversations panel component
      // @ts-ignore - Runtime import path
      const module = await import('/js/features/create-audit/presentation/components/conversations-panel/conversations-panel.js');
      const panel = new module.ConversationsPanel('conversations-panel-container');
      
      // When conversations are selected, handle them
      panel.onConversationsSelected((conversationIds: string[]) => {
        logInfo('Selected conversations:', { count: conversationIds.length });
        // TODO: Update form state with selected conversations
      });

      // When statistics are updated, update the stats section
      panel.onStatisticsUpdated((stats: any) => {
        this.updateConversationStatistics(stats);
      });
      
      this.conversationsPanel = panel;
      logInfo('✓ Conversations Panel initialized');
    } catch (error) {
      logError('Error initializing conversations panel:', error);
      // Don't throw - allow sidebar to initialize even if conversations panel fails
    }
  }

  private updateConversationStatistics(stats: any): void {
    try {
      // @ts-ignore - Runtime import path
      import('/js/features/create-audit/presentation/utils/stats-converter.js').then((converterModule) => {
        const auditStats = converterModule.convertToAuditStats(stats);
        this.updateStatsSection(auditStats);
      }).catch((error) => {
        logError('Error loading stats converter:', error);
      });
    } catch (error) {
      logError('Error updating conversation statistics:', error);
    }
  }

  private updateStatsSection(stats: Partial<any>): void {
    const statsContainer = document.querySelector('#stats-section-container');
    if (!statsContainer) {
      logWarn('Stats container not found, cannot update statistics');
      return;
    }

    // ✅ SECURITY: Safe element updates with proper escaping
    const updateElement = (id: string, value: string | number) => {
      const el = document.getElementById(id);
      if (el) {
        // ✅ SECURITY: Use textContent to prevent XSS
        el.textContent = String(value);
      }
    };

    // Update all available statistics
    if (stats.auditsConducted !== undefined) {
      updateElement('statsAuditsConductedCount', stats.auditsConducted);
    }
    if (stats.avgQualityScore !== undefined) {
      updateElement('statsAvgQualityScore', Number(stats.avgQualityScore).toFixed(1));
    }
    if (stats.remaining !== undefined) {
      updateElement('statsRemainingCount', stats.remaining);
    }
    if (stats.reversalTotal !== undefined) {
      updateElement('statsReversalTotalCount', stats.reversalTotal);
    }
    if (stats.reversalActive !== undefined) {
      updateElement('statsReversalActiveCount', stats.reversalActive);
    }
    if (stats.reversalResolved !== undefined) {
      updateElement('statsReversalResolvedCount', stats.reversalResolved);
    }
    if (stats.inProgress !== undefined) {
      updateElement('statsInProgressCount', stats.inProgress);
    }
    if (stats.avgDuration !== undefined) {
      updateElement('statsAvgDuration', stats.avgDuration);
    }
    if (stats.passRate !== undefined) {
      updateElement('statsPassRate', `${stats.passRate}%`);
    }
    if (stats.daysRemaining !== undefined && stats.daysRemaining) {
      updateElement('statsDaysRemaining', stats.daysRemaining);
    }

    logInfo('✅ Statistics updated', {
      auditsConducted: stats.auditsConducted,
      avgQualityScore: stats.avgQualityScore,
      inProgress: stats.inProgress
    });
  }


  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize controller when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const controller = new CreateAuditController();
    controller.init();
  });
} else {
  const controller = new CreateAuditController();
  controller.init();
}

