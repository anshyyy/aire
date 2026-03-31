export type MessageRole = 'user' | 'assistant';

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  hasCodeBlocks: boolean;
  codeBlockCount: number;
  wordCount: number;
  charCount: number;
  toolCalls: ToolCall[];
}

export interface Session {
  id: string;
  source: TranscriptSource;
  project?: string;
  startTime: Date;
  endTime: Date;
  messages: Message[];
}

export type TranscriptSource = 'claude-code' | 'cursor' | 'generic';

export interface Transcript {
  source: TranscriptSource;
  sessions: Session[];
  filePath: string;
}
