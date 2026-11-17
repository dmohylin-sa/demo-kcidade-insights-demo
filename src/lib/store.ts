import { create } from 'zustand';
import type { PeriodKey } from './time';

export type Mode = 'today' | 'proposed';

export interface Filters {
  period: PeriodKey;
  area: number | null;
  contentLang: string | null;
  occupation: string | null;
  workArea: string | null;
  ageGroup: string | null;
  gender: string | null;
  prefLang: string | null;
  org: string | null;
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
  org: null,
  device: null,
};

export const LEARNER_FILTER_KEYS: (keyof Filters)[] = ['occupation', 'workArea', 'ageGroup', 'gender', 'prefLang', 'org', 'device'];

interface State {
  mode: Mode;
  filters: Filters;
  courseId: number;
  quizId: number | null;
  riskDays: number;
  notesOpen: boolean;
  setMode: (m: Mode) => void;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
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
  courseId: 11,
  quizId: null,
  riskDays: 14,
  notesOpen: readBool('kcidade-demo-notes-open', false),
  setMode: (mode) =>
    set((s) => ({
      mode,
      filters: mode === 'today' ? { ...s.filters, org: null, device: null } : s.filters,
    })),
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setCourse: (courseId) => set({ courseId, quizId: null }),
  setQuiz: (quizId) => set({ quizId }),
  setRiskDays: (riskDays) => set({ riskDays }),
  setNotesOpen: (notesOpen) => {
    writeBool('kcidade-demo-notes-open', notesOpen);
    set({ notesOpen });
  },
}));
