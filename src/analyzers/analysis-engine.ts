import { ContextQualityAnalyzer } from './context-quality.analyzer.js';
import { IterativeRefinementAnalyzer } from './iterative-refinement.analyzer.js';
import { ProblemDecompositionAnalyzer } from './problem-decomposition.analyzer.js';
import { CriticalThinkingAnalyzer } from './critical-thinking.analyzer.js';
import { CollaborationPatternAnalyzer } from './collaboration-pattern.analyzer.js';
import { SpecificationClarityAnalyzer } from './specification-clarity.analyzer.js';
import { detectPhases } from './phase-detector.js';
import { scoreToGrade } from '../config/defaults.js';
import type { MetricAnalyzer } from './base-analyzer.js';
import type { Session } from '../types/transcript.js';
import type { Transcript } from '../types/transcript.js';
import type { Report, MetricResult, CrossSessionComparison } from '../types/metrics.js';

const analyzers: MetricAnalyzer[] = [
  new ContextQualityAnalyzer(),
  new IterativeRefinementAnalyzer(),
  new ProblemDecompositionAnalyzer(),
  new CriticalThinkingAnalyzer(),
  new CollaborationPatternAnalyzer(),
  new SpecificationClarityAnalyzer(),
];

export function analyzeSession(session: Session): MetricResult[] {
  return analyzers.map(analyzer => analyzer.analyze(session));
}

export function generateReport(transcript: Transcript, engineer?: string): Report {
  // Analyze each session
  const allMetrics: MetricResult[][] = [];
  for (const session of transcript.sessions) {
    allMetrics.push(analyzeSession(session));
  }

  // Average metrics across sessions
  const avgMetrics = averageMetrics(allMetrics);

  // Calculate overall score
  const overallScore = avgMetrics.reduce((sum, m) => sum + m.weightedScore, 0);
  const overallConfidence = avgMetrics.reduce((sum, m) => sum + m.confidence * m.weight, 0);

  // Detect phases from all sessions
  const allPhases = transcript.sessions.flatMap(s => detectPhases(s));

  // Total message counts
  const totalMessages = transcript.sessions.reduce((sum, s) => sum + s.messages.length, 0);
  const totalUserMessages = transcript.sessions.reduce(
    (sum, s) => sum + s.messages.filter(m => m.role === 'user').length,
    0,
  );

  // Cross-session comparison if multiple sessions
  const crossSession = transcript.sessions.length > 1
    ? computeCrossSessionComparison(transcript.sessions, allMetrics)
    : undefined;

  return {
    engineer,
    generatedAt: new Date(),
    source: transcript.source,
    filePath: transcript.filePath,
    sessionCount: transcript.sessions.length,
    totalMessages,
    totalUserMessages,
    overallScore: Math.round(overallScore * 10) / 10,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    grade: scoreToGrade(overallScore),
    metrics: avgMetrics,
    phaseTimeline: allPhases,
    crossSessionComparison: crossSession,
  };
}

function averageMetrics(allMetrics: MetricResult[][]): MetricResult[] {
  if (allMetrics.length === 0) return [];
  if (allMetrics.length === 1) return allMetrics[0];

  const metricCount = allMetrics[0].length;
  const averaged: MetricResult[] = [];

  for (let i = 0; i < metricCount; i++) {
    const metricsAtIndex = allMetrics.map(m => m[i]);
    const avgScore = metricsAtIndex.reduce((s, m) => s + m.score, 0) / metricsAtIndex.length;
    const avgConfidence = metricsAtIndex.reduce((s, m) => s + m.confidence, 0) / metricsAtIndex.length;
    const base = metricsAtIndex[0];

    // Merge all signals from all sessions
    const allSignals = metricsAtIndex.flatMap(m => m.signals);
    // Deduplicate signals by description
    const uniqueSignals = allSignals.filter(
      (signal, idx, arr) => arr.findIndex(s => s.description === signal.description) === idx,
    );

    // Merge suggestions
    const allSuggestions = [...new Set(metricsAtIndex.flatMap(m => m.suggestions))];

    const score = Math.round(avgScore * 10) / 10;
    averaged.push({
      name: base.name,
      slug: base.slug,
      score,
      weight: base.weight,
      weightedScore: Math.round(score * base.weight * 10) / 10,
      confidence: Math.round(avgConfidence * 100) / 100,
      signals: uniqueSignals,
      suggestions: allSuggestions,
    });
  }

  return averaged;
}

function computeCrossSessionComparison(
  sessions: Session[],
  allMetrics: MetricResult[][],
): CrossSessionComparison {
  const sessionScores = sessions.map((session, i) => ({
    sessionId: session.id,
    score: allMetrics[i].reduce((sum, m) => sum + m.weightedScore, 0),
    date: session.startTime,
  }));

  // Per-metric averages and ranges
  const perMetricAverages: Record<string, number> = {};
  const perMetricRanges: Record<string, { min: number; max: number }> = {};

  if (allMetrics.length > 0) {
    for (let i = 0; i < allMetrics[0].length; i++) {
      const slug = allMetrics[0][i].slug;
      const scores = allMetrics.map(m => m[i].score);
      perMetricAverages[slug] = scores.reduce((a, b) => a + b, 0) / scores.length;
      perMetricRanges[slug] = {
        min: Math.min(...scores),
        max: Math.max(...scores),
      };
    }
  }

  // Consistency index: average range across all metrics (lower = more consistent)
  const ranges = Object.values(perMetricRanges).map(r => r.max - r.min);
  const consistencyIndex = ranges.length > 0
    ? ranges.reduce((a, b) => a + b, 0) / ranges.length
    : 0;

  // Trend: compare first half vs second half
  const sortedScores = [...sessionScores].sort((a, b) => a.date.getTime() - b.date.getTime());
  const mid = Math.floor(sortedScores.length / 2);
  const firstHalf = sortedScores.slice(0, mid);
  const secondHalf = sortedScores.slice(mid);

  const firstAvg = firstHalf.reduce((s, x) => s + x.score, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, x) => s + x.score, 0) / (secondHalf.length || 1);

  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (secondAvg - firstAvg > 5) trend = 'improving';
  else if (firstAvg - secondAvg > 5) trend = 'declining';

  return {
    sessionScores,
    perMetricAverages,
    perMetricRanges,
    consistencyIndex: Math.round(consistencyIndex * 10) / 10,
    trend,
  };
}
