import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { TranscriptParser } from './base-parser.js';
import { discoverClaudeCodeSessions } from '../utils/file-discovery.js';
import { countWords, countCodeBlocks, hasCodeBlocks } from '../utils/text-analysis.js';
import type { Transcript, TranscriptSource, Message, Session, ToolCall } from '../types/transcript.js';

interface ClaudeCodeLine {
  type?: string;
  parentUuid?: string | null;
  uuid?: string;
  timestamp?: string;
  isSidechain?: boolean;
  message?: {
    role: string;
    content: string | ContentBlock[];
    model?: string;
  };
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
  id?: string;
}

export class ClaudeCodeParser extends TranscriptParser {
  readonly source: TranscriptSource = 'claude-code';

  async canParse(filePath: string): Promise<boolean> {
    return filePath.endsWith('.jsonl');
  }

  async parse(filePath: string): Promise<Transcript> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    const messages: Message[] = [];
    const seenMessageIds = new Set<string>();

    for (const line of lines) {
      let parsed: ClaudeCodeLine;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      // Skip non-message lines
      if (!parsed.message || !parsed.type) continue;
      if (parsed.type === 'file-history-snapshot') continue;

      const role = parsed.message.role;
      if (role !== 'user' && role !== 'assistant') continue;

      // Deduplicate: Claude Code writes multiple lines for streaming assistant messages
      // Use uuid to deduplicate, keeping the last (most complete) version
      const messageId = parsed.uuid ?? crypto.randomUUID();

      if (role === 'user') {
        // User messages have content as a string
        const text = typeof parsed.message.content === 'string'
          ? parsed.message.content
          : '';

        if (!text.trim()) continue;

        // Remove duplicate user messages
        if (seenMessageIds.has(messageId)) continue;
        seenMessageIds.add(messageId);

        messages.push({
          id: messageId,
          role: 'user',
          content: text,
          timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
          hasCodeBlocks: hasCodeBlocks(text),
          codeBlockCount: countCodeBlocks(text),
          wordCount: countWords(text),
          charCount: text.length,
          toolCalls: [],
        });
      } else if (role === 'assistant') {
        const contentBlocks = Array.isArray(parsed.message.content)
          ? parsed.message.content
          : [];

        const textParts: string[] = [];
        const toolCalls: ToolCall[] = [];

        for (const block of contentBlocks) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          } else if (block.type === 'tool_use' && block.name) {
            toolCalls.push({
              name: block.name,
              input: block.input ?? {},
            });
          }
          // Skip thinking blocks — they're internal
        }

        const text = textParts.join('\n');

        // For assistant messages, update if we've seen this ID before (streaming updates)
        const existingIndex = messages.findIndex(m => m.id === messageId);
        const message: Message = {
          id: messageId,
          role: 'assistant',
          content: text,
          timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
          hasCodeBlocks: hasCodeBlocks(text),
          codeBlockCount: countCodeBlocks(text),
          wordCount: countWords(text),
          charCount: text.length,
          toolCalls,
        };

        if (existingIndex >= 0) {
          // Replace with newer (more complete) version
          messages[existingIndex] = message;
        } else {
          messages.push(message);
        }
      }
    }

    const sessionId = basename(filePath, '.jsonl');
    const project = basename(dirname(filePath));

    const session: Session = {
      id: sessionId,
      source: 'claude-code',
      project,
      startTime: messages[0]?.timestamp ?? new Date(),
      endTime: messages[messages.length - 1]?.timestamp ?? new Date(),
      messages,
    };

    return {
      source: 'claude-code',
      sessions: [session],
      filePath,
    };
  }

  async discoverSessions(): Promise<string[]> {
    const sessions = await discoverClaudeCodeSessions();
    return sessions.map(s => s.filePath);
  }
}
