import type { Message } from '../types/transcript.js';

export function calculateConfidence(messages: Message[]): number {
  const userMessages = messages.filter(m => m.role === 'user');
  const totalMessages = messages.length;
  const userCount = userMessages.length;

  // More messages = higher confidence
  // 1-2 user messages: low confidence (0.3-0.4)
  // 3-5: moderate (0.5-0.7)
  // 6-10: good (0.7-0.85)
  // 10+: high (0.85-0.95)
  let confidence = 0.3;

  if (userCount >= 2) confidence += 0.1;
  if (userCount >= 3) confidence += 0.1;
  if (userCount >= 5) confidence += 0.15;
  if (userCount >= 8) confidence += 0.1;
  if (userCount >= 12) confidence += 0.1;
  if (totalMessages >= 10) confidence += 0.05;
  if (totalMessages >= 20) confidence += 0.05;

  return Math.min(0.95, confidence);
}
