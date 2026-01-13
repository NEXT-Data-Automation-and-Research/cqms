/**
 * Modal Resizer Utility
 * Handles resizable splitter for audit detail modal
 */

/**
 * Setup resizable splitter for modal
 */
export function setupModalResizer(): void {
  const splitter = document.getElementById('splitter');
  const leftColumn = document.getElementById('leftColumn');
  const rightColumn = document.getElementById('rightColumn');
  const auditContent = document.getElementById('auditContent');
  
  if (!splitter || !leftColumn || !rightColumn || !auditContent) {
    return;
  }
  
  let isResizing = false;
  
  splitter.addEventListener('mousedown', function(e) {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    splitter.style.background = '#9ca3af';
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    const containerRect = auditContent.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // Calculate percentage (with min/max constraints)
    let leftPercentage = (offsetX / containerWidth) * 100;
    leftPercentage = Math.max(25, Math.min(75, leftPercentage));
    
    leftColumn.style.width = leftPercentage + '%';
  });
  
  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      splitter.style.background = '#e5e7eb';
    }
  });
  
  // Hover effect
  splitter.addEventListener('mouseenter', function() {
    if (!isResizing) {
      splitter.style.background = '#d1d5db';
    }
  });
  
  splitter.addEventListener('mouseleave', function() {
    if (!isResizing) {
      splitter.style.background = '#e5e7eb';
    }
  });
}

