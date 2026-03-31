import { MetricAnalyzer } from './base-analyzer.js';
import { METRIC_WEIGHTS, TECH_KEYWORDS, clamp } from '../config/defaults.js';
import { matchesAny, hasStructuredLists, hasQuantifiedConstraints, hasSpecificInterfaces } from '../utils/text-analysis.js';
import { calculateConfidence } from '../utils/confidence.js';
import type { Session } from '../types/transcript.js';
import type { MetricResult, Signal } from '../types/metrics.js';

export class SpecificationClarityAnalyzer extends MetricAnalyzer {
  readonly name = 'Specification Clarity';
  readonly slug = 'specification-clarity';
  readonly weight = METRIC_WEIGHTS.specificationClarity;

  analyze(session: Session): MetricResult {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const signals: Signal[] = [];
    let score = 25;

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const allUserText = userMessages.map(m => m.content).join('\n');
    const firstMessage = userMessages[0];

    // Quantified constraints
    if (hasQuantifiedConstraints(allUserText)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Included quantified constraints (numbers, sizes, limits)', points: 15 });
    }

    // Structured lists
    if (hasStructuredLists(allUserText)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Used structured lists (bullets or numbers)', points: 15 });
    }

    // Edge cases
    const edgeCasePhrases = [
      'what if null', 'when empty', 'edge case', 'what happens when',
      'what if the', 'handle the case', 'corner case', 'error case',
    ];
    if (matchesAny(allUserText, edgeCasePhrases)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Mentioned edge cases', points: 10 });
    }

    // Specific interfaces
    if (hasSpecificInterfaces(allUserText)) {
      score += 15;
      signals.push({ type: 'positive', description: 'Specified exact API interfaces', points: 15 });
    }

    // Tech stack naming
    if (matchesAny(allUserText, TECH_KEYWORDS)) {
      score += 10;
      signals.push({ type: 'positive', description: 'Named specific technologies', points: 10 });
    }

    // Long first message
    if (firstMessage.charCount > 400) {
      score += 10;
      signals.push({ type: 'positive', description: 'Thorough first message (400+ chars)', points: 10 });
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
    if (!signals.some(s => s.description.includes('quantified'))) {
      suggestions.push('Include specific numbers (e.g., "2M rows", "100ms timeout")');
    }
    if (!signals.some(s => s.description.includes('lists'))) {
      suggestions.push('Use bullet points or numbered lists for requirements');
    }
    if (!signals.some(s => s.description.includes('edge'))) {
      suggestions.push('Consider and mention edge cases upfront');
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
      suggestions: ['Provide clear, detailed specifications with measurable constraints'],
    };
  }
}
