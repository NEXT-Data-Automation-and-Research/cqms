/**
 * Header Template Generator
 * Generates HTML for audit form header section
 */

import type { HeaderOptions } from '../../domain/types.js';
import { escapeHtml, formatDate, getCountryFlag, getStatusIcon, formatQuarter, getScoreTextColor } from '../../utils/template-helpers.js';

/**
 * Generate header section HTML
 */
export function generateAuditHeader(options: HeaderOptions = {}): string {
  const {
    title = 'Audit Details',
    headerGradient = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)',
    audit = {},
    mode = 'view',
    headerActions = '',
    showAuditorName = false
  } = options;

  const isEdit = mode === 'edit';
  
  const employeeInfoHtml = isEdit 
    ? generateEmployeeInfoEdit(audit, showAuditorName)
    : generateEmployeeInfoView(audit, showAuditorName);

  const metadataCardsHtml = generateMetadataCards(audit);
  
  const passingStatus = audit.passingStatus || '';
  const scoreTextColor = getScoreTextColor(passingStatus);
  const averageScore = audit.averageScore || '0';
  
  return `
    <div id="auditFormHeader" style="position: relative; background: ${headerGradient}; padding: 0.6469rem 0.9704rem; color: white; box-shadow: 0 0.1213rem 0.1819rem rgba(0,0,0,0.1); margin-bottom: 0.5rem; flex-shrink: 0; transition: background 0.3s ease; overflow: visible;">
      <div id="headerBackgroundScore" style="position: absolute; top: 0; right: 0; height: 100%; display: none; align-items: center; justify-content: flex-end; padding-right: 0.9704rem; pointer-events: none; z-index: 0;">
        <span style="font-size: 10rem; font-weight: 900; font-family: 'Poppins', sans-serif; color: ${scoreTextColor}; line-height: 1; opacity: 0.6; user-select: none; display: flex; align-items: center; height: 100%;"><span id="headerScoreValue">${escapeHtml(averageScore.toString())}</span><span style="font-weight: 400;">%</span></span>
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
}

function generateEmployeeInfoEdit(audit: any, showAuditorName: boolean): string {
  return `
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
}

function generateEmployeeInfoView(audit: any, showAuditorName: boolean): string {
  return `
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

function generateMetadataCards(audit: any): string {
  const statusIcon = getStatusIcon(audit.passingStatus);
  const passingStatus = audit.passingStatus || '';
  
  return `
    <div id="headerMetadataCards" style="display: flex; gap: 0.3234rem; flex-wrap: wrap;">
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Date</p>
        <p style="font-size: 0.4852rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${formatDate(audit.auditTimestamp, true)}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Qtr</p>
        <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${formatQuarter(audit.quarter)}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Week</p>
        <p style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.week?.toString() || 'N/A')}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Errors</p>
        <p style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.totalErrorsCount?.toString() || '0')}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Status</p>
        <p id="headerStatusDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${statusIcon}${escapeHtml(passingStatus || 'N/A')}</p>
      </div>
      <div style="background: rgba(0,0,0,0.15); border-radius: 0.2425rem; padding: 0.3234rem 0.4852rem; backdrop-filter: blur(0.3516rem);">
        <p style="font-size: 0.4043rem; color: rgba(255,255,255,0.8); margin: 0 0 0.0808rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0122rem; line-height: 1;">Score</p>
        <p id="headerScoreDisplay" style="font-size: 0.6064rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; line-height: 1.2;">${escapeHtml(audit.averageScore?.toString() || '0')}%</p>
      </div>
    </div>
  `;
}

