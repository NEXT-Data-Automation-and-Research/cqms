/**
 * Custom Dropdown Component
 * Matches the screenshot style with button, icon, and categorized dropdown menu
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';

export interface DropdownOption {
  id: string;
  label: string;
  icon?: string;
  value: string;
  disabled?: boolean;
  danger?: boolean; // For red/danger options
}

export interface DropdownSection {
  title?: string;
  options: DropdownOption[];
}

export interface CustomDropdownConfig {
  id: string;
  label: string;
  icon?: string;
  placeholder?: string;
  sections: DropdownSection[];
  selectedValue?: string;
  onSelect: (value: string, option: DropdownOption) => void;
  className?: string;
}

export class CustomDropdown {
  private container: HTMLElement;
  private config: CustomDropdownConfig;
  private isOpen: boolean = false;
  private dropdownElement: HTMLElement | null = null;
  private buttonElement: HTMLElement | null = null;

  constructor(container: HTMLElement, config: CustomDropdownConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { label, icon, placeholder, selectedValue, sections, className } = this.config;
    
    // Find selected option label
    const selectedOption = this.findOptionByValue(selectedValue);
    const displayText = selectedOption?.label || placeholder || label;

    safeSetHTML(this.container, `
      <div class="custom-dropdown-wrapper relative ${className || ''}" data-dropdown-id="${this.config.id}">
        <button
          type="button"
          class="custom-dropdown-button flex items-center gap-2 px-3 py-2 text-sm border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium min-w-[140px] justify-between"
          aria-haspopup="true"
          aria-expanded="false"
          title="${label}"
        >
            <span class="custom-dropdown-label flex-1 text-left truncate">${escapeHtml(displayText)}</span>
          <svg class="custom-dropdown-chevron w-4 h-4 flex-shrink-0 transition-transform text-white/60" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6L8 10L12 6"/>
          </svg>
        </button>
        <div class="custom-dropdown-menu hidden absolute top-full left-0 mt-1.5 rounded-xl shadow-2xl border min-w-[220px] z-[100] max-h-[400px] overflow-y-auto glass-card border-white/20">
          <div class="px-3 py-2 border-b border-white/10 bg-white/5">
            <div class="text-xs font-semibold text-white/80 uppercase tracking-wide">${escapeHtml(label)}</div>
          </div>
          ${this.renderMenuContent(sections)}
        </div>
      </div>
    `);

    // Attach image error handlers (onerror is stripped by DOMPurify for security)
    this.attachImageErrorHandlers();
    this.attachEventListeners();
  }

  /**
   * Attach error handlers to images (onerror is stripped by DOMPurify for security)
   */
  private attachImageErrorHandlers(): void {
    this.container.querySelectorAll('img').forEach(img => {
      if (img.hasAttribute('data-error-handler-attached')) return;
      img.setAttribute('data-error-handler-attached', 'true');
      
      img.addEventListener('error', function() {
        // Hide the image and show the fallback (initials)
        this.style.display = 'none';
        const fallback = this.nextElementSibling as HTMLElement;
        if (fallback) {
          fallback.style.display = 'flex';
        }
      });
    });
  }

  private renderMenuContent(sections: DropdownSection[]): string {
    return sections.map((section, sectionIndex) => {
      const sectionHtml = section.options.map(option => {
        // Handle empty string comparison for "All" options
        const selectedValue = this.config.selectedValue ?? '';
        const optionValue = option.value ?? '';
        const isSelected = optionValue === selectedValue;
        const dangerClass = option.danger ? 'text-red-600' : '';
        
        return `
          <button
            type="button"
            class="custom-dropdown-option w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${dangerClass} ${isSelected ? 'bg-primary/20 text-primary border-l-2 border-primary font-semibold' : 'text-white/90 hover:bg-white/10'} ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
            data-value="${option.value}"
            ${option.disabled ? 'disabled' : ''}
          >
            ${option.icon ? `<span class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-white/70">${option.icon}</span>` : ''}
            <span class="flex-1 text-left font-medium">${escapeHtml(option.label)}</span>
            ${isSelected ? `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary flex-shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ` : '<div class="w-4 flex-shrink-0"></div>'}
          </button>
        `;
      }).join('');

      const sectionTitle = section.title ? `
        <div class="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
          ${escapeHtml(section.title)}
        </div>
      ` : '';

      const divider = sectionIndex < sections.length - 1 ? `
        <div class="border-t border-white/10 my-1"></div>
      ` : '';

      return `${sectionTitle}${sectionHtml}${divider}`;
    }).join('');
  }

  private findOptionByValue(value?: string): DropdownOption | null {
    // Allow empty string as a valid value (for "All" options)
    if (value === undefined || value === null) return null;
    
    for (const section of this.config.sections) {
      const option = section.options.find(opt => opt.value === value);
      if (option) return option;
    }
    return null;
  }

  private attachEventListeners(): void {
    const wrapper = this.container.querySelector('.custom-dropdown-wrapper') as HTMLElement;
    this.buttonElement = wrapper?.querySelector('.custom-dropdown-button') as HTMLElement;
    this.dropdownElement = wrapper?.querySelector('.custom-dropdown-menu') as HTMLElement;

    // Toggle dropdown on button click
    this.buttonElement?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Handle option selection
    const options = wrapper?.querySelectorAll('.custom-dropdown-option');
    options?.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = (option as HTMLElement).dataset.value;
        if (value) {
          const selectedOption = this.findOptionByValue(value);
          if (selectedOption && !selectedOption.disabled) {
            this.config.onSelect(value, selectedOption);
            this.close();
            this.updateButtonText(selectedOption.label);
          }
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (wrapper && !wrapper.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (!this.dropdownElement || !this.buttonElement) return;
    
    const wrapper = this.container.querySelector('.custom-dropdown-wrapper') as HTMLElement;
    
    this.isOpen = true;
    this.dropdownElement.classList.remove('hidden');
    this.dropdownElement.style.display = 'block';
    this.dropdownElement.style.visibility = 'visible';
    this.dropdownElement.style.opacity = '1';
    this.dropdownElement.style.zIndex = '10000';
    this.buttonElement.setAttribute('aria-expanded', 'true');
    
    // Set wrapper z-index to ensure dropdown appears on top
    if (wrapper) {
      wrapper.style.zIndex = '10000';
      wrapper.classList.add('dropdown-open');
    }
    
    const chevron = this.buttonElement.querySelector('.custom-dropdown-chevron');
    if (chevron) {
      (chevron as HTMLElement).style.transform = 'rotate(180deg)';
    }
  }

  private close(): void {
    if (!this.dropdownElement || !this.buttonElement) return;
    
    const wrapper = this.container.querySelector('.custom-dropdown-wrapper') as HTMLElement;
    
    this.isOpen = false;
    this.dropdownElement.classList.add('hidden');
    this.dropdownElement.style.display = 'none';
    this.dropdownElement.style.visibility = 'hidden';
    this.dropdownElement.style.opacity = '0';
    this.buttonElement.setAttribute('aria-expanded', 'false');
    
    // Reset wrapper z-index
    if (wrapper) {
      wrapper.style.zIndex = '';
      wrapper.classList.remove('dropdown-open');
    }
    
    const chevron = this.buttonElement.querySelector('.custom-dropdown-chevron');
    if (chevron) {
      (chevron as HTMLElement).style.transform = 'rotate(0deg)';
    }
  }

  private updateButtonText(text: string): void {
    const labelElement = this.buttonElement?.querySelector('.custom-dropdown-label');
    if (labelElement) {
      labelElement.textContent = text;
    }
  }

  update(config: Partial<CustomDropdownConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }

  getValue(): string | undefined {
    return this.config.selectedValue;
  }

  setValue(value: string): void {
    // Allow empty string as a valid value (for "All" options)
    const option = this.findOptionByValue(value);
    if (option) {
      this.config.selectedValue = value;
      this.updateButtonText(option.label);
      // Update the selected state in the dropdown menu
      this.updateSelectedState();
    } else {
      // If value not found, reset to placeholder
      this.config.selectedValue = undefined;
      const labelElement = this.buttonElement?.querySelector('.custom-dropdown-label');
      if (labelElement) {
        labelElement.textContent = this.config.placeholder || this.config.label;
      }
      this.updateSelectedState();
    }
  }

  private updateSelectedState(): void {
    if (!this.dropdownElement) return;
    
    // Update all option buttons to reflect selected state
    const options = this.dropdownElement.querySelectorAll('.custom-dropdown-option');
    options.forEach(optionEl => {
      const value = (optionEl as HTMLElement).dataset.value || '';
      // Handle both empty string and undefined for "All" options
      const isSelected = value === (this.config.selectedValue ?? '');
      
      // Remove existing selected classes
      optionEl.classList.remove('bg-primary/20', 'text-primary', 'border-l-2', 'border-primary', 'font-semibold');
      
      // Add selected classes if this is the selected option
      if (isSelected) {
        optionEl.classList.add('bg-primary/20', 'text-primary', 'border-l-2', 'border-primary', 'font-semibold');
      }
      
      // Update checkmark visibility
      const checkmark = optionEl.querySelector('svg');
      const spacer = optionEl.querySelector('.w-4');
      if (isSelected) {
        if (checkmark) checkmark.style.display = 'block';
        if (spacer) (spacer as HTMLElement).style.display = 'none';
      } else {
        if (checkmark) checkmark.style.display = 'none';
        if (spacer) (spacer as HTMLElement).style.display = 'block';
      }
    });
  }
}

