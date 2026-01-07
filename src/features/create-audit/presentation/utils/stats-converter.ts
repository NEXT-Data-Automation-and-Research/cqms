/**
 * Stats Converter Utility
 * Converts conversation statistics to audit stats format
 */

import type { AuditStats } from '../../domain/entities.js';
import type { ConversationStatistics } from './conversation-statistics.js';

/**
 * Convert conversation statistics to audit stats format
 */
export function convertToAuditStats(
  conversationStats: ConversationStatistics
): Partial<AuditStats> {
  // ✅ SECURITY: Safe division to prevent division by zero
  const totalConversations = conversationStats.totalConversations || 0;
  const conversationsWithRating = conversationStats.conversationsWithRating || 0;
  
  // Calculate pass rate safely
  const passRate = totalConversations > 0 && conversationsWithRating > 0
    ? Math.round((conversationsWithRating / totalConversations) * 100)
    : 0;

  // Convert CSAT from 0-5 scale to 0-100 scale
  const avgQualityScore = conversationStats.averageCSAT * 20;

  return {
    auditsConducted: totalConversations,
    avgQualityScore: Number(avgQualityScore.toFixed(1)),
    remaining: 0, // Not applicable for conversations
    passRate,
    reversalTotal: 0, // Not applicable for conversations
    reversalActive: 0, // Not applicable for conversations
    reversalResolved: 0, // Not applicable for conversations
    inProgress: totalConversations,
    avgDuration: formatDuration(conversationStats.averageConversationLength),
    daysRemaining: undefined
  };
}

/**
 * Format duration in minutes to readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

