/**
 * Audit Form Modular Loader
 * Initializes the modular audit form components
 */

import { AuditFormOrchestrator } from './components/audit-form-orchestrator.js';
import { SplitterComponent } from './components/splitter-component.js';
import { generateSplitter } from './templates/splitter-template.js';

/**
 * Initialize the modular audit form
 */
export async function initializeModularAuditForm(config?: {
  onFormSubmit?: (formData: FormData) => void | Promise<void>;
  onFormCancel?: () => void;
}): Promise<AuditFormOrchestrator | null> {
  const formElement = document.getElementById('auditForm') as HTMLFormElement;
  if (!formElement) {
    console.error('Audit form element not found');
    return null;
  }

  // Create orchestrator
  const orchestrator = new AuditFormOrchestrator({
    onFormSubmit: config?.onFormSubmit,
    onFormCancel: config?.onFormCancel
  });

  // Initialize orchestrator (now async)
  await orchestrator.initialize(formElement);

  // Setup splitter if columns exist
  setupSplitter();

  return orchestrator;
}

/**
 * Setup resizable splitter between columns
 */
function setupSplitter(): void {
  const leftColumn = document.getElementById('leftColumn');
  const rightColumn = document.getElementById('rightColumn');
  const auditContent = document.getElementById('auditContent');
  
  if (!leftColumn || !rightColumn || !auditContent) {
    console.warn('Columns not found for splitter setup');
    return;
  }

  // Check if splitter already exists
  let splitterElement = document.getElementById('splitter');
  if (!splitterElement) {
    // Create splitter element
    splitterElement = document.createElement('div');
    splitterElement.id = 'splitter';
    splitterElement.innerHTML = generateSplitter();
    
    // Insert splitter between columns
    if (rightColumn.parentNode) {
      rightColumn.parentNode.insertBefore(splitterElement, rightColumn);
    }
  }

  // Initialize splitter component
  const splitterComponent = new SplitterComponent();
  splitterComponent.render(splitterElement, leftColumn, rightColumn);
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  (window as any).initializeModularAuditForm = initializeModularAuditForm;
}
