/**
 * UI Visibility Manager
 * Handles UI element visibility and text updates based on user role
 */

import { homeState } from '../state.js';

export class UIVisibilityManager {
  setup(isAgent: boolean): void {
    if (isAgent) {
      this.setupAgentView();
    } else {
      this.setupManagerView();
    }
  }

  private setupAgentView(): void {
    this.setElement('auditsSectionTitle', { text: 'My Audits' });
    this.setElement('updatesSectionTitle', { text: 'Updates to my audits' });
    
    const hiddenElements = [
      'createAuditBtn',
      'quickActionCreateAudit',
      'quickActionSettings',
      'inProgressCard',
      'avgDurationCard',
      'auditsConductedCard',
      'remainingCard',
      'avgQualityScoreCard'
    ];
    
    hiddenElements.forEach(id => this.setElement(id, { display: 'none' }));
    
    this.setElement('passRateCard', { display: 'block' });
    this.setElement('requiresAcknowledgmentCard', { display: 'block' });
  }

  private setupManagerView(): void {
    this.setElement('passRateCard', { display: 'none' });
    this.setElement('requiresAcknowledgmentCard', { display: 'none' });
    
    const visibleElements = [
      'avgDurationCard',
      'avgQualityScoreCard',
      'auditsConductedCard',
      'remainingCard'
    ];
    
    visibleElements.forEach(id => this.setElement(id, { display: 'block' }));
    
    this.setElement('auditsSectionTitle', { text: 'My Assigned Audits' });
    this.setElement('viewAllBtn', { display: 'block' });
    this.setElement('statusAscOption', { text: 'Status (Pending → In Progress)' });
    this.setElement('statusDescOption', { text: 'Status (In Progress → Pending)' });
    
    homeState.sortBy = 'status_desc';
    const auditSortBy = document.getElementById('auditSortBy') as HTMLSelectElement | null;
    if (auditSortBy) auditSortBy.value = 'status_desc';
  }

  private setElement(id: string, props: { text?: string; display?: string }): void {
    const el = document.getElementById(id);
    if (!el) return;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.display !== undefined) el.style.display = props.display;
  }
}

