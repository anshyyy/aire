import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, PUSHBACK_PHRASES, MODIFICATION_REQUESTS, clamp } from '../config/defaults.js';
import { matchesAny, countQuestions } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class IterativeRefinementAnalyzer extends MetricAnalyzer {
  readonly name = 'Iterative Refinement';
  readonly slug = 'iterative-refinement';
  readonly weight = METRIC_WEIGHTS.iterativeRefinement;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 20;

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const exchangeCount = userMessages.length;
    let hasPushback = false;

    // Exchange count
    if (exchangeCount >= 5) {
      score += 25;
      signals.push({ type: 'positive', description: `Deep conversation (${exchangeCount} exchanges)`, points: 25 });
    } else if (exchangeCount >= 3) {
      score += 15;
      signals.push({ type: 'positive', description: `Multiple exchanges (${exchangeCount})`, points: 15 });
    }

    // Pushback detection
    const allUserText = userMessages.map(m => m.content).join(' ');
    if (matchesAny(allUserText, PUSHBACK_PHRASES)) {
      score += 15;
      hasPushback = true;
      signals.push({ type: 'positive', description: 'Pushed back on AI suggestions', points: 15 });
    }

    // Questions asked
    const totalQuestions = userMessages.reduce((sum, m) => sum + countQuestions(m.content), 0);
    if (totalQuestions >= 2) {
      score += 15;
      signals.push({ type: 'positive', description: `Asked ${totalQuestions} follow-up questions`, points: 15 });
    }

    // Modification requests
    if (matchesAny(allUserText, MODIFICATION_REQUESTS)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Requested modifications to AI output', points: 10 });
    }

    // Penalty: few exchanges with no pushback
    if (exchangeCount <= 2 && !hasPushback) {
      score = Math.min(score, 30);
      signals.push({ type: 'negative', description: 'Minimal back-and-forth with no pushback', points: -10 });
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
      suggestions: this.getSuggestions(signals, exchangeCount, hasPushback),
    };
  }

  private getSuggestions(signals: Signal[], exchanges: number, hasPushback: boolean): string[] {
    const suggestions: string[] = [];
    if (exchanges <= 2) suggestions.push('Engage in more back-and-forth to refine the output');
    if (!hasPushback) suggestions.push('Review AI output critically and push back when needed');
    if (!signals.some(s => s.description.includes('questions'))) {
      suggestions.push('Ask follow-up questions about the AI\'s approach');
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
      suggestions: ['Review and iterate on AI output rather than accepting it as-is'],
    };
  }
}
