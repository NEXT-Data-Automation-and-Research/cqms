/**
 * Conversation Statistics Calculator
 * Calculates statistics from Intercom conversation data
 */

// Conversation interface matching what's used in conversations-panel
export interface Conversation {
  id: string;
  client: string;
  subject: string;
  csat: number;
  cxScore: number;
  length: number;
  totalParts: number;
  errorsDetected: number;
  tags: string[];
  topics?: string[];
  created: string;
  aiStatus: 'Completed' | 'Processing' | 'Failed';
  channel?: string;
}

export interface ConversationStatistics {
  totalConversations: number;
  totalParticipationParts: number;
  averageCSAT: number;
  conversationsWithRating: number;
  averageConversationLength: number;
  totalConversationLength: number;
  channelBreakdown: Record<string, number>;
  tagBreakdown: Record<string, number>;
  conversationsByDate: Record<string, number>;
}

/**
 * Calculate statistics from conversation array
 */
export function calculateConversationStatistics(
  conversations: Conversation[],
  participationCount: number = 0
): ConversationStatistics {
  if (!conversations || conversations.length === 0) {
    return {
      totalConversations: 0,
      totalParticipationParts: participationCount,
      averageCSAT: 0,
      conversationsWithRating: 0,
      averageConversationLength: 0,
      totalConversationLength: 0,
      channelBreakdown: {},
      tagBreakdown: {},
      conversationsByDate: {}
    };
  }

  // Calculate CSAT statistics
  const conversationsWithRating = conversations.filter(c => c.csat > 0);
  const totalCSAT = conversationsWithRating.reduce((sum, c) => sum + c.csat, 0);
  const averageCSAT = conversationsWithRating.length > 0
    ? Number((totalCSAT / conversationsWithRating.length).toFixed(2))
    : 0;

  // Calculate conversation length statistics
  const totalLength = conversations.reduce((sum, c) => sum + (c.length || 0), 0);
  const averageLength = conversations.length > 0
    ? Number((totalLength / conversations.length).toFixed(1))
    : 0;

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {};
  conversations.forEach(conv => {
    const channel = conv.channel || 'unknown';
    channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1;
  });

  // Tag breakdown
  const tagBreakdown: Record<string, number> = {};
  conversations.forEach(conv => {
    if (conv.tags && Array.isArray(conv.tags)) {
      conv.tags.forEach(tag => {
        tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
      });
    }
  });

  // Conversations by date
  const conversationsByDate: Record<string, number> = {};
  conversations.forEach(conv => {
    if (conv.created) {
      conversationsByDate[conv.created] = (conversationsByDate[conv.created] || 0) + 1;
    }
  });

  return {
    totalConversations: conversations.length,
    totalParticipationParts: participationCount,
    averageCSAT,
    conversationsWithRating: conversationsWithRating.length,
    averageConversationLength: averageLength,
    totalConversationLength: totalLength,
    channelBreakdown,
    tagBreakdown,
    conversationsByDate
  };
}

