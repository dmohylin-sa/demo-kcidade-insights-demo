// Metric calculations shared by several screens. Definitions match section 6 of the
// data catalogue.

import type { Scope } from './scope';
import { ratio, median, mean } from './scope';
import { TOPICS, CONTENT_LANGS, ASPECTS } from '../data/taxonomy';
import type { Question } from '../data/generate';

export interface ActivityEvent {
  learnerId: number;
  day: number;
}

/** Learning activity per learner and day, following every filter. Today: LearnDash + downloads. */
export function activityEvents(s: Scope): ActivityEvent[] {
  const { d } = s;
  const out: ActivityEvent[] = [];
  for (const e of d.enrolments) {
    if (!s.learnerOk[e.learnerId] || !s.courseOk[e.courseId]) continue;
    out.push({ learnerId: e.learnerId, day: e.day });
    for (const day of e.lessonDays) out.push({ learnerId: e.learnerId, day });
  }
  for (const a of d.attempts) {
    if (!s.learnerOk[a.learnerId] || !s.courseOk[a.courseId]) continue;
    out.push({ learnerId: a.learnerId, day: a.day });
  }
  for (const r of d.resEvents) {
    if (!s.learnerOk[r.learnerId] || !s.resourceOk[r.resourceId]) continue;
    if (s.mode === 'today' && r.kind !== 'download') continue;
    out.push({ learnerId: r.learnerId, day: r.day });
  }
  if (s.mode === 'proposed') {
    for (const v of d.lessonVideos) {
      if (!s.learnerOk[v.learnerId] || !s.courseOk[v.courseId]) continue;
      out.push({ learnerId: v.learnerId, day: v.day });
    }
  }
  return out;
}

export function activeLearners(events: ActivityEvent[], start: number, end: number): number {
  const set = new Set<number>();
  for (const e of events) if (e.day >= start && e.day <= end) set.add(e.learnerId);
  return set.size;
}

// ---------------------------------------------------------------- courses

export interface CourseStat {
  courseId: number;
  enrolments: number;
  started: number;
  completed: number;
  completionRate: number;
  medianDays: number;
  firstPass: number;
  satisfaction: number;
  activeLearners: number;
  reachedLesson: number[];
}

export function courseStats(s: Scope): CourseStat[] {
  const { d } = s;
  return d.courses
    .filter((c) => s.courseOk[c.id])
    .map((c) => {
      const es = d.enrolments.filter((e) => e.courseId === c.id && s.learnerOk[e.learnerId] && s.inRange(e.day));
      const completed = es.filter((e) => e.completedDay !== null);
      const firsts = d.attempts.filter(
        (a) => a.courseId === c.id && a.attemptNo === 1 && s.learnerOk[a.learnerId] && s.inRange(a.day),
      );
      const sv = d.surveys.filter((x) => x.courseId === c.id && x.answered && s.learnerOk[x.learnerId] && s.inRange(x.answerDay));
      const active = new Set<number>();
      for (const e of d.enrolments) {
        if (e.courseId !== c.id || !s.learnerOk[e.learnerId]) continue;
        if (s.inRange(e.day) || e.lessonDays.some((x) => s.inRange(x))) active.add(e.learnerId);
      }
      return {
        courseId: c.id,
        enrolments: es.length,
        started: es.filter((e) => e.started).length,
        completed: completed.length,
        completionRate: ratio(completed.length, es.length),
        medianDays: median(completed.map((e) => (e.completedDay as number) - e.day)),
        firstPass: ratio(firsts.filter((a) => a.passed).length, firsts.length),
        satisfaction: mean(sv.map((x) => mean(x.scores))),
        activeLearners: active.size,
        reachedLesson: c.lessonIds.map((_, i) => es.filter((e) => e.lessonsDone > i).length),
      };
    });
}

// ---------------------------------------------------------------- quizzes

export interface QuizStat {
  quizId: number;
  attempts: number;
  learners: number;
  firstPass: number;
  finalPass: number;
  avgAttemptsToPass: number;
  avgFirstScore: number;
  medianTimeMin: number;
}

export function quizStats(s: Scope): QuizStat[] {
  const { d } = s;
  const byQuiz = new Map<number, typeof d.attempts>();
  for (const a of d.attempts) {
    if (!s.learnerOk[a.learnerId] || !s.courseOk[a.courseId] || !s.inRange(a.day)) continue;
    const arr = byQuiz.get(a.quizId) ?? [];
    arr.push(a);
    byQuiz.set(a.quizId, arr);
  }
  return d.quizzes
    .filter((q) => s.courseOk[q.courseId])
    .map((q) => {
      const at = byQuiz.get(q.id) ?? [];
      const perLearner = new Map<number, { passedAt: number | null; first?: number }>();
      for (const a of at) {
        const p = perLearner.get(a.learnerId) ?? { passedAt: null };
        if (a.attemptNo === 1) p.first = a.scorePct;
        if (a.passed && p.passedAt === null) p.passedAt = a.attemptNo;
        perLearner.set(a.learnerId, p);
      }
      const learners = [...perLearner.values()];
      const firsts = at.filter((a) => a.attemptNo === 1);
      const passedAt = learners.filter((x) => x.passedAt !== null).map((x) => x.passedAt as number);
      return {
        quizId: q.id,
        attempts: at.length,
        learners: learners.length,
        firstPass: ratio(firsts.filter((a) => a.passed).length, firsts.length),
        finalPass: ratio(passedAt.length, learners.length),
        avgAttemptsToPass: mean(passedAt),
        avgFirstScore: mean(firsts.map((a) => a.scorePct)) / 100,
        medianTimeMin: median(at.map((a) => a.timeSec)) / 60,
      };
    });
}

export interface QuestionStat {
  q: Question;
  n: number;
  pCorrect: number;
  discrimination: number;
  zone: 'good' | 'easy' | 'hard' | 'check';
}

function correlation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

/** Item analysis on first attempts, only for quizzes with statistics on. */
export function questionStats(s: Scope): QuestionStat[] {
  const { d } = s;
  const out: QuestionStat[] = [];
  for (const quiz of d.quizzes) {
    if (!quiz.statsOn || !s.courseOk[quiz.courseId]) continue;
    const firsts = d.attempts.filter(
      (a) => a.quizId === quiz.id && a.attemptNo === 1 && s.learnerOk[a.learnerId] && s.inRange(a.day),
    );
    if (firsts.length < 6) continue;
    const totals = firsts.map((a) => a.correct.filter(Boolean).length);
    quiz.questionIds.forEach((qid, qi) => {
      const q = d.questions[qid];
      const item = firsts.map((a) => (a.correct[qi] ? 1 : 0));
      const rest = firsts.map((a, i) => totals[i] - item[i]);
      const pCorrect = ratio(item.reduce<number>((x, y) => x + y, 0), item.length);
      // corrected item-rest correlation (point-biserial without the item itself)
      const discrimination = correlation(item, rest);
      let zone: QuestionStat['zone'] = 'good';
      if (pCorrect > 0.92) zone = 'easy';
      else if (discrimination < 0.05) zone = 'check';
      else if (pCorrect < 0.45) zone = 'hard';
      out.push({ q, n: firsts.length, pCorrect, discrimination, zone });
    });
  }
  return out;
}

export const ZONE_META: Record<QuestionStat['zone'], { label: string; color: string; advice: string }> = {
  good: { label: 'Working well', color: '#2a78d6', advice: 'Keep' },
  easy: { label: 'Too easy', color: '#898781', advice: 'Make it harder or drop it' },
  hard: { label: 'Too hard', color: '#eda100', advice: 'Teach the idea better, or reword' },
  check: { label: 'Check the wording', color: '#d03b3b', advice: 'Fix the wording or the answer key' },
};

// ---------------------------------------------------------------- content gaps

export interface TopicGap {
  topicId: number;
  name: string;
  demandShare: number;
  supply: number;
  courses: number;
}

export function topicGaps(s: Scope): TopicGap[] {
  const { d } = s;
  const learners = d.learners.filter((l) => s.learnerOk[l.id]);
  return TOPICS.filter((t) => s.filters.area === null || t.areaId === s.filters.area).map((t) => ({
    topicId: t.id,
    name: t.name,
    demandShare: ratio(learners.filter((l) => l.interests.includes(t.id)).length, learners.length),
    supply: d.resources.filter((r) => r.topicId === t.id && (!s.filters.contentLang || r.lang === s.filters.contentLang)).length,
    courses: d.courses.filter((c) => c.topicIds.includes(t.id) && (!s.filters.contentLang || c.lang === s.filters.contentLang)).length,
  }));
}

export interface LangGap {
  lang: string;
  learnerShare: number;
  contentShare: number;
  contentItems: number;
  learners: number;
}

export function langGaps(s: Scope): LangGap[] {
  const { d } = s;
  const learners = d.learners.filter((l) => s.learnerOk[l.id]);
  const items = [
    ...d.resources.filter((r) => s.filters.area === null || r.areaId === s.filters.area).map((r) => r.lang),
    ...d.courses.filter((c) => s.filters.area === null || c.areaId === s.filters.area).map((c) => c.lang),
  ];
  return CONTENT_LANGS.map((lang) => {
    const nL = learners.filter((l) => l.prefLang === lang).length;
    const nC = items.filter((x) => x === lang).length;
    return { lang, learners: nL, learnerShare: ratio(nL, learners.length), contentItems: nC, contentShare: ratio(nC, items.length) };
  });
}

// ---------------------------------------------------------------- signals

export interface Signal {
  key: string;
  title: string;
  detail: string;
  path: string;
  kind: 'course' | 'quiz' | 'topic' | 'language' | 'satisfaction';
}

export function signals(s: Scope): Signal[] {
  const { d } = s;
  const out: Signal[] = [];

  // biggest lesson-to-lesson fall
  let best: { drop: number; courseId: number; li: number } | null = null;
  for (const cs of courseStats(s)) {
    if (cs.enrolments < 15) continue;
    for (let i = 0; i < cs.reachedLesson.length - 1; i++) {
      const a = cs.reachedLesson[i];
      const b = cs.reachedLesson[i + 1];
      if (a < 8) continue;
      const drop = 1 - b / a;
      if (!best || drop > best.drop) best = { drop, courseId: cs.courseId, li: i };
    }
  }
  if (best) {
    const c = d.courses[best.courseId];
    out.push({
      key: 'lesson',
      kind: 'course',
      title: `${Math.round(best.drop * 100)}% stop after lesson ${best.li + 1}`,
      detail: `In "${c.title}", learners who finish lesson ${best.li + 1} do not go on to finish lesson ${best.li + 2}.`,
      path: '/courses',
    });
  }

  // worst question
  const qs = questionStats(s).filter((x) => x.n >= 12 && x.zone === 'check');
  const worst = [...qs].sort((a, b) => (a.q.why ? 0 : 1) - (b.q.why ? 0 : 1) || a.discrimination - b.discrimination)[0];
  if (worst) {
    const quiz = d.quizzes[worst.q.quizId];
    out.push({
      key: 'question',
      kind: 'quiz',
      title: 'A question strong learners get wrong',
      detail: `"${worst.q.text}" (${d.courses[quiz.courseId].title}, ${quiz.title.split(':')[0]}). Likely a wording or answer-key problem.`,
      path: '/quizzes',
    });
  }

  // topic wanted by many, few materials
  const tg = topicGaps(s).filter((t) => t.demandShare > 0.08);
  const gap = [...tg].sort((a, b) => a.supply / a.demandShare - b.supply / b.demandShare)[0];
  if (gap) {
    out.push({
      key: 'topic',
      kind: 'topic',
      title: `"${gap.name}" is wanted, with little to offer`,
      detail: `${Math.round(gap.demandShare * 100)}% of learners chose it as an interest; ${gap.supply} materials and ${gap.courses} courses cover it.`,
      path: '/gaps',
    });
  }

  // language gap
  const lg = langGaps(s)
    .filter((x) => x.lang !== 'Portuguese' && x.lang !== 'English' && x.learners > 0)
    .sort((a, b) => b.learnerShare - a.learnerShare);
  const totalOther = lg.reduce((a, b) => a + b.learners, 0);
  const otherShare = lg.reduce((a, b) => a + b.learnerShare, 0);
  const otherContent = lg.reduce((a, b) => a + b.contentItems, 0);
  if (totalOther > 0) {
    out.push({
      key: 'language',
      kind: 'language',
      title: `${Math.round(otherShare * 100)}% prefer a language with almost no content`,
      detail: `${lg.map((x) => x.lang).join(', ')}: ${totalOther} learners, ${otherContent} materials in those languages.`,
      path: '/gaps',
    });
  }

  // lowest satisfaction aspect (proposed only)
  if (s.mode === 'proposed') {
    let low: { v: number; courseId: number; k: number } | null = null;
    for (const c of d.courses) {
      if (!s.courseOk[c.id]) continue;
      const sv = d.surveys.filter((x) => x.courseId === c.id && x.answered && s.learnerOk[x.learnerId] && s.inRange(x.answerDay));
      if (sv.length < 6) continue;
      ASPECTS.forEach((_, k) => {
        const v = mean(sv.map((x) => x.scores[k]));
        if (!low || v < low.v) low = { v, courseId: c.id, k };
      });
    }
    if (low) {
      const l = low as { v: number; courseId: number; k: number };
      out.push({
        key: 'satisfaction',
        kind: 'satisfaction',
        title: `${ASPECTS[l.k]} scores ${l.v.toFixed(1)} out of 5`,
        detail: `The lowest aspect of any course: "${d.courses[l.courseId].title}".`,
        path: '/feedback',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- resource use

import { monthStartDay, MONTH_COUNT } from './time';

/** share of month m that falls inside [start, end] */
export function monthOverlap(m: number, start: number, end: number): number {
  const a = monthStartDay(m);
  const b = m + 1 < MONTH_COUNT ? monthStartDay(m + 1) - 1 : end;
  const lo = Math.max(a, start);
  const hi = Math.min(b, end);
  if (hi < lo) return 0;
  return (hi - lo + 1) / (b - a + 1);
}

export interface ResourceUse {
  resourceId: number;
  anonViews: number;
  visitorDownloads: number;
  learnerDownloads: number;
  learnerUses: number;
  uniqueLearners: number;
  avgWatched: number;
  finishedShare: number;
  recShare: number;
  /** what the screen shows as "uses" in the current mode */
  uses: number;
}

export function resourceUse(s: Scope): ResourceUse[] {
  const { d } = s;
  const anon = new Map<number, { views: number; vd: number }>();
  for (const a of d.anon) {
    if (!s.resourceOk[a.resourceId]) continue;
    const f = monthOverlap(a.month, s.start, s.end);
    if (f <= 0) continue;
    const cur = anon.get(a.resourceId) ?? { views: 0, vd: 0 };
    cur.views += a.views * f;
    cur.vd += a.visitorDownloads * f;
    anon.set(a.resourceId, cur);
  }
  const per = new Map<number, { dl: number; uses: number; learners: Set<number>; watched: number[]; rec: number }>();
  for (const e of d.resEvents) {
    if (!s.resourceOk[e.resourceId] || !s.learnerOk[e.learnerId] || !s.inRange(e.day)) continue;
    const cur = per.get(e.resourceId) ?? { dl: 0, uses: 0, learners: new Set<number>(), watched: [], rec: 0 };
    if (e.kind === 'download') cur.dl++;
    cur.uses++;
    cur.learners.add(e.learnerId);
    if (e.kind === 'play' || (d.resources[e.resourceId].type === 'Microlearning' && e.kind === 'view')) cur.watched.push(e.watched);
    if (e.source === 'Recommendation') cur.rec++;
    per.set(e.resourceId, cur);
  }
  return d.resources
    .filter((r) => s.resourceOk[r.id])
    .map((r) => {
      const a = anon.get(r.id) ?? { views: 0, vd: 0 };
      const p = per.get(r.id) ?? { dl: 0, uses: 0, learners: new Set<number>(), watched: [], rec: 0 };
      const anonViews = Math.round(a.views);
      const visitorDownloads = s.segmentActive ? 0 : Math.round(a.vd);
      const uses = s.mode === 'today' ? anonViews + visitorDownloads + p.dl : p.uses;
      return {
        resourceId: r.id,
        anonViews,
        visitorDownloads,
        learnerDownloads: p.dl,
        learnerUses: p.uses,
        uniqueLearners: p.learners.size,
        avgWatched: mean(p.watched),
        finishedShare: ratio(p.watched.filter((w) => w >= 1).length, p.watched.length),
        recShare: ratio(p.rec, p.uses),
        uses,
      };
    });
}
