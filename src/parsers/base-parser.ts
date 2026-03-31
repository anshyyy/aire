import type { Transcript, TranscriptSource } from '../types/transcript.js';

export abstract class TranscriptParser {
  abstract readonly source: TranscriptSource;

  abstract canParse(filePath: string): Promise<boolean>;
  abstract parse(filePath: string): Promise<Transcript>;
  abstract discoverSessions(): Promise<string[]>;
}
