import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, REQUIREMENT_KEYWORDS, CONSTRAINT_KEYWORDS, TECH_KEYWORDS, EXISTING_CODE_KEYWORDS, clamp } from '../config/defaults.js';
import { matchesAny } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class ContextQualityAnalyzer extends MetricAnalyzer {
  readonly name = 'Context Quality';
  readonly slug = 'context-quality';
  readonly weight = METRIC_WEIGHTS.contextQuality;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 30;

    if (userMessages.length === 0) {
      return this.emptyResult(session);
    }

    const firstMessage = userMessages[0];

    // First message length
    if (firstMessage.charCount > 500) {
      score += 25;
      signals.push({ type: 'positive', description: 'Detailed first message (500+ chars)', points: 25 });
    } else if (firstMessage.charCount > 200) {
      score += 15;
      signals.push({ type: 'positive', description: 'Good first message length (200+ chars)', points: 15 });
    }

    // Penalty for very short first message
    if (firstMessage.charCount < 50) {
      score = Math.min(score, 25);
      signals.push({ type: 'negative', description: 'Very short first message (<50 chars)', points: -5, evidence: firstMessage.content.slice(0, 80) });
    }

    // Code blocks across all user messages
    const hasBlocks = userMessages.some(m => m.hasCodeBlocks);
    if (hasBlocks) {
      score += 15;
      signals.push({ type: 'positive', description: 'Included code blocks for context', points: 15 });
    }

    // Requirements keywords
    const allUserText = userMessages.map(m => m.content).join(' ');
    if (matchesAny(allUserText, REQUIREMENT_KEYWORDS)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Stated clear requirements', points: 10 });
    }

    // Constraints
    if (matchesAny(allUserText, CONSTRAINT_KEYWORDS)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Mentioned constraints or performance requirements', points: 10 });
    }

    // Tech stack references
    if (matchesAny(allUserText, TECH_KEYWORDS)) {
      score += 5;
      signals.push({ type: 'positive', description: 'Named specific technologies', points: 5 });
    }

    // References to existing code
    if (matchesAny(allUserText, EXISTING_CODE_KEYWORDS)) {
      score += 5;
      signals.push({ type: 'positive', description: 'Referenced existing codebase', points: 5 });
    }

    score = clamp(score, 0, 100);

    return {
      name: this.name,
      slug: this.slug,
      score,
      weight: this.weight,
      weightedScore: score * this.weight,
      confidence: calculateConfidence(session.messages),
      signals,
      suggestions: this.getSuggestions(signals, userMessages),
    };
  }

  private getSuggestions(signals: Signal[], userMessages: { charCount: number; hasCodeBlocks: boolean }[]): string[] {
    const suggestions: string[] = [];
    const hasNegative = signals.some(s => s.type === 'negative');
    const hasCodeBlocks = userMessages.some(m => m.hasCodeBlocks);

    if (hasNegative) {
      suggestions.push('Start with a detailed description of what you want to achieve');
    }
    if (!hasCodeBlocks) {
      suggestions.push('Include relevant code snippets for better AI understanding');
    }
    if (!signals.some(s => s.description.includes('constraints'))) {
      suggestions.push('Mention performance constraints or production requirements');
    }
    return suggestions;
  }

  private emptyResult(session: Session): MetricResult {
    return {
      name: this.name,
      slug: this.slug,
      score: 0,
      weight: this.weight,
      weightedScore: 0,
      confidence: 0,
      signals: [{ type: 'neutral', description: 'No user messages found', points: 0 }],
      suggestions: ['Provide context to the AI about what you want to achieve'],
    };
  }
}
