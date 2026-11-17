// Chart colors: the validated reference palette (dataviz skill, references/palette.md),
// light mode. Categorical slots are assigned to entities in a fixed order, so a color
// always follows the same area, format or aspect, whatever the filters.

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];

/** ordinal steps for funnels and ordered stages (light surface: start no lighter than step 250) */
export const ORDINAL = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  surface: '#fcfcfb',
  neutralBar: '#c3c2b7',
};

export function areaColor(areaId: number): string {
  return SERIES[areaId % SERIES.length];
}

export function typeColor(typeIdx: number): string {
  return SERIES[typeIdx % SERIES.length];
}

/** sequential color for a value in [0, 1] */
export function rampColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  return RAMP[Math.round(clamped * (RAMP.length - 1))];
}

/** text color that stays readable on a ramp cell */
export function rampInk(t: number): string {
  return t > 0.55 ? '#ffffff' : INK.primary;
}
