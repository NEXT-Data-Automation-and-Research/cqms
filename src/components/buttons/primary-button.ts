/**
 * Primary Button Component Helper
 * Utility functions for working with primary button components
 */

export interface PrimaryButtonOptions {
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  id?: string;
  className?: string;
}

/**
 * Create a primary button element
 * @param text - Button text
 * @param options - Button options
 * @returns Button element
 */
export function createPrimaryButton(text: string, options: PrimaryButtonOptions = {}): HTMLButtonElement {
  const {
    size = 'md',
    fullWidth = false,
    type = 'button',
    disabled = false,
    loading = false,
    id = undefined,
    className = ''
  } = options;

  const button = document.createElement('button');
  button.type = type;
  button.className = `primary-button primary-button--${size} ${fullWidth ? 'primary-button--full' : ''} ${className}`.trim();
  
  if (id) button.id = id;
  if (disabled) button.disabled = true;
  if (loading) button.setAttribute('data-loading', 'true');

  const textSpan = document.createElement('span');
  textSpan.className = 'primary-button__text';
  textSpan.textContent = text;
  button.appendChild(textSpan);

  if (loading) {
    const loader = document.createElement('span');
    loader.className = 'primary-button__loader';
    loader.setAttribute('aria-hidden', 'true');
    button.appendChild(loader);
  }

  return button;
}

/**
 * Set loading state on a primary button
 * @param button - Button element
 * @param loading - Loading state
 */
export function setButtonLoading(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    button.setAttribute('data-loading', 'true');
    button.disabled = true;
    
    // Add loader if it doesn't exist
    if (!button.querySelector('.primary-button__loader')) {
      const loader = document.createElement('span');
      loader.className = 'primary-button__loader';
      loader.setAttribute('aria-hidden', 'true');
      button.appendChild(loader);
    }
  } else {
    button.removeAttribute('data-loading');
    button.disabled = false;
    const loader = button.querySelector('.primary-button__loader');
    if (loader) loader.remove();
  }
}

/**
 * Update button text
 * @param button - Button element
 * @param text - New button text
 */
export function setButtonText(button: HTMLButtonElement, text: string): void {
  const textSpan = button.querySelector('.primary-button__text');
  if (textSpan) {
    textSpan.textContent = text;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  (window as any).PrimaryButton = {
    create: createPrimaryButton,
    setLoading: setButtonLoading,
    setText: setButtonText
  };
}

