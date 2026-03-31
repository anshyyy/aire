import { TranscriptParser } from './base-parser.js';
import { ClaudeCodeParser } from './claude-code-parser.js';
import type { TranscriptSource } from '../types/transcript.js';

const parsers: TranscriptParser[] = [
  new ClaudeCodeParser(),
];

export function getParser(filePath: string, source?: TranscriptSource): TranscriptParser {
  if (source) {
    const parser = parsers.find(p => p.source === source);
    if (parser) return parser;
    throw new Error(`No parser found for source: ${source}`);
  }

  // Auto-detect by file extension
  if (filePath.endsWith('.jsonl')) {
    return new ClaudeCodeParser();
  }

  throw new Error(
    `Cannot detect transcript format for: ${filePath}\n` +
    `Supported formats: .jsonl (Claude Code)`
  );
}

export function getAllParsers(): TranscriptParser[] {
  return [...parsers];
}
