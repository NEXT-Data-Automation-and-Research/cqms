/**
 * DateRangePicker — Custom dual-calendar date range picker component
 * Self-contained ES module with inline CSS injection.
 *
 * Modes:
 *   'range'  — dual-month calendar with From/To tabs, presets, Apply/Cancel
 *   'single' — dual-month calendar, click to pick one date
 *
 * Usage:
 *   import { DateRangePicker } from '/js/date-range-picker.js';
 *   const picker = new DateRangePicker(document.getElementById('container'), {
 *     mode: 'range',
 *     label: 'Date Range',
 *     defaultPreset: 'last30',
 *     onApply: ({ from, to }) => { ... },
 *   });
 */

// ─── CSS Injection ───────────────────────────────────────────────────────────
const STYLE_ID = 'drp-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
/* ── Root ── */
.drp-root { position: relative; display: inline-block; font-family: 'Poppins', sans-serif; }

/* ── Trigger Button ── */
.drp-trigger {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; background: #fff; color: #374151;
  border: 1px solid #e5e7eb; border-radius: 0.375rem;
  font-size: 0.875rem; font-weight: 500; cursor: pointer;
  font-family: 'Poppins', sans-serif; transition: all 0.15s; white-space: nowrap;
}
.drp-trigger:hover { border-color: #1A733E; }
.drp-trigger.drp-active { background: #1A733E; color: #fff; border-color: #1A733E; }
.drp-trigger svg { width: 1rem; height: 1rem; flex-shrink: 0; }
.drp-chevron { width: 0.75rem !important; height: 0.75rem !important; transition: transform 0.2s; }
.drp-active .drp-chevron { transform: rotate(180deg); }

/* ── Dropdown ── */
.drp-dropdown {
  position: absolute; top: 100%; left: 0; margin-top: 0.375rem;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.12); z-index: 1000;
  display: none; overflow: hidden;
}
.drp-dropdown.drp-open { display: flex; }
.drp-dropdown.drp-align-right { left: auto; right: 0; }

/* ── Presets Section (left) ── */
.drp-presets {
  padding: 0.75rem; display: flex; flex-direction: column; min-width: 8.5rem;
  border-right: 1px solid #f3f4f6;
}
.drp-preset {
  background: none; border: none; padding: 0.4rem 0.625rem; text-align: left;
  font-size: 0.8125rem; font-family: 'Poppins', sans-serif; color: #374151;
  cursor: pointer; border-radius: 0.25rem; transition: all 0.1s; white-space: nowrap;
}
.drp-preset:hover { background: #f3f4f6; }
.drp-preset.drp-preset-active { background: rgba(26,115,62,0.08); color: #1A733E; font-weight: 600; }

/* Hide presets border when calendar is not visible */
.drp-presets:last-child { border-right: none; }

/* ── Calendar Section (right) — hidden until Custom is selected ── */
.drp-calendar-section { padding: 0.75rem; min-width: 0; display: none; }
.drp-calendar-section.drp-calendar-visible { display: block; }

/* ── Tabs (From / To) ── */
.drp-tabs { display: flex; gap: 1.25rem; margin-bottom: 0.5rem; border-bottom: 2px solid #f3f4f6; }
.drp-tab {
  background: none; border: none; padding: 0.25rem 0; cursor: pointer;
  font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 600;
  color: #9ca3af; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s;
}
.drp-tab.drp-tab-active { color: #1A733E; border-bottom-color: #1A733E; }
.drp-tab-date { display: block; font-size: 0.6875rem; font-weight: 400; color: #6b7280; margin-top: 0.0625rem; }
.drp-tab.drp-tab-active .drp-tab-date { color: #374151; }

/* ── Month Navigation ── */
.drp-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.375rem;
}
.drp-nav-btn {
  background: none; border: 1px solid #e5e7eb; border-radius: 0.25rem;
  width: 1.5rem; height: 1.5rem; cursor: pointer; display: flex;
  align-items: center; justify-content: center; color: #374151; transition: all 0.15s;
}
.drp-nav-btn:hover { background: #f3f4f6; border-color: #1A733E; }
.drp-nav-btn svg { width: 0.75rem; height: 0.75rem; }
.drp-nav-title { font-size: 0.8125rem; font-weight: 600; color: #111827; }

/* ── Calendar Grids ── */
.drp-calendars { display: flex; gap: 1rem; }
.drp-month { min-width: 0; }
.drp-month-title { text-align: center; font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
.drp-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 0;
  margin-bottom: 0.125rem;
}
.drp-weekday {
  text-align: center; font-size: 0.625rem; font-weight: 600;
  color: #9ca3af; padding: 0.125rem 0; text-transform: uppercase;
}
.drp-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0; }
.drp-day {
  display: flex; align-items: center; justify-content: center;
  width: 1.875rem; height: 1.875rem; font-size: 0.75rem; color: #374151;
  cursor: pointer; border-radius: 0; transition: all 0.1s; border: none; background: none;
  font-family: 'Poppins', sans-serif; position: relative;
}
.drp-day:hover:not(.drp-day-disabled):not(.drp-day-outside) { background: #f3f4f6; }
.drp-day-outside { color: #d1d5db; cursor: default; }
.drp-day-disabled { color: #d1d5db; cursor: not-allowed; }
.drp-day-today { font-weight: 700; color: #1A733E; }
.drp-day-selected {
  background: #1A733E !important; color: #fff !important;
  border-radius: 50%; font-weight: 600; z-index: 1;
}
.drp-day-in-range { background: rgba(26, 115, 62, 0.1); }
.drp-day-range-start { border-radius: 50% 0 0 50%; }
.drp-day-range-end { border-radius: 0 50% 50% 0; }
.drp-day-range-start.drp-day-range-end { border-radius: 50%; }

/* ── Actions (Cancel / Apply) ── */
.drp-actions {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f3f4f6;
}
.drp-btn {
  padding: 0.3rem 0.875rem; border-radius: 0.375rem; font-size: 0.75rem;
  font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer;
  transition: all 0.15s; border: none;
}
.drp-btn-cancel { background: #fff; color: #374151; border: 1px solid #e5e7eb; }
.drp-btn-cancel:hover { background: #f9fafb; }
.drp-btn-apply { background: #1A733E; color: #fff; }
.drp-btn-apply:hover { background: #15633a; }

/* ── Single mode adjustments ── */
.drp-single .drp-tabs { display: none; }
.drp-single .drp-presets { display: none; }
`;
  document.head.appendChild(style);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getNow() {
  if (typeof window.getDhakaNow === 'function') return window.getDhakaNow();
  return new Date();
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(day, from, to) {
  if (!from || !to) return false;
  const t = startOfDay(day).getTime();
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
}

function formatForInput(d) {
  if (typeof window.formatDhakaDateForInput === 'function') return window.formatDhakaDateForInput(d);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(d) {
  if (!d) return '';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

// ─── Presets ─────────────────────────────────────────────────────────────────
function getPresets() {
  const now = getNow();
  return [
    {
      id: 'today', label: 'Today',
      getRange() { return { from: startOfDay(now), to: endOfDay(now) }; }
    },
    {
      id: 'yesterday', label: 'Yesterday',
      getRange() {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
    },
    {
      id: 'thisWeek', label: 'This Week',
      getRange() {
        const day = now.getDay(); // 0=Sun
        const s = new Date(now); s.setDate(s.getDate() - day);
        return { from: startOfDay(s), to: endOfDay(now) };
      }
    },
    {
      id: 'thisMonth', label: 'This Month',
      getRange() {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: startOfDay(s), to: endOfDay(e) };
      }
    },
    {
      id: 'lastMonth', label: 'Last Month',
      getRange() {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfDay(s), to: endOfDay(e) };
      }
    },
    { id: 'custom', label: 'Custom', getRange() { return null; } }
  ];
}

// ─── DateRangePicker Class ───────────────────────────────────────────────────
export class DateRangePicker {
  /**
   * @param {HTMLElement|string} container — DOM element or selector
   * @param {Object} options
   * @param {string}   [options.mode='range']         — 'range' or 'single'
   * @param {string}   [options.label='Date Range']   — trigger button label
   * @param {string}   [options.defaultPreset]        — preset id to apply on init
   * @param {Object}   [options.defaultRange]         — { from: Date, to: Date }
   * @param {Function} [options.onApply]              — ({ from, to }) => void
   * @param {Function} [options.onClear]              — () => void
   * @param {string}   [options.align='left']         — 'left' or 'right'
   * @param {Date}     [options.minDate]              — earliest selectable date
   * @param {Date}     [options.maxDate]              — latest selectable date
   * @param {boolean}  [options.required=false]       — for single mode form fields
   * @param {Array}    [options.presets]              — custom presets array
   */
  constructor(container, options = {}) {
    injectStyles();

    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('DateRangePicker: container not found');

    this.options = Object.assign({
      mode: 'range',
      label: 'Date Range',
      defaultPreset: null,
      defaultRange: null,
      onApply: null,
      onClear: null,
      align: 'left',
      minDate: null,
      maxDate: null,
      required: false,
      presets: null,
    }, options);

    this.presets = this.options.presets || getPresets();

    // State
    this.isOpen = false;
    this.appliedFrom = null;
    this.appliedTo = null;
    this.pendingFrom = null;
    this.pendingTo = null;
    this.activeTab = 'from';
    this.activePreset = null;
    this.hoverDate = null;

    // The right calendar shows this month; left shows previous month
    const now = getNow();
    this.viewMonth = now.getMonth();
    this.viewYear = now.getFullYear();

    // Bound handlers for cleanup
    this._onOutsideClick = this._handleOutsideClick.bind(this);
    this._onEscape = this._handleEscape.bind(this);

    this._build();
    this._applyDefault();
  }

  // ─── Build DOM ─────────────────────────────────────────────────────────────
  _build() {
    this.root = document.createElement('div');
    this.root.className = 'drp-root' + (this.options.mode === 'single' ? ' drp-single' : '');

    // Trigger button
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'drp-trigger';
    this.trigger.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="drp-trigger-label">${this._escapeHtml(this.options.label)}</span>
      <svg class="drp-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    `;
    this.trigger.addEventListener('click', () => this.toggle());
    this.triggerLabel = this.trigger.querySelector('.drp-trigger-label');

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'drp-dropdown' + (this.options.align === 'right' ? ' drp-align-right' : '');

    // Calendar section
    this.calSection = document.createElement('div');
    this.calSection.className = 'drp-calendar-section';

    // Tabs (range mode)
    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'drp-tabs';
    this.fromTab = this._createTab('From', 'from');
    this.toTab = this._createTab('To', 'to');
    this.tabsEl.appendChild(this.fromTab);
    this.tabsEl.appendChild(this.toTab);

    // Navigation
    this.navEl = document.createElement('div');
    this.navEl.className = 'drp-nav';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'drp-nav-btn';
    prevBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
    prevBtn.addEventListener('click', () => this._prevMonth());
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'drp-nav-btn';
    nextBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    nextBtn.addEventListener('click', () => this._nextMonth());
    this.navTitle = document.createElement('span');
    this.navTitle.className = 'drp-nav-title';
    this.navEl.appendChild(prevBtn);
    this.navEl.appendChild(this.navTitle);
    this.navEl.appendChild(nextBtn);

    // Calendars container
    this.calendarsEl = document.createElement('div');
    this.calendarsEl.className = 'drp-calendars';

    // Actions
    this.actionsEl = document.createElement('div');
    this.actionsEl.className = 'drp-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'drp-btn drp-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.close());
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'drp-btn drp-btn-apply';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this._apply());
    this.actionsEl.appendChild(cancelBtn);
    this.actionsEl.appendChild(applyBtn);

    this.calSection.appendChild(this.tabsEl);
    this.calSection.appendChild(this.navEl);
    this.calSection.appendChild(this.calendarsEl);
    this.calSection.appendChild(this.actionsEl);

    // Presets section (range mode)
    this.presetsEl = document.createElement('div');
    this.presetsEl.className = 'drp-presets';
    this.presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drp-preset';
      btn.dataset.preset = p.id;
      btn.textContent = p.label;
      btn.addEventListener('click', () => this._selectPreset(p));
      this.presetsEl.appendChild(btn);
    });

    if (this.options.mode === 'range') {
      this.dropdown.appendChild(this.presetsEl);
    }
    this.dropdown.appendChild(this.calSection);

    this.root.appendChild(this.trigger);
    this.root.appendChild(this.dropdown);
    this.container.appendChild(this.root);

    this._renderCalendars();
    this._updateTabs();
  }

  _createTab(label, type) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'drp-tab' + (type === this.activeTab ? ' drp-tab-active' : '');
    tab.dataset.tab = type;
    tab.innerHTML = `${this._escapeHtml(label)}<span class="drp-tab-date"></span>`;
    tab.addEventListener('click', () => {
      this.activeTab = type;
      this._updateTabs();
    });
    return tab;
  }

  // ─── Calendar Rendering ────────────────────────────────────────────────────
  _renderCalendars() {
    this.calendarsEl.innerHTML = '';

    // Left month = previous month of viewMonth/viewYear
    let leftMonth = this.viewMonth - 1;
    let leftYear = this.viewYear;
    if (leftMonth < 0) { leftMonth = 11; leftYear--; }

    const leftGrid = this._buildMonthGrid(leftYear, leftMonth);
    const rightGrid = this._buildMonthGrid(this.viewYear, this.viewMonth);

    this.calendarsEl.appendChild(leftGrid);
    this.calendarsEl.appendChild(rightGrid);

    // Update nav title
    this.navTitle.textContent = `${MONTH_NAMES[leftMonth]} ${leftYear}          ${MONTH_NAMES[this.viewMonth]} ${this.viewYear}`;
  }

  _buildMonthGrid(year, month) {
    const container = document.createElement('div');
    container.className = 'drp-month';

    // Month title
    const title = document.createElement('div');
    title.className = 'drp-month-title';
    title.textContent = `${MONTH_NAMES[month]} ${year}`;
    container.appendChild(title);

    // Weekday headers
    const wkRow = document.createElement('div');
    wkRow.className = 'drp-weekdays';
    WEEKDAYS.forEach(d => {
      const el = document.createElement('div');
      el.className = 'drp-weekday';
      el.textContent = d;
      wkRow.appendChild(el);
    });
    container.appendChild(wkRow);

    // Days grid
    const daysEl = document.createElement('div');
    daysEl.className = 'drp-days';

    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfWeek(year, month);
    const today = getNow();

    // Previous month filler
    const prevDays = daysInMonth(year, month - 1 < 0 ? 11 : month - 1);
    for (let i = startDay - 1; i >= 0; i--) {
      const btn = this._createDayBtn(prevDays - i, true);
      daysEl.appendChild(btn);
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const btn = this._createDayBtn(d, false, date, today);
      daysEl.appendChild(btn);
    }

    // Next month filler
    const cellsUsed = startDay + totalDays;
    const remaining = (Math.ceil(cellsUsed / 7) * 7) - cellsUsed;
    for (let i = 1; i <= remaining; i++) {
      const btn = this._createDayBtn(i, true);
      daysEl.appendChild(btn);
    }

    container.appendChild(daysEl);
    return container;
  }

  _createDayBtn(dayNum, isOutside, date, today) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drp-day';
    btn.textContent = dayNum;

    if (isOutside) {
      btn.classList.add('drp-day-outside');
      return btn;
    }

    // Disabled check
    if (this.options.minDate && date < startOfDay(this.options.minDate)) {
      btn.classList.add('drp-day-disabled');
      return btn;
    }
    if (this.options.maxDate && date > endOfDay(this.options.maxDate)) {
      btn.classList.add('drp-day-disabled');
      return btn;
    }

    // Today
    if (sameDay(date, today)) {
      btn.classList.add('drp-day-today');
    }

    // Selection states
    const from = this.pendingFrom;
    const to = this.pendingTo;

    if (sameDay(date, from)) {
      btn.classList.add('drp-day-selected');
      if (to && !sameDay(from, to)) btn.classList.add('drp-day-range-start');
      if (sameDay(from, to)) btn.classList.add('drp-day-range-start', 'drp-day-range-end');
    }
    if (sameDay(date, to)) {
      btn.classList.add('drp-day-selected');
      if (from && !sameDay(from, to)) btn.classList.add('drp-day-range-end');
    }
    if (from && to && inRange(date, from, to) && !sameDay(date, from) && !sameDay(date, to)) {
      btn.classList.add('drp-day-in-range');
    }

    // Hover preview for range
    if (this.options.mode === 'range' && this.hoverDate && from && !to) {
      const hFrom = from.getTime() < this.hoverDate.getTime() ? from : this.hoverDate;
      const hTo = from.getTime() < this.hoverDate.getTime() ? this.hoverDate : from;
      if (inRange(date, hFrom, hTo) && !sameDay(date, from)) {
        btn.classList.add('drp-day-in-range');
      }
    }

    // Store date reference on the element for hover logic
    btn._drpDate = date;

    // Click handler
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._selectDate(date);
    });

    // Hover handler — lightweight class toggle, no re-render
    if (this.options.mode === 'range') {
      btn.addEventListener('mouseenter', () => {
        if (!this.pendingFrom || this.pendingTo) return; // only preview when picking 'to'
        this.hoverDate = date;
        this._updateHoverPreview();
      });
    }

    return btn;
  }

  // ─── Date Selection ────────────────────────────────────────────────────────
  _selectDate(date) {
    if (this.options.mode === 'single') {
      this.pendingFrom = startOfDay(date);
      this.pendingTo = null;
      this._apply();
      return;
    }

    // Range mode
    if (this.activeTab === 'from') {
      this.pendingFrom = startOfDay(date);
      // If to is before from, clear it
      if (this.pendingTo && this.pendingTo < this.pendingFrom) {
        this.pendingTo = null;
      }
      this.activeTab = 'to';
      this.activePreset = 'custom';
    } else {
      // 'to' tab
      if (this.pendingFrom && date < this.pendingFrom) {
        // Swap: treat click as new from, move to 'to' tab
        this.pendingTo = endOfDay(this.pendingFrom);
        this.pendingFrom = startOfDay(date);
      } else {
        this.pendingTo = endOfDay(date);
      }
      this.activePreset = 'custom';
    }

    this.hoverDate = null;
    this._updateTabs();
    this._renderCalendars();
    this._updatePresetHighlight();
  }

  // ─── Hover Preview (lightweight, no DOM rebuild) ────────────────────────────
  _updateHoverPreview() {
    const from = this.pendingFrom;
    const hover = this.hoverDate;
    if (!from || !hover) return;
    const hFrom = from.getTime() < hover.getTime() ? from : hover;
    const hTo = from.getTime() < hover.getTime() ? hover : from;

    // Walk all day buttons and toggle in-range class
    this.calendarsEl.querySelectorAll('.drp-day').forEach(btn => {
      if (!btn._drpDate || btn.classList.contains('drp-day-outside') || btn.classList.contains('drp-day-disabled')) return;
      const d = btn._drpDate;
      const isInHoverRange = inRange(d, hFrom, hTo) && !sameDay(d, from);
      btn.classList.toggle('drp-day-in-range', isInHoverRange);
    });
  }

  // ─── Preset Selection ──────────────────────────────────────────────────────
  _selectPreset(preset) {
    this.activePreset = preset.id;

    if (preset.id === 'custom') {
      // Show calendar section for custom date picking
      this.calSection.classList.add('drp-calendar-visible');
      this._updatePresetHighlight();
      return;
    }

    // Hide calendar for non-custom presets
    this.calSection.classList.remove('drp-calendar-visible');

    const range = preset.getRange();
    if (range) {
      this.pendingFrom = range.from;
      this.pendingTo = range.to;
      this.activeTab = 'from';
      this._updateTabs();
      this._renderCalendars();
      // Auto-apply for non-custom presets
      this._apply();
    }
    this._updatePresetHighlight();
  }

  _updatePresetHighlight() {
    this.presetsEl.querySelectorAll('.drp-preset').forEach(btn => {
      btn.classList.toggle('drp-preset-active', btn.dataset.preset === this.activePreset);
    });
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  _updateTabs() {
    this.fromTab.classList.toggle('drp-tab-active', this.activeTab === 'from');
    this.toTab.classList.toggle('drp-tab-active', this.activeTab === 'to');

    const fromDateEl = this.fromTab.querySelector('.drp-tab-date');
    const toDateEl = this.toTab.querySelector('.drp-tab-date');
    if (fromDateEl) fromDateEl.textContent = this.pendingFrom ? formatDisplay(this.pendingFrom) : '';
    if (toDateEl) toDateEl.textContent = this.pendingTo ? formatDisplay(this.pendingTo) : '';
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  _prevMonth() {
    this.viewMonth--;
    if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
    this._renderCalendars();
  }

  _nextMonth() {
    this.viewMonth++;
    if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    this._renderCalendars();
  }

  // ─── Apply / Close ─────────────────────────────────────────────────────────
  _apply() {
    if (this.options.mode === 'single') {
      if (!this.pendingFrom) return;
      this.appliedFrom = this.pendingFrom;
      this.appliedTo = null;
      this._updateTriggerLabel();
      this.close();
      if (this.options.onApply) {
        this.options.onApply({ from: this.appliedFrom, to: null });
      }
      return;
    }

    // Range mode
    if (!this.pendingFrom || !this.pendingTo) return;
    this.appliedFrom = this.pendingFrom;
    this.appliedTo = this.pendingTo;
    this._updateTriggerLabel();
    this.close();
    if (this.options.onApply) {
      this.options.onApply({ from: this.appliedFrom, to: this.appliedTo });
    }
  }

  _updateTriggerLabel() {
    if (this.options.mode === 'single') {
      this.triggerLabel.textContent = this.appliedFrom ? formatDisplay(this.appliedFrom) : this.options.label;
      return;
    }

    if (this.appliedFrom && this.appliedTo) {
      // Check if a preset matches
      const presetMatch = this.presets.find(p => p.id !== 'custom' && p.id === this.activePreset);
      if (presetMatch && presetMatch.id !== 'custom') {
        this.triggerLabel.textContent = presetMatch.label;
      } else {
        this.triggerLabel.textContent = `${formatDisplay(this.appliedFrom)} – ${formatDisplay(this.appliedTo)}`;
      }
    } else {
      this.triggerLabel.textContent = this.options.label;
    }
  }

  _applyDefault() {
    if (this.options.defaultRange) {
      this.pendingFrom = this.options.defaultRange.from ? startOfDay(this.options.defaultRange.from) : null;
      this.pendingTo = this.options.defaultRange.to ? endOfDay(this.options.defaultRange.to) : null;
      this.appliedFrom = this.pendingFrom;
      this.appliedTo = this.pendingTo;
      this._updateTriggerLabel();
      this._updateTabs();
      this._renderCalendars();
      return;
    }

    if (this.options.defaultPreset) {
      const preset = this.presets.find(p => p.id === this.options.defaultPreset);
      if (preset && preset.id !== 'custom') {
        const range = preset.getRange();
        if (range) {
          this.pendingFrom = range.from;
          this.pendingTo = range.to;
          this.appliedFrom = range.from;
          this.appliedTo = range.to;
          this.activePreset = preset.id;
          this._updateTriggerLabel();
          this._updateTabs();
          this._updatePresetHighlight();
          this._renderCalendars();
        }
      }
    }
  }

  // ─── Open / Close / Toggle ─────────────────────────────────────────────────
  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Reset pending to applied
    this.pendingFrom = this.appliedFrom;
    this.pendingTo = this.appliedTo;
    this.activeTab = 'from';
    this.hoverDate = null;

    // Set view to show applied To date's month, or current month
    if (this.appliedTo) {
      this.viewMonth = this.appliedTo.getMonth();
      this.viewYear = this.appliedTo.getFullYear();
    } else {
      const now = getNow();
      this.viewMonth = now.getMonth();
      this.viewYear = now.getFullYear();
    }

    this.dropdown.classList.add('drp-open');
    this.trigger.classList.add('drp-active');
    this._updateTabs();
    this._renderCalendars();
    this._updatePresetHighlight();

    // Only show calendar if Custom is active
    if (this.activePreset === 'custom') {
      this.calSection.classList.add('drp-calendar-visible');
    } else {
      this.calSection.classList.remove('drp-calendar-visible');
    }

    // Attach global listeners
    setTimeout(() => {
      document.addEventListener('click', this._onOutsideClick, true);
      document.addEventListener('keydown', this._onEscape);
    }, 0);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.dropdown.classList.remove('drp-open');
    this.trigger.classList.remove('drp-active');
    document.removeEventListener('click', this._onOutsideClick, true);
    document.removeEventListener('keydown', this._onEscape);
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  _handleOutsideClick(e) {
    if (!this.root.contains(e.target)) {
      this.close();
    }
  }

  _handleEscape(e) {
    if (e.key === 'Escape') this.close();
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  getRange() {
    if (!this.appliedFrom) return null;
    return { from: this.appliedFrom, to: this.appliedTo };
  }

  setRange(from, to) {
    this.appliedFrom = from ? startOfDay(from) : null;
    this.appliedTo = to ? endOfDay(to) : null;
    this.pendingFrom = this.appliedFrom;
    this.pendingTo = this.appliedTo;
    this.activePreset = 'custom';
    this._updateTriggerLabel();
    this._updateTabs();
    this._renderCalendars();
    this._updatePresetHighlight();
  }

  applyPreset(presetId) {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return;
    this._selectPreset(preset);
    if (presetId !== 'custom') this._apply();
  }

  getValue() {
    if (!this.appliedFrom) return '';
    return formatForInput(this.appliedFrom);
  }

  getStartValue() {
    return this.appliedFrom ? formatForInput(this.appliedFrom) : '';
  }

  getEndValue() {
    return this.appliedTo ? formatForInput(this.appliedTo) : '';
  }

  destroy() {
    document.removeEventListener('click', this._onOutsideClick, true);
    document.removeEventListener('keydown', this._onEscape);
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
