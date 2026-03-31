const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const QUESTION_REGEX = /\?/g;
const BULLET_REGEX = /^[\s]*[-*]\s/gm;
const NUMBERED_LIST_REGEX = /^[\s]*\d+[.)]\s/gm;
const NUMBER_WITH_UNIT_REGEX = /\b\d+[\s]*(ms|seconds?|minutes?|hours?|days?|rows?|records?|users?|requests?|MB|GB|TB|KB|endpoints?|%)\b/gi;
const INTERFACE_REGEX = /(GET|POST|PUT|PATCH|DELETE)\s+\/[\w/:.-]+/gi;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function countCodeBlocks(text: string): number {
  const matches = text.match(CODE_BLOCK_REGEX);
  return matches ? matches.length : 0;
}

export function hasCodeBlocks(text: string): boolean {
  return CODE_BLOCK_REGEX.test(text);
}

export function countQuestions(text: string): number {
  const matches = text.match(QUESTION_REGEX);
  return matches ? matches.length : 0;
}

export function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some(phrase => lower.includes(phrase.toLowerCase()));
}

export function countMatches(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  return phrases.filter(phrase => lower.includes(phrase.toLowerCase())).length;
}

export function hasStructuredLists(text: string): boolean {
  return BULLET_REGEX.test(text) || NUMBERED_LIST_REGEX.test(text);
}

export function hasQuantifiedConstraints(text: string): boolean {
  return NUMBER_WITH_UNIT_REGEX.test(text);
}

export function hasSpecificInterfaces(text: string): boolean {
  return INTERFACE_REGEX.test(text);
}

export function countExchanges(userMessages: { role: string }[]): number {
  return userMessages.filter(m => m.role === 'user').length;
}
