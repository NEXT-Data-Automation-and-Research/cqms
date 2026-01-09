/**
 * Splitter Template Generator
 * Generates HTML for resizable splitter between columns
 */

/**
 * Generate resizable splitter HTML
 */
export function generateSplitter(): string {
  return `
    <div id="splitter" class="no-print" style="width: 0.2425rem; background: #e5e7eb; cursor: col-resize; position: relative; flex-shrink: 0; transition: background 0.2s; z-index: 1;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.1213rem; height: 1.2128rem; background: #9ca3af; border-radius: 0.0606rem;"></div>
    </div>
  `;
}

