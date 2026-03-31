import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, CONCERN_KEYWORDS, QUESTIONING_PHRASES, ALTERNATIVE_PHRASES, REJECTION_PHRASES, clamp } from '../config/defaults.js';
import { matchesAny, countQuestions } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class CriticalThinkingAnalyzer extends MetricAnalyzer {
  readonly name = 'Critical Thinking';
  readonly slug = 'critical-thinking';
  readonly weight = METRIC_WEIGHTS.criticalThinking;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 20;

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const allUserText = userMessages.map(m => m.content).join(' ');
    let hasConcerns = false;
    let hasQuestions = false;

    // Concern-raising
    if (matchesAny(allUserText, CONCERN_KEYWORDS)) {
      score += 25;
      hasConcerns = true;
      signals.push({ type: 'positive', description: 'Raised concerns about security, performance, or edge cases', points: 25 });
    }

    // Questioning AI's suggestions
    if (matchesAny(allUserText, QUESTIONING_PHRASES)) {
      score += 20;
      hasQuestions = true;
      signals.push({ type: 'positive', description: 'Questioned AI suggestions or approach', points: 20 });
    }

    // Asking for alternatives
    if (matchesAny(allUserText, ALTERNATIVE_PHRASES)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Asked for alternative approaches or trade-offs', points: 15 });
    }

    // Rejecting output
    if (matchesAny(allUserText, REJECTION_PHRASES)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Rejected or corrected AI output', points: 10 });
    }

    // Penalty: no concerns AND no questions
    if (!hasConcerns && !hasQuestions) {
      const totalQuestions = userMessages.reduce((sum, m) => sum + countQuestions(m.content), 0);
      if (totalQuestions === 0) {
        score = Math.min(score, 30);
        signals.push({ type: 'negative', description: 'No concerns raised and no questions asked', points: -10 });
      }
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
      suggestions: this.getSuggestions(hasConcerns, hasQuestions),
    };
  }

  private getSuggestions(hasConcerns: boolean, hasQuestions: boolean): string[] {
    const suggestions: string[] = [];
    if (!hasConcerns) suggestions.push('Consider security, performance, and edge case implications');
    if (!hasQuestions) suggestions.push('Question the AI\'s approach — ask "why this way?"');
    suggestions.push('Ask about trade-offs between different approaches');
    return suggestions;
  }

  private emptyResult(): MetricResult {
    return {
      name: this.name,
      slug: this.slug,
      score: 0,
      weight: this.weight,
      weightedScore: 0,
      confidence: 0,
      signals: [{ type: 'neutral', description: 'No user messages found', points: 0 }],
      suggestions: ['Apply critical thinking to AI suggestions before accepting'],
    };
  }
}
