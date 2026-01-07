/**
 * User Profile Utilities
 * Utility functions for user profile rendering
 */

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
}

export function escapeHtml(text: string | null): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function attachImageErrorHandlers(container: HTMLElement): void {
  container.querySelectorAll('img').forEach(img => {
    if (img.hasAttribute('data-error-handler-attached')) return;
    img.setAttribute('data-error-handler-attached', 'true');
    
    img.addEventListener('error', function() {
      this.style.display = 'none';
      const fallback = this.nextElementSibling as HTMLElement;
      if (fallback) {
        fallback.style.display = 'flex';
      }
    });
  });
}

