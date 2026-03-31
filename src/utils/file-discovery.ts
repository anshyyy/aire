import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export interface DiscoveredSession {
  filePath: string;
  project: string;
  sessionId: string;
  source: 'claude-code';
  size: number;
  modified: Date;
}

export async function discoverClaudeCodeSessions(): Promise<DiscoveredSession[]> {
  const claudeDir = join(homedir(), '.claude', 'projects');
  const sessions: DiscoveredSession[] = [];

  try {
    const projects = await readdir(claudeDir);

    for (const project of projects) {
      const projectDir = join(claudeDir, project);
      const projectStat = await stat(projectDir);
      if (!projectStat.isDirectory()) continue;

      const files = await readdir(projectDir);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = join(projectDir, file);
        const fileStat = await stat(filePath);

        sessions.push({
          filePath: resolve(filePath),
          project: project.replace(/-/g, '/'),
          sessionId: file.replace('.jsonl', ''),
          source: 'claude-code',
          size: fileStat.size,
          modified: fileStat.mtime,
        });
      }
    }
  } catch {
    // ~/.claude/projects may not exist
  }

  return sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}
