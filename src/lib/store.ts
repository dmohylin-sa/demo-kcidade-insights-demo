import { create } from 'zustand';
import type { PeriodKey } from './time';
import { AUDIENCES, type AudienceKey } from '../data/audiences';

export type Mode = 'today' | 'proposed';

export interface Filters {
  period: PeriodKey;
  area: number | null;
  contentLang: string | null;
  /** Level 1: profession or role */
  occupation: string | null;
  workArea: string | null;
  ageGroup: string | null;
  gender: string | null;
  prefLang: string | null;
  /** Level 1 fields proposed in the framework */
  instType: string | null;
  org: string | null;
  district: string | null;
  municipality: string | null;
  experience: string | null;
  education: string | null;
  foundVia: string | null;
  device: string | null;
}

export const DEFAULT_FILTERS: Filters = {
  period: '12m',
  area: null,
  contentLang: null,
  occupation: null,
  workArea: null,
  ageGroup: null,
  gender: null,
  prefLang: null,
  instType: null,
  org: null,
  district: null,
  municipality: null,
  experience: null,
  education: null,
  foundVia: null,
  device: null,
};

/** learner filters: anonymous counts cannot follow them */
export const LEARNER_FILTER_KEYS: (keyof Filters)[] = [
  'occupation',
  'workArea',
  'ageGroup',
  'gender',
  'prefLang',
  'instType',
  'org',
  'district',
  'municipality',
  'experience',
  'education',
  'foundVia',
  'device',
];

/** filters that need new profile fields or new tracking: locked in today's data */
export const PROPOSED_FILTER_KEYS: (keyof Filters)[] = ['instType', 'org', 'district', 'municipality', 'experience', 'education', 'foundVia', 'device'];

function clearProposed(f: Filters): Filters {
  const out = { ...f };
  for (const k of PROPOSED_FILTER_KEYS) (out[k] as null) = null;
  return out;
}

interface State {
  mode: Mode;
  filters: Filters;
  view: AudienceKey | null;
  viewModified: boolean;
  courseId: number;
  quizId: number | null;
  riskDays: number;
  notesOpen: boolean;
  setMode: (m: Mode) => void;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  applyView: (key: AudienceKey | null) => void;
  setCourse: (id: number) => void;
  setQuiz: (id: number | null) => void;
  setRiskDays: (n: number) => void;
  setNotesOpen: (open: boolean) => void;
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function writeBool(key: string, v: boolean) {
  try {
    window.localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* storage unavailable: the panel just does not remember its state */
  }
}

export const useStore = create<State>((set) => ({
  mode: 'proposed',
  filters: DEFAULT_FILTERS,
  view: null,
  viewModified: false,
  courseId: 11,
  quizId: null,
  riskDays: 14,
  notesOpen: readBool('kcidade-demo-notes-open', false),
  setMode: (mode) =>
    set((s) => {
      const view = s.view ? AUDIENCES.find((a) => a.key === s.view) : null;
      const dropView = mode === 'today' && view?.proposedOnly;
      return {
        mode,
        filters: mode === 'today' ? clearProposed(s.filters) : s.filters,
        view: dropView ? null : s.view,
      };
    }),
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v }, viewModified: s.view !== null })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, view: null, viewModified: false }),
  applyView: (key) =>
    set((s) => {
      if (!key) return { view: null, viewModified: false, filters: DEFAULT_FILTERS };
      const a = AUDIENCES.find((x) => x.key === key)!;
      const filters = { ...DEFAULT_FILTERS, ...a.filters };
      return { view: key, viewModified: false, filters: s.mode === 'today' ? clearProposed(filters) : filters };
    }),
  setCourse: (courseId) => set({ courseId, quizId: null }),
  setQuiz: (quizId) => set({ quizId }),
  setRiskDays: (riskDays) => set({ riskDays }),
  setNotesOpen: (notesOpen) => {
    writeBool('kcidade-demo-notes-open', notesOpen);
    set({ notesOpen });
  },
}));
