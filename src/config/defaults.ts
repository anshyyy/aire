export const METRIC_WEIGHTS = {
  contextQuality: 0.20,
  iterativeRefinement: 0.20,
  problemDecomposition: 0.15,
  criticalThinking: 0.20,
  collaborationPattern: 0.15,
  specificationClarity: 0.10,
} as const;

export const REQUIREMENT_KEYWORDS = [
  'need to', 'want to', 'must', 'should', 'require', 'requirement',
  'has to', 'needs to', 'wants to', 'expecting', 'expected',
];

export const CONSTRAINT_KEYWORDS = [
  'production', 'performance', 'scalable', 'scalability', 'latency',
  'throughput', 'memory', 'deadline', 'budget', 'limit', 'constraint',
  'million', 'thousand', 'concurrent', 'real-time', 'realtime',
];

export const TECH_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express',
  'fastify', 'node', 'deno', 'bun', 'typescript', 'javascript',
  'python', 'django', 'flask', 'fastapi', 'go', 'golang', 'rust',
  'java', 'spring', 'kotlin', 'swift', 'swiftui', 'postgresql',
  'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'kafka',
  'rabbitmq', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
  'graphql', 'rest', 'grpc', 'websocket', 'prisma', 'drizzle',
  'knex', 'sequelize', 'tailwind', 'css', 'sass', 'webpack', 'vite',
  'jest', 'vitest', 'mocha', 'cypress', 'playwright',
];

export const EXISTING_CODE_KEYWORDS = [
  'currently', 'existing', 'already', "here's our", "here is our",
  'we have', 'our current', 'the current', 'right now',
  'at the moment', 'as it stands',
];

export const PUSHBACK_PHRASES = [
  'but', 'however', 'wait', 'actually', 'instead', "that's not",
  'not quite', 'not exactly', 'no,', 'nah', 'rather',
  'change the', 'modify', 'different approach',
];

export const MODIFICATION_REQUESTS = [
  'can you also', 'can you change', 'can you add', 'can you remove',
  'update', 'modify', 'refactor', 'rewrite', 'fix this',
  'change this', 'adjust', 'tweak', 'instead of',
];

export const CONCERN_KEYWORDS = [
  'worried about', 'concern', 'security', 'performance', 'injection',
  'vulnerability', 'edge case', 'race condition', 'memory leak',
  'scalability', 'bottleneck', 'risk', 'careful',
];

export const QUESTIONING_PHRASES = [
  "won't that", 'what about', 'are you sure', 'is that the best',
  'why not', 'alternative', 'better way', 'what if',
  'could we instead', 'have you considered',
];

export const ALTERNATIVE_PHRASES = [
  'better way', 'which do you recommend', 'pros and cons',
  'trade-off', 'tradeoff', 'alternative', 'other approach',
  'what other', 'options',
];

export const REJECTION_PHRASES = [
  'no', "that's not right", "that won't work", 'incorrect',
  'wrong', 'this breaks', 'revert', "doesn't work", 'broken',
];

export const DESIGN_HELP_PHRASES = [
  'help me think', 'what approach', 'how should', 'architecture',
  'design', 'structure', 'best practice', 'pattern',
  'how would you', 'what do you think',
];

export const DIRECTION_PHRASES = [
  "let's go with", 'i want', 'we should', 'let me', "i'd like",
  "i'll", 'my preference', 'i prefer', "let's use",
];

export const DEMANDING_PHRASES = [
  'just give me', 'just fix it', 'just write', 'just do it',
  'just make', 'give me the code', 'write a function',
];

export const PLANNING_KEYWORDS = [
  'plan', 'design', 'think through', 'approach', 'architecture',
  'before we start', "let's design", 'strategy', 'outline',
];

export const TESTING_KEYWORDS = [
  'test', 'assert', 'describe(', 'it(', 'jest', 'vitest',
  'spec', 'expect(', 'mock', 'stub',
];

export const DEBUGGING_KEYWORDS = [
  'bug', 'fix', 'error', 'broken', "doesn't work", 'cors',
  'undefined', 'null', 'crash', 'exception', 'stack trace',
  'not working', 'fails', 'issue',
];

export const REVIEW_KEYWORDS = [
  'looks good', 'refactor', 'improve', 'optimize', 'clean up',
  'code review', 'better', 'simplify',
];

export const IMPLEMENTATION_KEYWORDS = [
  'implement', 'build', 'create', 'write', 'add', 'develop',
  'set up', 'setup', 'configure', 'install',
];

export const STEPPED_FLOW_KEYWORDS = [
  'step 1', 'step 2', 'first', 'then', 'next', 'after that',
  'finally', 'second', 'third', 'phase 1', 'phase 2',
];

export const SEPARATION_KEYWORDS = [
  'middleware', 'validator', 'module', 'component', 'service',
  'controller', 'repository', 'layer', 'separate', 'decouple',
];

export function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
