import type { Report } from '../types/metrics.js';

export function renderJsonReport(report: Report): string {
  return JSON.stringify(report, null, 2);
}
