// The filtered slice every chart reads from. One filter row scopes every chart on a screen.

import { useMemo } from 'react';
import { DATA, type Dataset } from '../data/generate';
import { useStore, type Filters, type Mode, LEARNER_FILTER_KEYS, PROPOSED_FILTER_KEYS } from './store';
import { MIN_GROUP } from '../data/audiences';
import { periodStart, TODAY } from './time';

export interface Scope {
  d: Dataset;
  mode: Mode;
  filters: Filters;
  start: number;
  end: number;
  learnerOk: boolean[];
  courseOk: boolean[];
  resourceOk: boolean[];
  /** a learner filter is set: anonymous counts cannot follow it */
  segmentActive: boolean;
  /** learners matching the learner filters */
  learnerCount: number;
  activity: number[][];
  inRange: (day: number) => boolean;
}

export function buildScope(d: Dataset, mode: Mode, filters: Filters): Scope {
  const start = periodStart(filters.period);
  const end = TODAY;
  const proposed = mode === 'proposed';
  const learnerOk = d.learners.map((l) => {
    if (filters.occupation && l.occupation !== filters.occupation) return false;
    if (filters.workArea && l.workArea !== filters.workArea) return false;
    if (filters.ageGroup && l.ageGroup !== filters.ageGroup) return false;
    if (filters.gender && l.gender !== filters.gender) return false;
    if (filters.prefLang && l.prefLang !== filters.prefLang) return false;
    if (proposed) {
      if (filters.instType && l.instType !== filters.instType) return false;
      if (filters.org && l.org !== filters.org) return false;
      if (filters.district && l.district !== filters.district) return false;
      if (filters.municipality && l.municipality !== filters.municipality) return false;
      if (filters.experience && l.experience !== filters.experience) return false;
      if (filters.education && l.education !== filters.education) return false;
      if (filters.foundVia && l.foundVia !== filters.foundVia) return false;
      if (filters.device && l.device !== filters.device) return false;
    }
    return true;
  });
  const courseOk = d.courses.map((c) => {
    if (filters.area !== null && c.areaId !== filters.area) return false;
    if (filters.contentLang && c.lang !== filters.contentLang) return false;
    return true;
  });
  const resourceOk = d.resources.map((r) => {
    if (filters.area !== null && r.areaId !== filters.area) return false;
    if (filters.contentLang && r.lang !== filters.contentLang) return false;
    return true;
  });
  const segmentActive = LEARNER_FILTER_KEYS.some((k) => {
    if (PROPOSED_FILTER_KEYS.includes(k) && mode === 'today') return false;
    return filters[k] !== null;
  });
  const learnerCount = learnerOk.filter(Boolean).length;
  return {
    d,
    mode,
    filters,
    start,
    end,
    learnerOk,
    courseOk,
    resourceOk,
    segmentActive,
    learnerCount,
    activity: mode === 'today' ? d.activityToday : d.activityProposed,
    inRange: (day: number) => day >= start && day <= end,
  };
}

export function useScope(): Scope {
  const mode = useStore((s) => s.mode);
  const filters = useStore((s) => s.filters);
  return useMemo(() => buildScope(DATA, mode, filters), [mode, filters]);
}

// ---------------------------------------------------------------- formatting

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

export function fmtPct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-';
  return `${(n * 100).toFixed(digits)}%`;
}

export function ratio(a: number, b: number): number {
  return b > 0 ? a / b : NaN;
}

export function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(values: number[]): number {
  if (!values.length) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** hides groups smaller than the minimum size, as the framework asks */
export function suppress<T>(rows: T[], size: (r: T) => number): { shown: T[]; hidden: number } {
  const shown = rows.filter((r) => size(r) >= MIN_GROUP);
  return { shown, hidden: rows.length - shown.length };
}
