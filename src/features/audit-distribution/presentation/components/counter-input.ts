/**
 * Counter Input Component
 * Reusable counter input with increment/decrement buttons
 */

export interface CounterInputConfig {
  min?: number;
  max?: number;
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export class CounterInput {
  private container: HTMLElement;
  private config: CounterInputConfig;

  constructor(container: HTMLElement, config: CounterInputConfig) {
    this.container = container;
    this.config = {
      min: 0,
      max: 10,
      ...config
    };
    this.render();
  }

  private render(): void {
    const { value, min = 0, max = 10, disabled = false, className = '' } = this.config;

    this.container.innerHTML = `
      <div class="flex items-center gap-1 ${className}">
        <button
          type="button"
          class="counter-btn w-4 h-4 flex items-center justify-center border border-gray-300 bg-white text-gray-600 rounded text-xs font-semibold hover:bg-gray-50 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onclick="this.dispatchEvent(new CustomEvent('decrement'))"
          ${disabled || value <= min ? 'disabled' : ''}
        >
          −
        </button>
        <input
          type="number"
          class="audit-count-input w-12 px-2 py-1 border border-gray-300 rounded text-xs font-bold text-center bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          value="${value}"
          min="${min}"
          max="${max}"
          ${disabled ? 'disabled' : ''}
        />
        <button
          type="button"
          class="counter-btn w-4 h-4 flex items-center justify-center border border-gray-300 bg-white text-gray-600 rounded text-xs font-semibold hover:bg-gray-50 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onclick="this.dispatchEvent(new CustomEvent('increment'))"
          ${disabled || value >= max ? 'disabled' : ''}
        >
          +
        </button>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const decrementBtn = this.container.querySelector('.counter-btn:first-child');
    const incrementBtn = this.container.querySelector('.counter-btn:last-child');
    const input = this.container.querySelector('input') as HTMLInputElement;

    if (decrementBtn) {
      decrementBtn.addEventListener('click', () => {
        const newValue = Math.max(this.config.min || 0, this.config.value - 1);
        this.updateValue(newValue);
      });
    }

    if (incrementBtn) {
      incrementBtn.addEventListener('click', () => {
        const newValue = Math.min(this.config.max || 10, this.config.value + 1);
        this.updateValue(newValue);
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        const newValue = parseInt(input.value) || this.config.min || 0;
        const clampedValue = Math.max(
          this.config.min || 0,
          Math.min(this.config.max || 10, newValue)
        );
        this.updateValue(clampedValue);
      });

      input.addEventListener('input', () => {
        const newValue = parseInt(input.value) || this.config.min || 0;
        const clampedValue = Math.max(
          this.config.min || 0,
          Math.min(this.config.max || 10, newValue)
        );
        this.updateValue(clampedValue);
      });
    }
  }

  updateValue(value: number): void {
    this.config.value = value;
    const input = this.container.querySelector('input') as HTMLInputElement;
    if (input) {
      input.value = value.toString();
    }
    this.config.onValueChange(value);
    this.render();
  }

  setDisabled(disabled: boolean): void {
    this.config.disabled = disabled;
    this.render();
  }

  getValue(): number {
    return this.config.value;
  }
}

