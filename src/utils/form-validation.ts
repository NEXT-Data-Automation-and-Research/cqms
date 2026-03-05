/**
 * Form Validation Utility
 * H1 FIX: Real-time form validation on blur
 */

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get user-friendly field name from field ID or name
 */
function getFieldLabel(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  // Try to get label from associated label element first
  const id = field.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      let labelText = label.textContent || '';
      // Remove required asterisk and extra whitespace
      labelText = labelText.replace(/\s*\*\s*/, '').trim();
      // Remove "Full Name", "Email Address", etc. prefixes if present
      if (labelText) {
        return labelText;
      }
    }
  }

  // Fallback: derive from ID/name
  const fieldId = field.id || field.getAttribute('name') || '';
  
  // Map common field IDs to user-friendly names
  const fieldNameMap: Record<string, string> = {
    'createUserName': 'Full Name',
    'editUserName': 'Full Name',
    'createUserEmail': 'Email Address',
    'editUserEmail': 'Email Address',
    'createUserRole': 'Role',
    'editUserRole': 'Role',
    'createUserDepartment': 'Department',
    'editUserDepartment': 'Department',
    'createUserChannel': 'Channel',
    'editUserChannel': 'Channel',
    'createUserTeam': 'Team',
    'editUserTeam': 'Team',
    'createUserDesignation': 'Designation',
    'editUserDesignation': 'Designation',
    'createUserEmployeeId': 'Employee ID',
    'editUserEmployeeId': 'Employee ID',
    'createUserTeamSupervisor': 'Team Lead',
    'editUserTeamSupervisor': 'Team Lead',
    'createUserQualitySupervisor': 'Quality Mentor',
    'editUserQualitySupervisor': 'Quality Mentor',
    'createUserStatus': 'Account Status',
    'editUserStatus': 'Account Status',
    'createUserCountry': 'Country',
    'editUserCountry': 'Country',
    'createUserIntercomAdmin': 'Intercom Admin',
    'editUserIntercomAdmin': 'Intercom Admin'
  };

  if (fieldNameMap[fieldId]) {
    return fieldNameMap[fieldId];
  }

  // Generic conversion: createUserRole -> Role, editUserEmail -> Email
  const cleaned = fieldId
    .replace(/^(create|edit)User/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
  
  return cleaned || 'Field';
}

/**
 * Validate field and show error
 */
function validateField(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] {
  const errors: string[] = [];
  const value = field.value.trim();
  const fieldName = getFieldLabel(field);
  const isRequired = field.hasAttribute('required');

  // For select elements, empty string means "not selected" (default option)
  if (field instanceof HTMLSelectElement) {
    // Check required - empty string or empty value means not selected
    if (isRequired && (!value || value === '')) {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    // Skip further validation if field is empty and not required
    if ((!value || value === '') && !isRequired) {
      return errors;
    }
  } else {
    // For input and textarea
    // Check required
    if (isRequired && !value) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    // Skip further validation if field is empty and not required
    if (!value && !isRequired) {
      return errors;
    }
  }

  // Email validation - must be clear and specific
  if (field.type === 'email' || field.id.includes('Email') || field.name?.includes('email')) {
    if (value && !isValidEmail(value)) {
      errors.push('Please enter a valid email address (e.g., user@example.com)');
    }
  }

  // Name validation
  if (field.id.includes('Name') || field.name?.includes('name')) {
    if (value.length > 100) {
      errors.push('Name must be 100 characters or less');
    }
  }

  // Employee ID validation
  if (field.id.includes('EmployeeId') || field.name?.includes('employee_id')) {
    if (value && isNaN(Number(value))) {
      errors.push('Employee ID must be a number');
    }
  }

  return errors;
}

/**
 * Show field error
 */
function showFieldError(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, error: string): void {
  // Remove existing error
  clearFieldError(field);

  // Add error class
  field.style.borderColor = '#ef4444';
  field.style.borderWidth = '2px';
  
  // If this is a select with a searchable dropdown, also style the search input
  if (field instanceof HTMLSelectElement) {
    const wrapper = field.closest('.searchable-dropdown-wrapper');
    if (wrapper) {
      const searchInput = wrapper.querySelector('.searchable-dropdown-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.style.borderColor = '#ef4444';
        searchInput.style.borderWidth = '2px';
      }
    }
  }

  // Create error message element
  const errorId = `${field.id || field.name}_error`;
  let errorElement = document.getElementById(errorId);
  
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'field-error';
    errorElement.style.cssText = `
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    `;
    
    // Insert after field
    field.parentNode?.insertBefore(errorElement, field.nextSibling);
  }

  errorElement.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${error}</span>
  `;
}

/**
 * Clear field error
 */
function clearFieldError(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  field.style.borderColor = '';
  field.style.borderWidth = '';
  
  // If this is a select with a searchable dropdown, also clear the search input styling
  if (field instanceof HTMLSelectElement) {
    const wrapper = field.closest('.searchable-dropdown-wrapper');
    if (wrapper) {
      const searchInput = wrapper.querySelector('.searchable-dropdown-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.style.borderColor = '';
        searchInput.style.borderWidth = '';
      }
    }
  }

  const errorId = `${field.id || field.name}_error`;
  const errorElement = document.getElementById(errorId);
  if (errorElement) {
    errorElement.remove();
  }
}

/**
 * Setup real-time validation for a form
 */
export function setupFormValidation(formId: string): void {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (!form) return;

  const fields = form.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

  fields.forEach(field => {
    // Validate on blur
    field.addEventListener('blur', () => {
      const errors = validateField(field);
      if (errors.length > 0) {
        showFieldError(field, errors[0]);
      } else {
        clearFieldError(field);
      }
    });

    // Clear error on input (for better UX)
    field.addEventListener('input', () => {
      if (field.style.borderColor === 'rgb(239, 68, 68)') {
        const errors = validateField(field);
        if (errors.length === 0) {
          clearFieldError(field);
        }
      }
    });
  });
}

/**
 * Validate entire form
 */
export function validateForm(formId: string): { isValid: boolean; errors: string[] } {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (!form) {
    return { isValid: false, errors: ['Form not found'] };
  }

  const fields = form.querySelectorAll('input[required], textarea[required], select[required]') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  const allErrors: string[] = [];

  fields.forEach(field => {
    // For select elements, check if value is empty string (which means "not selected")
    if (field instanceof HTMLSelectElement) {
      const value = field.value.trim();
      // If required and value is empty or the default empty option, it's invalid
      if (field.hasAttribute('required') && (!value || value === '')) {
        const errors = validateField(field);
        if (errors.length > 0) {
          showFieldError(field, errors[0]);
          allErrors.push(...errors);
        } else {
          clearFieldError(field);
        }
      } else {
        // Not required or has value - validate normally
        const errors = validateField(field);
        if (errors.length > 0) {
          showFieldError(field, errors[0]);
          allErrors.push(...errors);
        } else {
          clearFieldError(field);
        }
      }
    } else {
      // For input and textarea, validate normally
      const errors = validateField(field);
      if (errors.length > 0) {
        showFieldError(field, errors[0]);
        allErrors.push(...errors);
      } else {
        clearFieldError(field);
      }
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}
