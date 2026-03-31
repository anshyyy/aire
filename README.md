# AIRE — AI Report for Engineers

A CLI tool that analyzes AI coding assistant transcripts and evaluates how effectively an engineer is using AI during software development.

## What It Does

AIRE ingests transcript data from AI coding tools (currently Claude Code), parses the interactions, and evaluates workflow quality across 6 behavioral metrics. It outputs structured insights as a visual terminal report or machine-readable JSON.

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (after build)
npx aire <command>

# Or run directly without building
npx tsx src/index.ts <command>
```

## Usage

### Interactive mode

```bash
# Launch the interactive TUI — no arguments needed
npx aire
```

The interactive mode lets you:
- Browse and pick sessions from your local `~/.claude/` directory
- Select multiple sessions for analysis or comparison
- Enter engineer names, toggle verbose mode, and save reports — all guided by prompts

### Analyze a transcript

```bash
# Single session
npx aire analyze transcripts/session-1.jsonl

# Multiple sessions for one engineer
npx aire analyze transcripts/*.jsonl --engineer "Jack"

# JSON output
npx aire analyze transcripts/session-1.jsonl --format json --output report.json

# Verbose mode (show all signals + evidence)
npx aire analyze transcripts/session-1.jsonl --verbose
```

### Discover available sessions

```bash
npx aire discover
```

Lists Claude Code sessions found in `~/.claude/projects/`.

### Compare sessions

```bash
npx aire compare transcripts/session-1.jsonl transcripts/session-2.jsonl transcripts/session-3.jsonl
```

Shows cross-session comparison with trend analysis and consistency scoring.

## Approach

### The Core Question

> "How effectively is this engineer using AI during software development?"

We answer this by measuring 6 independent signals from the transcript. Each signal evaluates a specific dimension of the engineer's interaction quality. Only the engineer's messages are scored — the AI's responses provide context but aren't graded.

### The 6 Metrics

| Metric | Weight | What It Measures |
|--------|--------|------------------|
| **Context Quality** | 20% | Did the engineer provide enough context? (message length, code blocks, requirements, constraints, tech references) |
| **Iterative Refinement** | 20% | Did they review and improve AI output? (back-and-forth count, pushback, questions, modification requests) |
| **Problem Decomposition** | 15% | Did they break the problem into steps? (planning before coding, stepped flow, separation of concerns) |
| **Critical Thinking** | 20% | Did they catch problems and question the AI? (raising concerns, questioning suggestions, asking for alternatives) |
| **Collaboration Pattern** | 15% | Partner or vending machine? (design discussions, building on responses, vs. demanding raw code) |
| **Specification Clarity** | 10% | How precise were the requirements? (quantified constraints, structured lists, edge cases, specific interfaces) |

### Scoring

Each metric starts at a base score (20-30) and gains/loses points based on detected patterns. All scores are hard-clamped to 0-100, then combined via weighted average into an overall score.

### Bonus Features

- **Cross-session comparison**: Analyze multiple sessions together to see trends, consistency, and per-metric ranges
- **Confidence scores**: Each metric reports confidence (0.3-0.95) based on how much data was available
- **Phase detection**: Classifies each exchange into Planning/Implementation/Review/Debugging/Testing and shows the workflow timeline
- **Visual breakdown**: Colored terminal output with score bars, grades, signals, and improvement suggestions
- **Extensible format support**: Strategy pattern for parsers — adding new AI tools means adding one parser class with zero changes to analyzers

## Architecture

```
src/
  index.ts                              # CLI entry (Commander.js)
  types/                                # TypeScript interfaces
  parsers/                              # Transcript format parsers (strategy pattern)
    claude-code-parser.ts               # Claude Code JSONL format
    parser-registry.ts                  # Auto-detect and route to correct parser
  analyzers/                            # 6 independent metric analyzers
    analysis-engine.ts                  # Orchestrator: runs all, computes weighted score
    phase-detector.ts                   # Workflow phase classification
  reporters/                            # Output formatters
    terminal-reporter.ts                # Colored terminal with visual bars
    json-reporter.ts                    # Structured JSON
  utils/                                # Shared utilities
  config/                               # Keyword lists, weights, thresholds
transcripts/                            # Sample transcripts for evaluation
```

### Key Design Decisions

- **Each metric is self-contained**: Independent analyzers that share text utilities but have no dependencies on each other. Easy to add, modify, or remove metrics.
- **Normalized intermediate format**: All parsers produce the same `Transcript -> Session -> Message` structure. Analyzers never know about JSONL vs other formats.
- **Strategy pattern for parsers**: Adding support for Cursor, Copilot, or Windsurf means adding one new parser class and registering it — zero changes to the analysis or reporting layers.

## Sample Transcripts

The `transcripts/` directory contains 3 real Claude Code sessions from my own development work. These are actual working sessions where I used AI for different engineering tasks — code review, feature implementation, and debugging. Sensitive code and company-specific details have been kept minimal as they are my personal project sessions.

## Reflection: What Makes an AI-Assisted Workflow "Good"?

A good AI-assisted workflow treats the AI as a **thinking partner**, not a **code vending machine**.

The strongest signal I've found is **iterative refinement** — engineers who review output, push back, and ask "why?" consistently produce better results than those who accept the first response. The weakest workflows are one-shot: a vague prompt followed by copying whatever comes back.

**Context quality matters enormously**. A well-specified first message — with code snippets, constraints, and clear requirements — sets up the entire conversation for success. Vague requests lead to vague output and more time wasted on corrections.

**Critical thinking is the differentiator**. The best engineers question AI suggestions ("won't that cause N+1 queries?"), raise concerns proactively ("what about edge cases with null?"), and ask for alternatives before committing. They apply their engineering judgment to the AI's output rather than deferring to it.

**Phase detection reveals workflow maturity**. Healthy sessions follow a pattern: planning -> implementation -> review. Weak sessions jump straight to debugging, suggesting the engineer didn't think through the problem before asking the AI to solve it.

The overall insight: AI amplifies your existing engineering practices. If you plan, review, and think critically without AI, you'll do it better with AI. If you skip those steps, AI makes it easier to skip them — and that's where quality drops.
