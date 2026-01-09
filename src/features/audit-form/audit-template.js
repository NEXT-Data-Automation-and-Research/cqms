/**
 * Shared Audit Template Module
 * 
 * This module provides functions to generate the HTML structure for audit forms.
 * Both create-audit.html and audit-view.html use these templates to ensure
 * consistent layout and styling. Changes here will automatically reflect in both pages.
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date string for display
 */
function formatDate(dateString, includeTime = false) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    if (includeTime) {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    }
    return `${day} ${month} ${year}`;
}

/**
 * Get country flag emoji
 */
function getCountryFlag(countryName) {
    if (!countryName) return '🏳️';
    const country = countryName.toLowerCase();
    const flagMap = {
        'bangladesh': '🇧🇩',
        'india': '🇮🇳',
        'pakistan': '🇵🇰',
        'philippines': '🇵🇭',
        'indonesia': '🇮🇩',
        'sri lanka': '🇱🇰',
        'nepal': '🇳🇵',
        'thailand': '🇹🇭',
        'vietnam': '🇻🇳',
        'malaysia': '🇲🇾',
        'singapore': '🇸🇬',
        'usa': '🇺🇸',
        'united states': '🇺🇸',
        'uk': '🇬🇧',
        'united kingdom': '🇬🇧',
        'canada': '🇨🇦',
        'australia': '🇦🇺',
        'new zealand': '🇳🇿',
        'south africa': '🇿🇦',
        'egypt': '🇪🇬',
        'kenya': '🇰🇪',
        'nigeria': '🇳🇬',
        'ghana': '🇬🇭'
    };
    return flagMap[country] || '🏳️';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// Template Generation Functions
// ============================================================================

/**
 * Generate header section HTML
 * @param {Object} options - Configuration options
 * @param {string} options.title - Header title (e.g., "Create New Audit" or "Audit Details")
 * @param {string} options.headerGradient - CSS gradient for header background
 * @param {Object} options.audit - Audit data object
 * @param {string} options.mode - 'edit' or 'view'
 * @param {Object} options.headerActions - Additional header action buttons HTML
 */
window.generateAuditHeader = function(options = {}) {
    const {
        title = 'Audit Details',
        headerGradient = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)',
        audit = {},
        mode = 'view',
        headerActions = '',
        showAuditorName = false  // Only show to quality analysts and above
    } = options;

    const isEdit = mode === 'edit';
    
    // Employee information HTML (different for edit vs view)
    let employeeInfoHtml = '';
    if (isEdit) {
        // Edit mode: form inputs - matching audit-form.html exactly
        employeeInfoHtml = `
            <!-- Employee Information in Header -->
            <div style="display: flex; gap: 0.3234rem; flex-wrap: wrap; margin-bottom: 0.4852rem;">
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem); position: relative; overflow: visible;">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Employee *</p>
                    <select id="employeeName" name="employeeName" required style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; width: 100%; min-height: 1.2em; appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right center; background-size: 0.5659rem; padding-right: 1.2937rem; line-height: 1.2; position: relative; z-index: 10;">
                        <option value="" style="background-color: #ffffff; color: #374151;">Select Employee...</option>
                    </select>
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Email *</p>
                    <input type="email" id="employeeEmail" name="employeeEmail" required readonly style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; word-break: break-all; line-height: 1.2;">
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Type</p>
                    <input type="text" id="employeeType" name="employeeType" readonly style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; line-height: 1.2;">
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Department</p>
                    <input type="text" id="employeeDepartment" name="employeeDepartment" readonly style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; line-height: 1.2;">
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Country *</p>
                    <input type="text" id="countryOfEmployee" name="countryOfEmployee" required readonly style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; line-height: 1.2;">
                </div>
                ${showAuditorName ? `
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Auditor</p>
                    <input type="text" id="auditorName" name="auditorName" readonly style="padding: 0; border: none; background-color: transparent; color: white; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;" value="${escapeHtml(audit.auditorName || 'N/A')}">
                </div>
                ` : ''}
                <div id="intercomAliasContainer" style="display: none; background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Intercom Alias</p>
                    <input type="text" id="intercomAlias" name="intercomAlias" readonly style="padding: 0; border: none; background-color: transparent; color: rgba(255,255,255,0.9); font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; width: 100%; line-height: 1.2;" placeholder="Intercom alias...">
                </div>
            </div>
        `;
    } else {
        // View mode: read-only text in boxes
        employeeInfoHtml = `
            <div style="display: flex; gap: 0.3234rem; margin-bottom: 0.4852rem; flex-wrap: wrap;">
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Employee</p>
                    <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;" title="${escapeHtml(audit.employeeName || 'N/A')}">${escapeHtml(audit.employeeName || 'N/A')}</p>
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Email</p>
                    <p style="font-size: 0.4852rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;" title="${escapeHtml(audit.employeeEmail || 'N/A')}">${escapeHtml(audit.employeeEmail || 'N/A')}</p>
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Type</p>
                    <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; color: white; line-height: 1.2;">${escapeHtml(audit.employeeType || 'N/A')}</p>
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Department</p>
                    <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; color: white; line-height: 1.2;">${escapeHtml(audit.employeeDepartment || 'N/A')}</p>
                </div>
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Country</p>
                    <div style="display: flex; align-items: center; gap: 0.1617rem; line-height: 1.2;">
                        <span style="font-size: 0.7278rem; line-height: 1;" title="${escapeHtml(audit.countryOfEmployee || 'Unknown')}">${getCountryFlag(audit.countryOfEmployee)}</span>
                        <span style="font-size: 0.4852rem; font-weight: 600; font-family: 'Poppins', sans-serif; color: white;">${escapeHtml(audit.countryOfEmployee || 'N/A')}</span>
                    </div>
                </div>
                ${showAuditorName ? `
                <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                    <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Auditor</p>
                    <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;" title="${escapeHtml(audit.auditorName || 'N/A')}">${escapeHtml(audit.auditorName || 'N/A')}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Audit metadata cards
    let statusIcon = '';
    let passingStatus = audit.passingStatus || '';
    if (passingStatus) {
        const passingStatusLower = passingStatus.toLowerCase();
        const isPassing = passingStatusLower.includes('pass') && !passingStatusLower.includes('not');
        statusIcon = isPassing ? '✓ ' : '✗ ';
    }

    const metadataCardsHtml = `
        <!-- Audit Metadata Cards -->
        <div id="headerMetadataCards" style="display: flex; gap: 0.3234rem; flex-wrap: wrap;">
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Date</p>
                <p style="font-size: 0.4852rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${formatDate(audit.auditTimestamp, true)}</p>
            </div>
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Qtr</p>
                <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${audit.quarter ? (audit.quarter.toString().startsWith('Q') ? escapeHtml(audit.quarter) : 'Q' + escapeHtml(audit.quarter)) : 'N/A'}</p>
            </div>
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Week</p>
                <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.week || 'N/A')}</p>
            </div>
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Errors</p>
                <p style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.totalErrorsCount || '0')}</p>
            </div>
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Status</p>
                <p id="headerStatusDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${statusIcon}${escapeHtml(passingStatus || 'N/A')}</p>
            </div>
            <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
                <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Score</p>
                <p id="headerScoreDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.averageScore || '0')}%</p>
            </div>
        </div>
    `;

    // Calculate darker color for score text based on header gradient
    // For green gradient (passing), use darker green; for red (not passing), use darker red
    // Reuse passingStatus already declared above
    const passingStatusLowerForScore = passingStatus.toLowerCase();
    const isPassingForScore = passingStatusLowerForScore.includes('pass') && !passingStatusLowerForScore.includes('not');
    const scoreTextColor = isPassingForScore 
        ? 'rgba(10, 50, 30, 0.4)' // Darker green for passing
        : 'rgba(100, 10, 10, 0.4)'; // Darker red for not passing
    
    const averageScore = audit.averageScore || '0';
    
    return `
        <div id="auditFormHeader" style="position: relative; background: ${headerGradient}; padding: 0.6469rem 0.9704rem; color: white; box-shadow: 0 0.1213rem 0.1819rem rgba(0,0,0,0.1); margin-bottom: 0.5rem; flex-shrink: 0; transition: background 0.3s ease; overflow: visible;">
            <!-- Background Score Percentage -->
            <div id="headerBackgroundScore" style="position: absolute; top: 0; right: 0; height: 100%; display: none; align-items: center; justify-content: flex-end; padding-right: 0.9704rem; pointer-events: none; z-index: 0;">
                <span style="font-size: 10rem; font-weight: 900; font-family: 'Poppins', sans-serif; color: ${scoreTextColor}; line-height: 1; opacity: 0.6; user-select: none; display: flex; align-items: center; height: 100%;"><span id="headerScoreValue">${escapeHtml(averageScore)}</span><span style="font-weight: 400;">%</span></span>
            </div>
            <div style="position: relative; z-index: 1;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.4852rem;">
                    <div style="flex: 1; display: flex; align-items: center; gap: 0.4852rem; flex-wrap: wrap;">
                        <h2 style="font-size: 0.7278rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(title)}</h2>
                        ${audit.id ? `<span id="auditIdDisplay" onclick="copyAuditId('${escapeHtml(audit.id)}', this)" style="font-size: 0.4852rem; font-weight: 600; font-family: 'Poppins', sans-serif; color: rgba(255,255,255,0.9); background: rgba(0,0,0,0.2); padding: 0.1617rem 0.3234rem; border-radius: 0.2425rem; cursor: pointer; transition: all 0.2s ease; user-select: none; border: 0.0304rem solid rgba(255,255,255,0.3);" onmouseover="this.style.background='rgba(0,0,0,0.3)'; this.style.borderColor='rgba(255,255,255,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0.2)'; this.style.borderColor='rgba(255,255,255,0.3)'" title="Click to copy Audit ID">${escapeHtml(audit.id)}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.3234rem;">
                        ${headerActions}
                    </div>
                </div>
                <div>
                    ${employeeInfoHtml}
                    ${metadataCardsHtml}
                </div>
            </div>
        </div>
    `;
};

/**
 * Generate transcript section HTML
 * @param {Object} options - Configuration options
 * @param {Object} options.audit - Audit data object
 * @param {string} options.mode - 'edit' or 'view'
 * @param {string} options.interactionIdHtml - HTML for interaction ID display/input
 */
window.generateTranscriptSection = function(options = {}) {
    const {
        audit = {},
        mode = 'view',
        interactionIdHtml = '<span style="font-size: 0.4852rem; color: #1f2937; font-family: \'Poppins\', sans-serif; font-weight: 600;">N/A</span>'
    } = options;

    const isEdit = mode === 'edit';
    
    // Transcript header info HTML (different for edit vs view)
    let transcriptInfoHtml = '';
    if (isEdit) {
        // Edit mode: form inputs
        transcriptInfoHtml = `
            <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                    <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
                        <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                        Transcript
                    </h3>
                    <div style="display: flex; align-items: center; gap: 0.1617rem;">
                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">ID:</span>
                        <input type="text" id="interactionId" name="interactionId" required placeholder="Enter..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 2.4258rem; color: #000000; background-color: #ffffff;">
                        <button type="button" onclick="copyConversationId(); return false;" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy ID" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                        <button type="button" id="viewChatBtn" disabled style="padding: 0.1617rem 0.3234rem; background-color: #000000; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4447rem; font-family: 'Poppins', sans-serif; cursor: not-allowed; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; opacity: 0.6;" title="Open in Intercom (load conversation first)">Open</button>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.1617rem;">
                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Date:</span>
                        <input type="date" id="interactionDate" name="interactionDate" required style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; color: #000000; background-color: #ffffff;">
                    </div>
                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">
                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Name:</span>
                        <input type="text" id="clientName" name="clientName" readonly placeholder="Client name..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box; background-color: #f9fafb; color: #000000;">
                    </div>
                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">
                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Email:</span>
                        <input type="email" id="clientEmail" name="clientEmail" placeholder="client@..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box; color: #000000; background-color: #ffffff;">
                        <button type="button" onclick="copyClientEmail(); return false;" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy Email" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                        <!-- Second Row: Quick Actions (Compact) -->
                        <div id="clientNameSection" style="display: none; align-items: center; justify-content: flex-end; gap: 0.3234rem; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb;">
                            <div style="display: flex; align-items: center; gap: 0.1617rem;">
                                <button type="button" id="translateChatBtn" onclick="translateChatMessages(); return false;" disabled style="padding: 0.2425rem 0.4043rem; background: #f3f4f6; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4043rem; font-family: 'Poppins', sans-serif; font-weight: 500; color: #000000; cursor: not-allowed; transition: all 0.2s; display: flex; align-items: center; gap: 0.1617rem; white-space: nowrap; opacity: 0.6;" title="Translation feature is currently disabled">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                    </svg>
                                    <span>Translate</span>
                                </button>
                            </div>
                        </div>
            </div>
        `;
    } else {
        // View mode: read-only text
        transcriptInfoHtml = `
            <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                    <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
                        <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                        Transcript
                    </h3>
                    <div style="display: flex; align-items: center; gap: 0.1617rem;">
                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">ID:</span>
                        ${interactionIdHtml}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.1617rem;">
                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Date:</span>
                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${formatDate(audit.interactionDate, false)}</span>
                    </div>
                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                    <div style="display: flex; align-items: center; gap: 0.1617rem;">
                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Channel:</span>
                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.channel || 'N/A')}</span>
                    </div>
                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">
                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Email:</span>
                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(audit.clientEmail || 'N/A')}">${escapeHtml(audit.clientEmail || 'N/A')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Default view for edit mode is text area, for view mode is chat (if available)
    const chatViewDefaultDisplay = isEdit ? 'none' : 'flex';
    const textViewDefaultDisplay = isEdit ? 'flex' : 'none';

    return `
        <div style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 1; min-height: 0;">
            <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: flex; flex-direction: column; flex: 1; min-height: 75vh; max-height: 100vh; transition: height 0.3s ease; overflow: hidden;">
                <div style="background: #f9fafb; padding: 0.6469rem; border-bottom: 0.0304rem solid #e5e7eb; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4852rem;">
                    ${transcriptInfoHtml}
                    <!-- Third Row: Collapsible Information Grid -->
                    <div id="conversationInfoGrid" style="display: none; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb; margin-top: 0.3234rem;">
                        <button id="toggleInfoGridBtn" type="button" onclick="toggleConversationInfoGrid()" style="width: 100%; padding: 0.3234rem 0.4852rem; background: #f9fafb; border: 0.0304rem solid #e5e7eb; border-radius: 0.2425rem; font-family: 'Poppins', sans-serif; font-size: 0.4447rem; font-weight: 600; color: #1A733E; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; margin-bottom: 0.3234rem;" onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#1A733E';" onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">
                            <span style="display: flex; align-items: center; gap: 0.2425rem;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Conversation Details</span>
                            </span>
                            <svg id="toggleInfoGridIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem; transition: transform 0.2s; transform: rotate(0deg);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="conversationInfoGridContent" style="display: none; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.3234rem; font-family: 'Poppins', sans-serif;">
                            <!-- Information cards will be populated here -->
                        </div>
                    </div>
                </div>
                <!-- Chat Interface View -->
                <div id="transcriptChatView" style="display: ${chatViewDefaultDisplay}; padding: 0.4852rem; background: var(--background-white); overflow-y: auto; overflow-x: hidden; flex: 1; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--gray-400) var(--gray-100); position: relative; min-height: 0; width: 100%; box-sizing: border-box;">
                    <!-- Chat messages will be dynamically inserted here -->
                    <div id="chatMessagesContainer" style="display: flex; flex-direction: column; min-height: 0; width: 100%; box-sizing: border-box; overflow-x: hidden;">
                        ${isEdit 
                            ? '<div style="text-align: center; padding: 1.2937rem; color: var(--text-muted); font-size: 0.5659rem;"><p>Enter an Interaction ID to automatically load conversation from Intercom</p></div>'
                            : '<!-- Loading state will be shown here initially, then replaced with messages or error -->'
                        }
                    </div>
                </div>
                <!-- Text Area View -->
                <div id="transcriptTextView" style="padding: 0.6469rem; background: var(--background-white); overflow-y: auto; flex: 1; display: ${textViewDefaultDisplay}; position: relative;">
                    ${isEdit
                        ? '<textarea id="transcript" name="transcript" placeholder="Paste the interaction transcript here..." style="width: 100%; height: 100%; padding: 0; border: none; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: \'Poppins\', sans-serif; background-color: transparent; resize: none; box-sizing: border-box; outline: none; transition: padding-top 0.3s ease;"></textarea>'
                        : `<div style="white-space: pre-wrap; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif; width: 100%;">${escapeHtml(audit.transcript || '<span style="color: #9ca3af; font-style: italic;">No transcript available</span>')}</div>`
                    }
                </div>
            </div>
            <!-- Conversation Attributes Panel (Always visible by default) - Below transcript container -->
            <div id="conversationAttributesPanel" style="background: white; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">
                <div id="conversationAttributesContent" style="padding: 0.3234rem; display: block;">
                    <div id="conversationAttributesGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
                        <!-- Attributes will be dynamically populated here -->
                    </div>
                </div>
            </div>
            <!-- Conversation Attributes Panel for text view (Always visible by default) - Below transcript container -->
            <div id="conversationAttributesPanelTextView" style="background: white; border-radius: 0.3234rem; padding: 0.3234rem; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">
                <div id="conversationAttributesGridTextView" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
                    <!-- Attributes will be dynamically populated here -->
                </div>
            </div>
        </div>
    `;
};

/**
 * Generate resizable splitter HTML
 */
window.generateSplitter = function() {
    return `
        <div id="splitter" class="no-print" style="width: 0.2425rem; background: #e5e7eb; cursor: col-resize; position: relative; flex-shrink: 0; transition: background 0.2s; z-index: 1;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.1213rem; height: 1.2128rem; background: #9ca3af; border-radius: 0.0606rem;"></div>
        </div>
    `;
};

/**
 * Generate complete audit form HTML structure
 * @param {Object} options - Configuration options
 */
window.generateAuditFormHTML = function(options = {}) {
    const {
        audit = {},
        mode = 'view',
        headerTitle = mode === 'edit' ? 'Create New Audit' : 'Audit Details',
        headerGradient = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)',
        headerActions = '',
        interactionIdHtml = '',
        errorDetailsHtml = '',
        recommendationsHtml = '',
        ratingHtml = '',
        actionButtonsHtml = '',
        showAuditorName = false
    } = options;

    const headerHtml = window.generateAuditHeader({
        title: headerTitle,
        headerGradient: headerGradient,
        audit: audit,
        mode: mode,
        headerActions: headerActions,
        showAuditorName: showAuditorName
    });

    const transcriptHtml = window.generateTranscriptSection({
        audit: audit,
        mode: mode,
        interactionIdHtml: interactionIdHtml
    });

    const splitterHtml = window.generateSplitter();

    return `
        <div style="background: white; width: 100%; min-height: 100vh; display: flex; flex-direction: column;">
            ${headerHtml}
            
            <!-- Two Column Layout -->
            <div id="auditMainContent" style="display: flex; padding: 0.5rem 0.9704rem 0.9704rem 0.9704rem; max-width: 100%; gap: 0; flex-wrap: nowrap; overflow-x: visible; align-items: stretch; flex: 1; min-height: 0;">
                
                <!-- LEFT COLUMN: Interaction Details + Transcript -->
                <div id="leftColumn" style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 0 0 33%; min-width: 13.6451rem; max-width: 75%; padding-right: 0.6469rem; overflow-x: visible; overflow-y: visible; box-sizing: border-box;">
                    ${transcriptHtml}
                </div>
                
                ${splitterHtml}
                
                <!-- RIGHT COLUMN: Error Details & Recommendations -->
                <div id="rightColumn" style="flex: 1; min-width: 9.0967rem; padding-left: 0.3234rem; display: flex; flex-direction: column; min-height: 0; overflow-y: auto;">
                    ${errorDetailsHtml}
                    ${recommendationsHtml}
                    ${ratingHtml}
                </div>
            </div>
            
            ${actionButtonsHtml}
        </div>
    `;
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        getCountryFlag,
        escapeHtml,
        generateAuditHeader: window.generateAuditHeader,
        generateTranscriptSection: window.generateTranscriptSection,
        generateSplitter: window.generateSplitter,
        generateAuditFormHTML: window.generateAuditFormHTML
    };
}

window.generateTranscriptSection = function(options = {}) {

    const {

        audit = {},

        mode = 'view',

        interactionIdHtml = '<span style="font-size: 0.4852rem; color: #1f2937; font-family: \'Poppins\', sans-serif; font-weight: 600;">N/A</span>'

    } = options;



    const isEdit = mode === 'edit';

    

    // Transcript header info HTML (different for edit vs view)

    let transcriptInfoHtml = '';

    if (isEdit) {

        // Edit mode: form inputs

        transcriptInfoHtml = `

            <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap; justify-content: space-between;">

                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">

                    <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">

                        <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>

                        Transcript

                    </h3>

                    <div style="display: flex; align-items: center; gap: 0.1617rem;">

                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">ID:</span>

                        <input type="text" id="interactionId" name="interactionId" required placeholder="Enter..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 2.4258rem; color: #000000; background-color: #ffffff;">

                        <button type="button" onclick="copyConversationId(); return false;" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy ID" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">

                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">

                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>

                            </svg>

                        </button>

                        <button type="button" id="viewChatBtn" disabled style="padding: 0.1617rem 0.3234rem; background-color: #000000; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4447rem; font-family: 'Poppins', sans-serif; cursor: not-allowed; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; opacity: 0.6;" title="Open in Intercom (load conversation first)">Open</button>

                    </div>

                </div>

                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">

                    <div style="display: flex; align-items: center; gap: 0.1617rem;">

                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Date:</span>

                        <input type="date" id="interactionDate" name="interactionDate" required style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; color: #000000; background-color: #ffffff;">

                    </div>

                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>

                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">

                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Name:</span>

                        <input type="text" id="clientName" name="clientName" readonly placeholder="Client name..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box; background-color: #f9fafb; color: #000000;">

                    </div>

                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>

                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">

                        <span style="font-size: 0.4447rem; color: #000000; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Email:</span>

                        <input type="email" id="clientEmail" name="clientEmail" placeholder="client@..." style="padding: 0.1617rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; min-width: 3.6387rem; box-sizing: border-box; color: #000000; background-color: #ffffff;">

                        <button type="button" onclick="copyClientEmail(); return false;" style="padding: 0.0808rem; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000000; transition: all 0.2s;" title="Copy Email" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';">

                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">

                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>

                            </svg>

                        </button>

                    </div>

                </div>

                        <!-- Second Row: Quick Actions (Compact) -->

                        <div id="clientNameSection" style="display: none; align-items: center; justify-content: flex-end; gap: 0.3234rem; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb;">

                            <div style="display: flex; align-items: center; gap: 0.1617rem;">

                                <button type="button" id="translateChatBtn" onclick="translateChatMessages(); return false;" disabled style="padding: 0.2425rem 0.4043rem; background: #f3f4f6; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4043rem; font-family: 'Poppins', sans-serif; font-weight: 500; color: #000000; cursor: not-allowed; transition: all 0.2s; display: flex; align-items: center; gap: 0.1617rem; white-space: nowrap; opacity: 0.6;" title="Translation feature is currently disabled">

                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">

                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>

                                    </svg>

                                    <span>Translate</span>

                                </button>

                            </div>

                        </div>

            </div>

        `;

    } else {

        // View mode: read-only text

        transcriptInfoHtml = `

            <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap; justify-content: space-between;">

                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">

                    <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">

                        <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>

                        Transcript

                    </h3>

                    <div style="display: flex; align-items: center; gap: 0.1617rem;">

                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">ID:</span>

                        ${interactionIdHtml}

                    </div>

                </div>

                <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">

                    <div style="display: flex; align-items: center; gap: 0.1617rem;">

                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Date:</span>

                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${formatDate(audit.interactionDate, false)}</span>

                    </div>

                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>

                    <div style="display: flex; align-items: center; gap: 0.1617rem;">

                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap;">Channel:</span>

                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.channel || 'N/A')}</span>

                    </div>

                    <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>

                    <div style="display: flex; align-items: center; gap: 0.1617rem; min-width: 0;">

                        <span style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0092rem; white-space: nowrap; flex-shrink: 0;">Email:</span>

                        <span style="font-size: 0.4852rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(audit.clientEmail || 'N/A')}">${escapeHtml(audit.clientEmail || 'N/A')}</span>

                    </div>

                </div>

            </div>

        `;

    }



    // Default view for edit mode is text area, for view mode is chat (if available)

    const chatViewDefaultDisplay = isEdit ? 'none' : 'flex';

    const textViewDefaultDisplay = isEdit ? 'flex' : 'none';



    return `

        <div style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 1; min-height: 0;">

            <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: flex; flex-direction: column; flex: 1; min-height: 75vh; max-height: 100vh; transition: height 0.3s ease; overflow: hidden;">

                <div style="background: #f9fafb; padding: 0.6469rem; border-bottom: 0.0304rem solid #e5e7eb; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4852rem;">

                    ${transcriptInfoHtml}

                    <!-- Third Row: Collapsible Information Grid -->

                    <div id="conversationInfoGrid" style="display: none; padding-top: 0.3234rem; border-top: 0.0304rem solid #e5e7eb; margin-top: 0.3234rem;">

                        <button id="toggleInfoGridBtn" type="button" onclick="toggleConversationInfoGrid()" style="width: 100%; padding: 0.3234rem 0.4852rem; background: #f9fafb; border: 0.0304rem solid #e5e7eb; border-radius: 0.2425rem; font-family: 'Poppins', sans-serif; font-size: 0.4447rem; font-weight: 600; color: #1A733E; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; margin-bottom: 0.3234rem;" onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#1A733E';" onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">

                            <span style="display: flex; align-items: center; gap: 0.2425rem;">

                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem;">

                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>

                                </svg>

                                <span>Conversation Details</span>

                            </span>

                            <svg id="toggleInfoGridIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 0.4043rem; height: 0.4043rem; transition: transform 0.2s; transform: rotate(0deg);">

                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>

                            </svg>

                        </button>

                        <div id="conversationInfoGridContent" style="display: none; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.3234rem; font-family: 'Poppins', sans-serif;">

                            <!-- Information cards will be populated here -->

                        </div>

                    </div>

                </div>

                <!-- Chat Interface View -->

                <div id="transcriptChatView" style="display: ${chatViewDefaultDisplay}; padding: 0.4852rem; background: var(--background-white); overflow-y: auto; overflow-x: hidden; flex: 1; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--gray-400) var(--gray-100); position: relative; min-height: 0; width: 100%; box-sizing: border-box;">

                    <!-- Chat messages will be dynamically inserted here -->

                    <div id="chatMessagesContainer" style="display: flex; flex-direction: column; min-height: 0; width: 100%; box-sizing: border-box; overflow-x: hidden;">

                        ${isEdit 

                            ? '<div style="text-align: center; padding: 1.2937rem; color: var(--text-muted); font-size: 0.5659rem;"><p>Enter an Interaction ID to automatically load conversation from Intercom</p></div>'

                            : '<!-- Loading state will be shown here initially, then replaced with messages or error -->'

                        }

                    </div>

                </div>

                <!-- Text Area View -->

                <div id="transcriptTextView" style="padding: 0.6469rem; background: var(--background-white); overflow-y: auto; flex: 1; display: ${textViewDefaultDisplay}; position: relative;">

                    ${isEdit

                        ? '<textarea id="transcript" name="transcript" placeholder="Paste the interaction transcript here..." style="width: 100%; height: 100%; padding: 0; border: none; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: \'Poppins\', sans-serif; background-color: transparent; resize: none; box-sizing: border-box; outline: none; transition: padding-top 0.3s ease;"></textarea>'

                        : `<div style="white-space: pre-wrap; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif; width: 100%;">${escapeHtml(audit.transcript || '<span style="color: #9ca3af; font-style: italic;">No transcript available</span>')}</div>`

                    }

                </div>

            </div>

            <!-- Conversation Attributes Panel (Always visible by default) - Below transcript container -->

            <div id="conversationAttributesPanel" style="background: white; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">

                <div id="conversationAttributesContent" style="padding: 0.3234rem; display: block;">

                    <div id="conversationAttributesGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">

                        <!-- Attributes will be dynamically populated here -->

                    </div>

                </div>

            </div>

            <!-- Conversation Attributes Panel for text view (Always visible by default) - Below transcript container -->

            <div id="conversationAttributesPanelTextView" style="background: white; border-radius: 0.3234rem; padding: 0.3234rem; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">

                <div id="conversationAttributesGridTextView" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">

                    <!-- Attributes will be dynamically populated here -->

                </div>

            </div>

        </div>

    `;

};



/**

 * Generate resizable splitter HTML

 */

window.generateSplitter = function() {

    return `

        <div id="splitter" class="no-print" style="width: 0.2425rem; background: #e5e7eb; cursor: col-resize; position: relative; flex-shrink: 0; transition: background 0.2s; z-index: 1;">

            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.1213rem; height: 1.2128rem; background: #9ca3af; border-radius: 0.0606rem;"></div>

        </div>

    `;

};



/**

 * Generate complete audit form HTML structure

 * @param {Object} options - Configuration options

 */

window.generateAuditFormHTML = function(options = {}) {

    const {

        audit = {},

        mode = 'view',

        headerTitle = mode === 'edit' ? 'Create New Audit' : 'Audit Details',

        headerGradient = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)',

        headerActions = '',

        interactionIdHtml = '',

        errorDetailsHtml = '',

        recommendationsHtml = '',

        ratingHtml = '',

        actionButtonsHtml = '',

        showAuditorName = false

    } = options;



    const headerHtml = window.generateAuditHeader({

        title: headerTitle,

        headerGradient: headerGradient,

        audit: audit,

        mode: mode,

        headerActions: headerActions,

        showAuditorName: showAuditorName

    });



    const transcriptHtml = window.generateTranscriptSection({

        audit: audit,

        mode: mode,

        interactionIdHtml: interactionIdHtml

    });



    const splitterHtml = window.generateSplitter();



    return `

        <div style="background: white; width: 100%; min-height: 100vh; display: flex; flex-direction: column;">

            ${headerHtml}

            

            <!-- Two Column Layout -->

            <div id="auditMainContent" style="display: flex; padding: 0.5rem 0.9704rem 0.9704rem 0.9704rem; max-width: 100%; gap: 0; flex-wrap: nowrap; overflow-x: visible; align-items: stretch; flex: 1; min-height: 0;">

                

                <!-- LEFT COLUMN: Interaction Details + Transcript -->

                <div id="leftColumn" style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 0 0 33%; min-width: 13.6451rem; max-width: 75%; padding-right: 0.6469rem; overflow-x: visible; overflow-y: visible; box-sizing: border-box;">

                    ${transcriptHtml}

                </div>

                

                ${splitterHtml}

                

                <!-- RIGHT COLUMN: Error Details & Recommendations -->

                <div id="rightColumn" style="flex: 1; min-width: 9.0967rem; padding-left: 0.3234rem; display: flex; flex-direction: column; min-height: 0; overflow-y: auto;">

                    ${errorDetailsHtml}

                    ${recommendationsHtml}

                    ${ratingHtml}

                </div>

            </div>

            

            ${actionButtonsHtml}

        </div>

    `;

};



// Export for use in other files

if (typeof module !== 'undefined' && module.exports) {

    module.exports = {

        formatDate,

        getCountryFlag,

        escapeHtml,

        generateAuditHeader: window.generateAuditHeader,

        generateTranscriptSection: window.generateTranscriptSection,

        generateSplitter: window.generateSplitter,

        generateAuditFormHTML: window.generateAuditFormHTML

    };

}


