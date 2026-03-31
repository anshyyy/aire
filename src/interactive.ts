import { select, checkbox, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { discoverClaudeCodeSessions, type DiscoveredSession } from './utils/file-discovery.js';
import { getParser } from './parsers/parser-registry.js';
import { generateReport } from './analyzers/analysis-engine.js';
import { renderTerminalReport } from './reporters/terminal-reporter.js';
import { renderJsonReport } from './reporters/json-reporter.js';
import type { Session, Transcript } from './types/transcript.js';

export async function runInteractive(): Promise<void> {
  console.log('');
  console.log(chalk.bold.cyan('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║   AIRE — AI Report for Engineers      ║'));
  console.log(chalk.bold.cyan('  ╚═══════════════════════════════════════╝'));
  console.log('');

  let shouldContinue = true;

  while (shouldContinue) {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: '🔍  Analyze transcripts', value: 'analyze' },
        { name: '📂  Browse & pick sessions from ~/.claude/', value: 'discover' },
        { name: '📊  Compare sessions side-by-side', value: 'compare' },
        { name: '🚪  Exit', value: 'exit' },
      ],
    });

    switch (action) {
      case 'analyze':
        await interactiveAnalyze();
        break;
      case 'discover':
        await interactiveDiscover();
        break;
      case 'compare':
        await interactiveCompare();
        break;
      case 'exit':
        shouldContinue = false;
        console.log(chalk.gray('\n  Goodbye!\n'));
        break;
    }

    if (action !== 'exit') {
      shouldContinue = await confirm({ message: 'Do something else?', default: true });
    }
  }
}

async function interactiveAnalyze(): Promise<void> {
  const source = await select({
    message: 'Where are the transcripts?',
    choices: [
      { name: 'Pick from my Claude Code sessions', value: 'discover' },
      { name: 'Enter file path(s) manually', value: 'manual' },
    ],
  });

  let filePaths: string[];

  if (source === 'discover') {
    filePaths = await pickSessions('Select session(s) to analyze');
    if (filePaths.length === 0) return;
  } else {
    const pathInput = await input({
      message: 'Enter file path(s) (comma-separated or glob):',
      validate: (val) => val.trim().length > 0 || 'Please enter at least one path',
    });
    filePaths = pathInput.split(',').map(p => resolve(p.trim()));
  }

  const engineer = await input({
    message: 'Engineer name (optional, press Enter to skip):',
  });

  const verbose = await confirm({ message: 'Show detailed signals?', default: false });

  console.log('');
  console.log(chalk.cyan('  Analyzing...'));

  const report = await analyzeFiles(filePaths, engineer || undefined);
  console.log(renderTerminalReport(report, verbose));

  // Offer to save
  const save = await confirm({ message: 'Save report as JSON?', default: false });
  if (save) {
    const outputPath = await input({
      message: 'Output file path:',
      default: 'aire-report.json',
    });
    await writeFile(resolve(outputPath), renderJsonReport(report), 'utf-8');
    console.log(chalk.green(`\n  Saved to ${outputPath}\n`));
  }
}

async function interactiveDiscover(): Promise<void> {
  const sessions = await discoverClaudeCodeSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('\n  No Claude Code sessions found in ~/.claude/projects/\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold.cyan(`  Found ${sessions.length} session(s)\n`));

  const filePaths = await pickSessions('Select session(s) to analyze');
  if (filePaths.length === 0) {
    console.log(chalk.gray('  No sessions selected.\n'));
    return;
  }

  const engineer = await input({
    message: 'Engineer name (optional):',
  });

  console.log(chalk.cyan('\n  Analyzing...'));

  const report = await analyzeFiles(filePaths, engineer || undefined);
  console.log(renderTerminalReport(report, false));
}

async function interactiveCompare(): Promise<void> {
  console.log(chalk.gray('\n  Select 2 or more sessions to compare.\n'));

  const filePaths = await pickSessions('Select sessions to compare (2+ required)');

  if (filePaths.length < 2) {
    console.log(chalk.yellow('  Need at least 2 sessions to compare.\n'));
    return;
  }

  const engineer = await input({
    message: 'Engineer name (optional):',
  });

  console.log(chalk.cyan('\n  Comparing...'));

  const report = await analyzeFiles(filePaths, engineer || undefined);
  console.log(renderTerminalReport(report, true));
}

async function pickSessions(message: string): Promise<string[]> {
  const sessions = await discoverClaudeCodeSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('\n  No Claude Code sessions found.\n'));
    return [];
  }

  // Group by project for better UX
  const grouped = new Map<string, DiscoveredSession[]>();
  for (const session of sessions) {
    const project = session.project;
    if (!grouped.has(project)) grouped.set(project, []);
    grouped.get(project)!.push(session);
  }

  // Build choices with project headers
  const choices: { name: string; value: string }[] = [];
  for (const [project, projectSessions] of grouped) {
    // Show up to 5 sessions per project
    for (const s of projectSessions.slice(0, 5)) {
      const sizeKB = Math.round(s.size / 1024);
      const date = s.modified.toLocaleDateString();
      const shortProject = project.split('/').slice(-2).join('/');
      choices.push({
        name: `${date}  ${s.sessionId.slice(0, 8)}...  ${chalk.gray(`${sizeKB}KB`)}  ${chalk.cyan(shortProject)}`,
        value: s.filePath,
      });
    }
  }

  // Sort by date (most recent first) — already sorted from discovery
  const selected = await checkbox({
    message,
    choices: choices.slice(0, 30), // Cap at 30 for readability
    pageSize: 15,
  });

  return selected;
}

async function analyzeFiles(filePaths: string[], engineer?: string) {
  const allSessions: Session[] = [];
  let source = 'claude-code';

  for (const filePath of filePaths) {
    const parser = getParser(filePath);
    const transcript = await parser.parse(filePath);
    source = transcript.source;
    allSessions.push(...transcript.sessions);
  }

  const combined: Transcript = {
    source: source as Transcript['source'],
    sessions: allSessions,
    filePath: filePaths.length === 1 ? filePaths[0] : `${filePaths.length} files`,
  };

  return generateReport(combined, engineer);
}
