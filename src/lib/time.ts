// Day and month helpers. Day 0 = 2025-05-01 (platform launch in the demo data).
// "Today" in the demo = 2026-11-17.

const BASE = Date.UTC(2025, 4, 1);
const DAY_MS = 86_400_000;

export const TODAY = Math.round((Date.UTC(2026, 10, 17) - BASE) / DAY_MS);

export function dayToDate(day: number): Date {
  return new Date(BASE + day * DAY_MS);
}

export function monthIndexOfDay(day: number): number {
  const d = dayToDate(day);
  return (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth() - 4;
}

export const MONTH_COUNT = monthIndexOfDay(TODAY) + 1;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(m: number): string {
  const total = 4 + m;
  const year = 2025 + Math.floor(total / 12);
  return `${MONTH_NAMES[total % 12]} ${String(year).slice(2)}`;
}

export function monthStartDay(m: number): number {
  const total = 4 + m;
  const year = 2025 + Math.floor(total / 12);
  return Math.round((Date.UTC(year, total % 12, 1) - BASE) / DAY_MS);
}

export function weekIndexOfDay(day: number): number {
  return Math.floor(day / 7);
}

export function weekLabel(w: number): string {
  const d = dayToDate(w * 7);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

export function formatDay(day: number): string {
  const d = dayToDate(day);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export type PeriodKey = '30d' | '90d' | '12m' | 'all';

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '12m', label: 'Last 12 months', days: 365 },
  { key: 'all', label: 'All time', days: TODAY + 1 },
];

export function periodStart(key: PeriodKey): number {
  const p = PERIODS.find((x) => x.key === key)!;
  return Math.max(0, TODAY - p.days + 1);
}
