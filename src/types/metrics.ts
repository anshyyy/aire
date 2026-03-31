export interface Signal {
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  evidence?: string;
  points: number;
}

export interface MetricResult {
  name: string;
  slug: string;
  score: number;
  weight: number;
  weightedScore: number;
  confidence: number;
  signals: Signal[];
  suggestions: string[];
}

export type PhaseType = 'planning' | 'implementation' | 'review' | 'debugging' | 'testing';

export interface PhaseEntry {
  type: PhaseType;
  messageIndex: number;
  timestamp: Date;
  confidence: number;
}

export interface CrossSessionComparison {
  sessionScores: { sessionId: string; score: number; date: Date }[];
  perMetricAverages: Record<string, number>;
  perMetricRanges: Record<string, { min: number; max: number }>;
  consistencyIndex: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface Report {
  engineer?: string;
  generatedAt: Date;
  source: string;
  filePath: string;
  sessionCount: number;
  totalMessages: number;
  totalUserMessages: number;
  overallScore: number;
  overallConfidence: number;
  grade: string;
  metrics: MetricResult[];
  phaseTimeline: PhaseEntry[];
  crossSessionComparison?: CrossSessionComparison;
}
