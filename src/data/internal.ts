// Loads the git-ignored internal-notes.ts when it exists (local copy, dist-single).
// In the public repo and the deployed demo the file is absent, the glob matches
// nothing, and the presenter notes show no estimate detail.

import type { PageKey, ChartEstimate } from './registry';

interface InternalNotes {
  CHART_ESTIMATE: Record<string, ChartEstimate>;
  PAGE_ESTIMATE_WATCH: Partial<Record<PageKey, string[]>>;
}

const found = import.meta.glob<InternalNotes>('./internal-notes.ts', { eager: true });
const mod = Object.values(found)[0];

export const INTERNAL: InternalNotes | null = mod ?? null;
