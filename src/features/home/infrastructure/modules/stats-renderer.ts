/**
 * Stats Renderer Module
 * Handles rendering statistics to the UI
 */

import type { StatsData } from '../types.js';
import { homeState } from '../state.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class StatsRenderer {
  render(stats: StatsData): void {
    const {
      totalAssigned,
      completed,
      inProgress,
      pending,
      remaining,
      daysRemaining,
      avgDurationText,
      totalAuditsConducted,
      avgQualityScoreText,
      passingCount,
      notPassingCount,
      activeReversals,
      resolvedReversals,
      totalReversals,
      requiresAcknowledgment
    } = stats;
    
    const statsAuditsConductedCount = document.getElementById('statsAuditsConductedCount');
    const statsRemainingText = document.getElementById('statsRemainingText');
    const statsRemainingProgress = document.getElementById('statsRemainingProgress');
    const statsAvgQualityScore = document.getElementById('statsAvgQualityScore');
    const statsAvgScoreSubtitle = document.getElementById('statsAvgScoreSubtitle');
    const statsPassingCount = document.getElementById('statsPassingCount');
    const statsNotPassingCount = document.getElementById('statsNotPassingCount');
    const statsRemainingCount = document.getElementById('statsRemainingCount');
    const statsInProgressCount = document.getElementById('statsInProgressCount');
    const statsDaysRemaining = document.getElementById('statsDaysRemaining');
    const statsReversalTotalCount = document.getElementById('statsReversalTotalCount');
    const statsReversalActiveCount = document.getElementById('statsReversalActiveCount');
    const statsReversalResolvedCount = document.getElementById('statsReversalResolvedCount');
    const statsRequiresAcknowledgmentCount = document.getElementById('statsRequiresAcknowledgmentCount');
    const requiresAcknowledgmentCard = document.getElementById('requiresAcknowledgmentCard');
    const statsAvgDuration = document.getElementById('statsAvgDuration');
    const statsAvgDurationSubtitle = document.getElementById('statsAvgDurationSubtitle');
    
    if (statsAuditsConductedCount) statsAuditsConductedCount.textContent = String(totalAuditsConducted);
    if (statsRemainingText) statsRemainingText.textContent = `${remaining} remaining`;
    
    const completedCount = totalAssigned - remaining;
    const progressPercentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
    if (statsRemainingProgress) {
      statsRemainingProgress.style.width = `${Math.min(100, progressPercentage)}%`;
      if (progressPercentage > 0) {
        statsRemainingProgress.classList.remove('bg-warning');
        statsRemainingProgress.classList.add('bg-success');
      } else {
        statsRemainingProgress.classList.remove('bg-success');
        statsRemainingProgress.classList.add('bg-warning');
      }
    }
    
    if (statsAvgQualityScore) statsAvgQualityScore.textContent = avgQualityScoreText;
    if (statsAvgScoreSubtitle) {
      statsAvgScoreSubtitle.textContent = totalAuditsConducted > 0 ? `from ${totalAuditsConducted} audits` : 'No audits yet';
    }
    
    if (statsPassingCount) {
      const loadingSpan = statsPassingCount.querySelector('span.inline-block');
      if (loadingSpan) loadingSpan.remove();
      const svg = statsPassingCount.querySelector('svg');
      const textSpan = statsPassingCount.querySelector('span:last-child');
      if (svg && textSpan) {
        let nextSibling = svg.nextSibling;
        while (nextSibling && nextSibling !== textSpan) {
          const toRemove = nextSibling;
          nextSibling = nextSibling.nextSibling;
          toRemove.remove();
        }
        textSpan.textContent = `${passingCount} Passed`;
      }
    }
    
    if (statsNotPassingCount) {
      const loadingSpan = statsNotPassingCount.querySelector('span.inline-block');
      if (loadingSpan) loadingSpan.remove();
      const svg = statsNotPassingCount.querySelector('svg');
      const textSpan = statsNotPassingCount.querySelector('span:last-child');
      if (svg && textSpan) {
        let nextSibling = svg.nextSibling;
        while (nextSibling && nextSibling !== textSpan) {
          const toRemove = nextSibling;
          nextSibling = nextSibling.nextSibling;
          toRemove.remove();
        }
        textSpan.textContent = `${notPassingCount} Not Passed`;
      }
    }
    
    const passRate = totalAuditsConducted > 0 ? Math.round((passingCount / totalAuditsConducted) * 100) : 0;
    const statsPassRate = document.getElementById('statsPassRate');
    const statsPassRateChange = document.getElementById('statsPassRateChange');
    if (statsPassRate) {
      const loadingDiv = statsPassRate.querySelector('div');
      if (loadingDiv) loadingDiv.remove();
      statsPassRate.textContent = `${passRate}%`;
    }
    if (statsPassRateChange) {
      statsPassRateChange.style.display = 'none';
    }
    
    if (statsRemainingCount) statsRemainingCount.textContent = String(remaining);
    if (statsInProgressCount) statsInProgressCount.textContent = String(inProgress);
    if (statsDaysRemaining) {
      statsDaysRemaining.textContent = `${daysRemaining} working day${daysRemaining !== 1 ? 's' : ''} remaining`;
    }
    
    if (statsReversalTotalCount) statsReversalTotalCount.textContent = String(totalReversals);
    if (statsReversalActiveCount) statsReversalActiveCount.textContent = String(activeReversals);
    if (statsReversalResolvedCount) statsReversalResolvedCount.textContent = String(resolvedReversals);
    
    if (homeState.isAgent && statsRequiresAcknowledgmentCount && requiresAcknowledgmentCard) {
      statsRequiresAcknowledgmentCount.textContent = String(requiresAcknowledgment);
      requiresAcknowledgmentCard.style.display = 'block';
    } else if (requiresAcknowledgmentCard) {
      requiresAcknowledgmentCard.style.display = 'none';
    }
    
    if (statsAvgDuration) {
      safeSetHTML(statsAvgDuration, '');
      const displayValue = avgDurationText || '-';
      statsAvgDuration.textContent = displayValue;
      statsAvgDuration.style.display = '';
    }
    if (statsAvgDurationSubtitle) {
      statsAvgDurationSubtitle.textContent = 'per audit';
    }
  }
}

