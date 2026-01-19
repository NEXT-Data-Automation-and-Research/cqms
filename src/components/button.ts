/**
 * Button Component Library
 * L1 FIX: Consistent button styles across the application
 */

import { escapeHtml } from '../utils/html-sanitizer.js';

export type ButtonVariant = 'primary' | 'secondary' | 'create' | 'edit' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOptions {
  text: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  icon?: string; // SVG path
}

/**
 * Render a standardized button
 */
export function renderButton(options: ButtonOptions): string {
  const {
    text,
    variant = 'primary',
    size = 'md',
    onClick,
    disabled = false,
    type = 'button',
    ariaLabel,
    icon
  } = options;

  const baseClasses = 'btn-standard';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const disabledClass = disabled ? 'btn-disabled' : '';
  
  const classes = [baseClasses, variantClass, sizeClass, disabledClass].filter(Boolean).join(' ');
  
  const onClickAttr = onClick && !disabled 
    ? `onclick="(${onClick.toString()})()"` 
    : '';
  
  const ariaLabelAttr = ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : '';
  
  const iconHTML = icon 
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${icon}</svg>`
    : '';

  return `
    <button 
      type="${type}"
      class="${classes}"
      ${disabled ? 'disabled' : ''}
      ${onClickAttr}
      ${ariaLabelAttr}
      style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        border: none;
        border-radius: 0.375rem;
        cursor: ${disabled ? 'not-allowed' : 'pointer'};
        transition: all 0.2s;
        ${getButtonStyles(variant, size, disabled)}
      ">
      ${iconHTML}
      <span>${escapeHtml(text)}</span>
    </button>
  `;
}

function getButtonStyles(variant: ButtonVariant, size: ButtonSize, disabled: boolean): string {
  const sizeStyles = {
    sm: 'padding: 0.5rem 1rem; font-size: 0.875rem;',
    md: 'padding: 0.75rem 1.5rem; font-size: 1rem;',
    lg: 'padding: 1rem 2rem; font-size: 1.125rem;'
  };

  const variantStyles = {
    primary: disabled 
      ? 'background-color: #d1d5db; color: #9ca3af;'
      : 'background-color: #1A733E; color: white;',
    secondary: disabled
      ? 'background-color: #f3f4f6; color: #9ca3af; border: 1px solid #d1d5db;'
      : 'background-color: white; color: #374151; border: 1px solid #d1d5db;',
    create: disabled
      ? 'background-color: #d1d5db; color: #9ca3af;'
      : 'background-color: #1A733E; color: white;',
    edit: disabled
      ? 'background-color: #f3f4f6; color: #9ca3af;'
      : 'background-color: #3b82f6; color: white;',
    danger: disabled
      ? 'background-color: #fee2e2; color: #9ca3af;'
      : 'background-color: #ef4444; color: white;',
    success: disabled
      ? 'background-color: #d1d5db; color: #9ca3af;'
      : 'background-color: #10b981; color: white;'
  };

  const hoverStyles = !disabled ? `
    ${variant === 'primary' || variant === 'create' ? '&:hover { background-color: #15582E; }' : ''}
    ${variant === 'secondary' ? '&:hover { background-color: #f9fafb; }' : ''}
    ${variant === 'edit' ? '&:hover { background-color: #2563eb; }' : ''}
    ${variant === 'danger' ? '&:hover { background-color: #dc2626; }' : ''}
    ${variant === 'success' ? '&:hover { background-color: #059669; }' : ''}
  ` : '';

  return `${sizeStyles[size]} ${variantStyles[variant]} ${hoverStyles}`;
}
