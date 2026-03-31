import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, DESIGN_HELP_PHRASES, DIRECTION_PHRASES, DEMANDING_PHRASES, clamp } from '../config/defaults.js';
import { matchesAny, countQuestions } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class CollaborationPatternAnalyzer extends MetricAnalyzer {
  readonly name = 'Collaboration Pattern';
  readonly slug = 'collaboration-pattern';
  readonly weight = METRIC_WEIGHTS.collaborationPattern;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 30;

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const allUserText = userMessages.map(m => m.content).join(' ');

    // Design help
    if (matchesAny(allUserText, DESIGN_HELP_PHRASES)) {
      score += 25;
      signals.push({ type: 'positive', description: 'Asked for design/architecture help', points: 25 });
    }

    // Building on AI response
    const buildingPhrases = [
      'this looks good', 'good, but', 'solid', 'nice,', 'great,',
      'before you continue', 'also add', 'one more thing',
    ];
    if (matchesAny(allUserText, buildingPhrases)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Built incrementally on AI responses', points: 15 });
    }

    // Providing direction
    if (matchesAny(allUserText, DIRECTION_PHRASES)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Provided clear direction and preferences', points: 15 });
    }

    // Demanding raw code (negative)
    if (matchesAny(allUserText, DEMANDING_PHRASES)) {
      score -= 20;
      signals.push({ type: 'negative', description: 'Demanded raw code without discussion', points: -20 });
    }

    // 4+ exchanges with questions
    const totalQuestions = userMessages.reduce((sum, m) => sum + countQuestions(m.content), 0);
    if (userMessages.length >= 4 && totalQuestions >= 2) {
      score += 10;
      signals.push({ type: 'positive', description: 'Extended collaborative dialogue with questions', points: 10 });
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
    if (signals.some(s => s.description.includes('Demanded'))) {
      suggestions.push('Treat AI as a thinking partner, not a code generator');
    }
    if (!signals.some(s => s.description.includes('design'))) {
      suggestions.push('Ask the AI to help think through design decisions');
    }
    if (!signals.some(s => s.description.includes('direction'))) {
      suggestions.push('Provide clear direction and state your preferences');
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
      suggestions: ['Engage with AI as a collaborative partner'],
    };
  }
}
