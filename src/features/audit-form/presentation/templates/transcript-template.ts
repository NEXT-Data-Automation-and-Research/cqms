/**
 * Transcript Template Generator
 * Generates HTML for audit form transcript section
 */

import type { TranscriptOptions } from '../../domain/types.js';
import { escapeHtml, formatDate } from '../../utils/template-helpers.js';

/**
 * Generate transcript section HTML
 */
export function generateTranscriptSection(options: TranscriptOptions = {}): string {
  const {
    audit = {},
    mode = 'view',
    interactionIdHtml = '<span style="font-size: 0.4852rem; color: #1f2937; font-family: \'Poppins\', sans-serif; font-weight: 600;">N/A</span>'
  } = options;

  const isEdit = mode === 'edit';
  
  const transcriptInfoHtml = isEdit 
    ? generateTranscriptInfoEdit()
    : generateTranscriptInfoView(audit, interactionIdHtml);

  const chatViewDefaultDisplay = isEdit ? 'none' : 'flex';
  const textViewDefaultDisplay = isEdit ? 'flex' : 'none';

  return `
    <div style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 1; min-height: 0;">
      <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: flex; flex-direction: column; flex: 1; min-height: 75vh; max-height: 100vh; transition: height 0.3s ease; overflow: hidden;">
        <div style="background: #f9fafb; padding: 0.6469rem; border-bottom: 0.0304rem solid #e5e7eb; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4852rem;">
          ${transcriptInfoHtml}
          ${generateConversationInfoGrid()}
        </div>
        ${generateChatView(chatViewDefaultDisplay, isEdit)}
        ${generateTextView(textViewDefaultDisplay, isEdit, audit)}
      </div>
      ${generateAttributesPanels()}
    </div>
  `;
}

function generateTranscriptInfoEdit(): string {
  return `
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
}

function generateTranscriptInfoView(audit: any, interactionIdHtml: string): string {
  return `
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

function generateConversationInfoGrid(): string {
  return `
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
  `;
}

function generateChatView(display: string, isEdit: boolean): string {
  return `
    <div id="transcriptChatView" style="display: ${display}; padding: 0.4852rem; background: var(--background-white); overflow-y: auto; overflow-x: hidden; flex: 1; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--gray-400) var(--gray-100); position: relative; min-height: 0; width: 100%; box-sizing: border-box;">
      <div id="chatMessagesContainer" style="display: flex; flex-direction: column; min-height: 0; width: 100%; box-sizing: border-box; overflow-x: hidden;">
        ${isEdit 
          ? '<div style="text-align: center; padding: 1.2937rem; color: var(--text-muted); font-size: 0.5659rem;"><p>Enter an Interaction ID to automatically load conversation from Intercom</p></div>'
          : '<!-- Loading state will be shown here initially, then replaced with messages or error -->'
        }
      </div>
    </div>
  `;
}

function generateTextView(display: string, isEdit: boolean, audit: any): string {
  return `
    <div id="transcriptTextView" style="padding: 0.6469rem; background: var(--background-white); overflow-y: auto; flex: 1; display: ${display}; position: relative;">
      ${isEdit
        ? '<textarea id="transcript" name="transcript" placeholder="Paste the interaction transcript here..." style="width: 100%; height: 100%; padding: 0; border: none; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: \'Poppins\', sans-serif; background-color: transparent; resize: none; box-sizing: border-box; outline: none; transition: padding-top 0.3s ease;"></textarea>'
        : `<div style="white-space: pre-wrap; font-size: 0.5257rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif; width: 100%;">${escapeHtml(audit.transcript || '<span style="color: #9ca3af; font-style: italic;">No transcript available</span>')}</div>`
      }
    </div>
  `;
}

function generateAttributesPanels(): string {
  return `
    <div id="conversationAttributesPanel" style="background: white; border-radius: 0.3234rem; padding: 0; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">
      <div id="conversationAttributesContent" style="padding: 0.3234rem; display: block;">
        <div id="conversationAttributesGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
          <!-- Attributes will be dynamically populated here -->
        </div>
      </div>
    </div>
    <div id="conversationAttributesPanelTextView" style="background: white; border-radius: 0.3234rem; padding: 0.3234rem; border: 0.0304rem solid #e5e7eb; display: none; box-shadow: 0 0.0606rem 0.1213rem rgba(0,0,0,0.05); overflow-y: auto; max-height: 80vh; flex-shrink: 0;">
      <div id="conversationAttributesGridTextView" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.0644rem, 1fr)); gap: 0.3234rem;">
        <!-- Attributes will be dynamically populated here -->
      </div>
    </div>
  `;
}

