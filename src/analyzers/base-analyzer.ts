import type { Session } from '../types/transcript.js';
import type { MetricResult } from '../types/metrics.js';

export abstract class MetricAnalyzer {
  abstract readonly name: string;
  abstract readonly slug: string;
  abstract readonly weight: number;

  abstract analyze(session: Session): MetricResult;
}
