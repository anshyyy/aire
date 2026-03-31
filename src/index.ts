#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getParser } from './parsers/parser-registry.js';
import { generateReport } from './analyzers/analysis-engine.js';
import { renderTerminalReport } from './reporters/terminal-reporter.js';
import { renderJsonReport } from './reporters/json-reporter.js';
import { discoverClaudeCodeSessions } from './utils/file-discovery.js';
import type { Transcript, Session } from './types/transcript.js';

const program = new Command();

program
  .name('aire')
  .description('AI Report for Engineers — Evaluate AI-assisted workflow quality')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze one or more transcript files')
  .argument('<files...>', 'Transcript file(s) to analyze')
  .option('--engineer <name>', 'Engineer name for the report')
  .option('--format <format>', 'Output format: terminal or json', 'terminal')
  .option('--output <file>', 'Write output to a file')
  .option('--verbose', 'Show all signals and evidence', false)
  .action(async (files: string[], options: { engineer?: string; format: string; output?: string; verbose: boolean }) => {
    try {
      const resolvedFiles = files.map(f => resolve(f));

      // Parse all files
      const allSessions: Session[] = [];
      let source = 'claude-code';

      for (const filePath of resolvedFiles) {
        const parser = getParser(filePath);
        const transcript = await parser.parse(filePath);
        source = transcript.source;
        allSessions.push(...transcript.sessions);
      }

      // Create a combined transcript
      const combined: Transcript = {
        source: source as Transcript['source'],
        sessions: allSessions,
        filePath: resolvedFiles.length === 1 ? resolvedFiles[0] : `${resolvedFiles.length} files`,
      };

      const report = generateReport(combined, options.engineer);

      // Render
      let output: string;
      if (options.format === 'json') {
        output = renderJsonReport(report);
      } else {
        output = renderTerminalReport(report, options.verbose);
      }

      if (options.output) {
        await writeFile(options.output, output, 'utf-8');
        console.log(chalk.green(`Report written to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('discover')
  .description('List available Claude Code transcripts')
  .option('--limit <n>', 'Maximum number of sessions to show', '20')
  .action(async (options: { limit: string }) => {
    try {
      const sessions = await discoverClaudeCodeSessions();
      const limit = parseInt(options.limit, 10);

      if (sessions.length === 0) {
        console.log(chalk.yellow('No Claude Code sessions found in ~/.claude/projects/'));
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan(`Found ${sessions.length} Claude Code session(s)`));
      console.log('');

      const shown = sessions.slice(0, limit);
      for (const session of shown) {
        const sizeKB = Math.round(session.size / 1024);
        const date = session.modified.toLocaleDateString();
        console.log(
          `  ${chalk.gray(date)} ${chalk.white(session.sessionId.slice(0, 8))}... ` +
          `${chalk.gray(`(${sizeKB}KB)`)} ${chalk.cyan(session.project)}`,
        );
      }

      if (sessions.length > limit) {
        console.log(chalk.gray(`  ... and ${sessions.length - limit} more`));
      }

      console.log('');
      console.log(chalk.gray('  Use: aire analyze <path> to analyze a session'));
      console.log('');
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare multiple transcript sessions')
  .argument('<files...>', 'Transcript files to compare')
  .option('--engineer <name>', 'Engineer name')
  .option('--format <format>', 'Output format: terminal or json', 'terminal')
  .option('--output <file>', 'Write output to a file')
  .action(async (files: string[], options: { engineer?: string; format: string; output?: string }) => {
    try {
      if (files.length < 2) {
        console.error(chalk.red('Compare requires at least 2 files'));
        process.exit(1);
      }

      const resolvedFiles = files.map(f => resolve(f));
      const allSessions: Session[] = [];

      for (const filePath of resolvedFiles) {
        const parser = getParser(filePath);
        const transcript = await parser.parse(filePath);
        allSessions.push(...transcript.sessions);
      }

      const combined: Transcript = {
        source: 'claude-code',
        sessions: allSessions,
        filePath: `${resolvedFiles.length} files`,
      };

      const report = generateReport(combined, options.engineer);

      let output: string;
      if (options.format === 'json') {
        output = renderJsonReport(report);
      } else {
        output = renderTerminalReport(report, true);
      }

      if (options.output) {
        await writeFile(options.output, output, 'utf-8');
        console.log(chalk.green(`Comparison report written to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program.parse();
