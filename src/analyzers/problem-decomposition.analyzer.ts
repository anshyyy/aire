import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, PLANNING_KEYWORDS, STEPPED_FLOW_KEYWORDS, SEPARATION_KEYWORDS, REQUIREMENT_KEYWORDS, clamp } from '../config/defaults.js';
import { matchesAny } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class ProblemDecompositionAnalyzer extends MetricAnalyzer {
  readonly name = 'Problem Decomposition';
  readonly slug = 'problem-decomposition';
  readonly weight = METRIC_WEIGHTS.problemDecomposition;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 25;

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const allUserText = userMessages.map(m => m.content).join(' ');
    const firstMessage = userMessages[0];

    // Planning before coding
    if (matchesAny(allUserText, PLANNING_KEYWORDS)) {
      score += 25;
      signals.push({ type: 'positive', description: 'Discussed planning or design before implementation', points: 25 });
    }

    // Stepped flow
    if (matchesAny(allUserText, STEPPED_FLOW_KEYWORDS)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Used sequential/stepped approach', points: 15 });
    }

    // Separation of concerns
    if (matchesAny(allUserText, SEPARATION_KEYWORDS)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Separated concerns across components/modules', points: 15 });
    }

    // Multiple exchanges (incremental approach)
    if (userMessages.length >= 4) {
      score += 10;
      signals.push({ type: 'positive', description: 'Incremental approach with multiple exchanges', points: 10 });
    }

    // Long first message with requirements
    if (firstMessage.charCount > 200 && matchesAny(firstMessage.content, REQUIREMENT_KEYWORDS)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Comprehensive first message with clear requirements', points: 10 });
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
      suggestions: this.getSuggestions(signals),
    };
  }

  private getSuggestions(signals: Signal[]): string[] {
    const suggestions: string[] = [];
    if (!signals.some(s => s.description.includes('planning'))) {
      suggestions.push('Start by discussing the approach before jumping into code');
    }
    if (!signals.some(s => s.description.includes('sequential'))) {
      suggestions.push('Break work into numbered steps or phases');
    }
    if (!signals.some(s => s.description.includes('concerns'))) {
      suggestions.push('Discuss different components/modules separately');
    }
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
      suggestions: ['Break complex problems into smaller, manageable steps'],
    };
  }
}
