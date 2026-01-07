/**
 * Events Renderer Module
 * Handles rendering calendar events to the UI
 */

import type { Event } from '../types.js';
import { escapeHtml } from '../utils.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class EventsRenderer {
  render(events: Event[]): void {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;

    if (events.length === 0) {
      safeSetHTML(eventsList, `
        <div class="px-4 py-8 text-center text-gray-500 text-xs">
          <p>No upcoming events</p>
        </div>
      `);
      return;
    }

    const typeLabels: { [key: string]: string } = {
      meeting: 'Meeting',
      feedback: 'Feedback',
      training: 'Training'
    };

    const htmlContent = events.map((event: Event) => {
      const eventDate = new Date(event.date || '');
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let dateDisplay = '';
      if (eventDate.toDateString() === today.toDateString()) {
        dateDisplay = 'Today';
      } else if (eventDate.toDateString() === tomorrow.toDateString()) {
        dateDisplay = 'Tomorrow';
      } else {
        dateDisplay = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const timeDisplay = event.start_time && event.end_time 
        ? `${event.start_time.substring(0, 5)} - ${event.end_time.substring(0, 5)}`
        : event.start_time 
          ? `${event.start_time.substring(0, 5)}`
          : '';

      const typeLabel = typeLabels[event.type || ''] || event.type || 'Event';
      const typeColor = event.type === 'meeting' ? 'bg-primary/10 text-primary' 
        : event.type === 'feedback' ? 'bg-warning/10 text-warning'
        : event.type === 'training' ? 'bg-success/10 text-success'
        : 'bg-gray-100 text-gray-700';

      return `
        <div class="px-4 py-3 hover:bg-gray-50 transition-colors">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <div class="w-10 h-10 rounded-lg ${typeColor} flex items-center justify-center text-xs font-semibold">
                ${typeLabel.charAt(0).toUpperCase()}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-semibold text-gray-900 mb-0.5">${escapeHtml(event.title || 'Untitled Event')}</h4>
              <p class="text-[10px] text-gray-600 mb-1">${escapeHtml(event.description || '')}</p>
              <div class="flex items-center gap-2 text-[10px] text-gray-500">
                <span>${dateDisplay}</span>
                ${timeDisplay ? `<span>•</span><span>${timeDisplay}</span>` : ''}
                ${event.meet_link ? `<span>•</span><a href="${escapeHtml(event.meet_link)}" target="_blank" class="text-primary hover:underline">Join</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    safeSetHTML(eventsList, htmlContent);
  }
}

