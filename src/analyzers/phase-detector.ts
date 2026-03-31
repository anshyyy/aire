import { PLANNING_KEYWORDS, IMPLEMENTATION_KEYWORDS, REVIEW_KEYWORDS, DEBUGGING_KEYWORDS, TESTING_KEYWORDS } from '../config/defaults.js';
import { matchesAny, hasCodeBlocks } from '../utils/text-analysis.js';
import type { Session, Message } from '../types/transcript.js';
import type { PhaseEntry, PhaseType } from '../types/metrics.js';

const PHASE_RULES: { type: PhaseType; keywords: string[]; checkCodeBlocks?: boolean }[] = [
  { type: 'planning', keywords: PLANNING_KEYWORDS },
  { type: 'testing', keywords: TESTING_KEYWORDS },
  { type: 'debugging', keywords: DEBUGGING_KEYWORDS },
  { type: 'review', keywords: REVIEW_KEYWORDS },
  { type: 'implementation', keywords: IMPLEMENTATION_KEYWORDS, checkCodeBlocks: true },
];

export function detectPhases(session: Session): PhaseEntry[] {
  const phases: PhaseEntry[] = [];

  for (let i = 0; i < session.messages.length; i++) {
    const message = session.messages[i];
    if (message.role !== 'user') continue;

    const phase = classifyMessage(message);
    if (phase) {
      phases.push({
        type: phase.type,
        messageIndex: i,
        timestamp: message.timestamp,
        confidence: phase.confidence,
      });
    }
  }

  return phases;
}

function classifyMessage(message: Message): { type: PhaseType; confidence: number } | null {
  const text = message.content;
  let bestMatch: { type: PhaseType; confidence: number } | null = null;
  let bestScore = 0;

  for (const rule of PHASE_RULES) {
    let score = 0;

    if (matchesAny(text, rule.keywords)) {
      score += 1;
    }

    if (rule.checkCodeBlocks && hasCodeBlocks(text)) {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        type: rule.type,
        confidence: Math.min(0.9, 0.5 + score * 0.2),
      };
    }
  }

  // Default: if message contains code blocks but no other signal, it's implementation
  if (!bestMatch && hasCodeBlocks(text)) {
    return { type: 'implementation', confidence: 0.4 };
  }

  return bestMatch;
}

export function getPhaseFlow(phases: PhaseEntry[]): string {
  if (phases.length === 0) return 'No phases detected';

  const uniquePhases: PhaseType[] = [];
  for (const phase of phases) {
    if (uniquePhases[uniquePhases.length - 1] !== phase.type) {
      uniquePhases.push(phase.type);
    }
  }

  return uniquePhases.join(' -> ');
}
