import chalk from 'chalk';
import { getPhaseFlow } from '../analyzers/phase-detector.js';
import type { Report, MetricResult, PhaseEntry } from '../types/metrics.js';

const BAR_WIDTH = 30;

function scoreBar(score: number): string {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return bar;
}

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.hex('#FFA500'); // orange
  return chalk.red;
}

function confidenceBadge(confidence: number): string {
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.7) return chalk.green(`[${pct}% confidence]`);
  if (confidence >= 0.5) return chalk.yellow(`[${pct}% confidence]`);
  return chalk.red(`[${pct}% confidence]`);
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green.bold(grade);
    case 'B': return chalk.green(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.hex('#FFA500')(grade);
    case 'F': return chalk.red.bold(grade);
    default: return grade;
  }
}

export function renderTerminalReport(report: Report, verbose = false): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('  AIRE — AI Report for Engineers'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push('');

  if (report.engineer) {
    lines.push(`  ${chalk.bold('Engineer:')}  ${report.engineer}`);
  }
  lines.push(`  ${chalk.bold('Source:')}    ${report.source}`);
  lines.push(`  ${chalk.bold('Sessions:')}  ${report.sessionCount}`);
  lines.push(`  ${chalk.bold('Messages:')} ${report.totalMessages} total, ${report.totalUserMessages} from user`);
  lines.push(`  ${chalk.bold('Generated:')} ${report.generatedAt.toLocaleString()}`);
  lines.push('');

  // Overall Score
  const color = scoreColor(report.overallScore);
  lines.push(chalk.bold('  OVERALL SCORE'));
  lines.push(`  ${scoreBar(report.overallScore)} ${color(report.overallScore.toFixed(1))}${chalk.gray('/100')} ${gradeColor(report.grade)}`);
  lines.push(`  ${confidenceBadge(report.overallConfidence)}`);
  lines.push('');
  lines.push(chalk.gray('  ─────────────────────────────────────────────────────────────'));
  lines.push('');

  // Individual Metrics
  for (const metric of report.metrics) {
    renderMetric(lines, metric, verbose);
  }

  // Phase Timeline
  if (report.phaseTimeline.length > 0) {
    lines.push(chalk.bold('  WORKFLOW PHASES'));
    lines.push(`  ${chalk.cyan(getPhaseFlow(report.phaseTimeline))}`);
    lines.push('');

    const phaseCounts = countPhases(report.phaseTimeline);
    for (const [phase, count] of Object.entries(phaseCounts)) {
      lines.push(`  ${chalk.gray('•')} ${phase}: ${count} occurrence${count > 1 ? 's' : ''}`);
    }
    lines.push('');
  }

  // Cross-session comparison
  if (report.crossSessionComparison) {
    const cs = report.crossSessionComparison;
    lines.push(chalk.gray('  ─────────────────────────────────────────────────────────────'));
    lines.push('');
    lines.push(chalk.bold('  CROSS-SESSION COMPARISON'));
    lines.push('');

    for (const session of cs.sessionScores) {
      const sColor = scoreColor(session.score);
      lines.push(`  ${chalk.gray(session.sessionId.slice(0, 8))}  ${scoreBar(session.score)} ${sColor(session.score.toFixed(1))}`);
    }
    lines.push('');

    const trendIcon = cs.trend === 'improving' ? chalk.green('↑') : cs.trend === 'declining' ? chalk.red('↓') : chalk.yellow('→');
    lines.push(`  ${chalk.bold('Trend:')} ${trendIcon} ${cs.trend}`);
    lines.push(`  ${chalk.bold('Consistency:')} ${cs.consistencyIndex.toFixed(1)} ${chalk.gray('(lower = more consistent)')}`);
    lines.push('');
  }

  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push('');

  return lines.join('\n');
}

function renderMetric(lines: string[], metric: MetricResult, verbose: boolean): void {
  const color = scoreColor(metric.score);
  const weightPct = Math.round(metric.weight * 100);

  lines.push(`  ${chalk.bold(metric.name)} ${chalk.gray(`(${weightPct}% weight)`)}`);
  lines.push(`  ${scoreBar(metric.score)} ${color(metric.score.toFixed(0))}${chalk.gray('/100')} ${confidenceBadge(metric.confidence)}`);

  // Show signals
  const signals = verbose ? metric.signals : metric.signals.slice(0, 3);
  for (const signal of signals) {
    const icon = signal.type === 'positive' ? chalk.green('+') : signal.type === 'negative' ? chalk.red('-') : chalk.gray('•');
    lines.push(`    ${icon} ${signal.description}`);
    if (verbose && signal.evidence) {
      lines.push(`      ${chalk.gray('"' + signal.evidence + '"')}`);
    }
  }

  // Show suggestions
  if (metric.suggestions.length > 0 && metric.score < 70) {
    const suggestion = metric.suggestions[0];
    lines.push(`    ${chalk.yellow('→')} ${chalk.yellow(suggestion)}`);
  }

  lines.push('');
}

function countPhases(phases: PhaseEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const phase of phases) {
    counts[phase.type] = (counts[phase.type] ?? 0) + 1;
  }
  return counts;
}
