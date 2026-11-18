import { useMemo, useState } from 'react';
import { Row, Col, Select } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, Legend, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, HBAR_RADIUS, BAR_RADIUS, TruncTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean, suppress } from '../lib/scope';
import { activityEvents } from '../lib/metrics';
import { monthIndexOfDay, monthLabel, TODAY } from '../lib/time';
import { QUESTION_GROUPS, PLATFORM_ITEMS, OCCUPATIONS, AGE_GROUPS, DEVICES, NOT_ANSWERED } from '../data/taxonomy';
import { TUTOR_LAUNCH_MONTH, PLATFORM_SURVEY_MONTHS } from '../data/generate';
import { MIN_GROUP } from '../data/audiences';
import { page } from '../data/registry';
import { SERIES, INK } from '../lib/palette';
import type { Learner } from '../data/generate';

type SegDim = 'occupation' | 'ageGroup' | 'device';
const SEG: { key: SegDim; label: string; values: string[] }[] = [
  { key: 'occupation', label: 'Role', values: [...OCCUPATIONS, NOT_ANSWERED] },
  { key: 'ageGroup', label: 'Age group', values: [...AGE_GROUPS, NOT_ANSWERED] },
  { key: 'device', label: 'Device', values: [...DEVICES] },
];
const TUTOR_ITEMS = PLATFORM_ITEMS.filter((i) => i.group === 'Virtual Tutor');

export default function Tutor() {
  const s = useScope();
  const p = page('tutor');
  const { d } = s;
  const today = s.mode === 'today';
  const [segDim, setSegDim] = useState<SegDim>('occupation');

  const m = useMemo(() => {
    const convs = d.tutorConvs.filter((t) => s.learnerOk[t.learnerId] && s.inRange(t.day));
    const events = activityEvents(s).filter((e) => s.inRange(e.day));
    const activeIds = new Set(events.map((e) => e.learnerId));
    const users = new Set(convs.map((t) => t.learnerId));
    const rated = convs.filter((t) => t.thumbs !== 0);

    // per month, voice and text. Today: ElevenLabs keeps 30 days and has no learner ID.
    const m0 = Math.max(TUTOR_LAUNCH_MONTH, monthIndexOfDay(s.start));
    const m1 = monthIndexOfDay(s.end);
    const monthly: { month: string; Text: number; Voice: number }[] = [];
    for (let mi = m0; mi <= m1; mi++) monthly.push({ month: monthLabel(mi), Text: 0, Voice: 0 });
    const monthSource = today ? d.tutorConvs.filter((t) => t.day > TODAY - 30) : convs;
    for (const t of monthSource) {
      const row = monthly[monthIndexOfDay(t.day) - m0];
      if (row) row[t.mode]++;
    }
    const recent = d.tutorConvs.filter((t) => t.day > TODAY - 30);

    // preferred (platform survey) vs actual mode, per tutor user
    const ps = d.platformSurveys.filter((x) => x.answered && s.learnerOk[x.learnerId] && x.modePref <= 2);
    const stated = [0, 1, 2].map((k) => ps.filter((x) => x.modePref === k).length);
    const actualCounts = [0, 0, 0];
    for (const id of users) {
      // the mode used in at least 70% of their conversations, else both
      const mine = convs.filter((t) => t.learnerId === id);
      const voice = ratio(mine.filter((t) => t.mode === 'Voice').length, mine.length);
      actualCounts[voice >= 0.7 ? 1 : voice <= 0.3 ? 0 : 2]++;
    }
    const toRow = (label: string, c: number[]) => {
      const n = c[0] + c[1] + c[2];
      return { label, n, Text: ratio(c[0], n), Voice: ratio(c[1], n), Both: ratio(c[2], n) };
    };
    const mode = [toRow('Say they prefer', stated), toRow('Actually use', actualCounts)];

    // question groups, with thumbs
    const grouped = convs.filter((t) => t.group >= 0);
    const groups = QUESTION_GROUPS.map((g, i) => {
      const rows = grouped.filter((t) => t.group === i);
      const r = rows.filter((t) => t.thumbs !== 0);
      return { name: g, value: rows.length, up: ratio(r.filter((t) => t.thumbs > 0).length, r.length) };
    }).sort((a, b) => b.value - a.value);

    // lessons where conversations start
    const lessonCount = new Map<number, number>();
    for (const t of convs) if (t.lessonId !== null && s.courseOk[d.lessons[t.lessonId].courseId]) lessonCount.set(t.lessonId, (lessonCount.get(t.lessonId) ?? 0) + 1);
    const lessons = [...lessonCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lid, n]) => {
        const l = d.lessons[lid];
        return { name: `L${l.idx + 1} ${l.title}`, course: d.courses[l.courseId].title, value: n, hard: l.continueProb < 0.8 };
      });

    // usefulness and reflection, per wave
    const tps = d.platformSurveys.filter((x) => x.answered && s.learnerOk[x.learnerId]);
    const usefulness = TUTOR_ITEMS.map((it) => {
      const row: Record<string, string | number> = { item: it.short, text: it.text };
      PLATFORM_SURVEY_MONTHS.forEach((mi, w) => {
        const vals = tps.filter((x) => x.wave === w).map((x) => x.items[it.key]).filter((v): v is number => v !== undefined);
        row[monthLabel(mi)] = Math.round(mean(vals) * 100) / 100;
        row[`n${w}`] = vals.length;
      });
      return row;
    });

    // adoption by group
    const segDef = SEG.find((x) => x.key === segDim)!;
    const seg = suppress(
      segDef.values.map((v) => {
        const act = [...activeIds].filter((id) => (d.learners[id][segDim as keyof Learner] as string) === v);
        const u = act.filter((id) => users.has(id)).length;
        return { group: v, active: act.length, rate: ratio(u, act.length) };
      }),
      (r) => r.active,
    );

    return {
      convs: convs.length,
      adoption: ratio([...users].filter((id) => activeIds.has(id)).length, activeIds.size),
      users: users.size,
      perUser: ratio(convs.length, users.size),
      length: mean((today ? recent : convs).map((t) => t.minutes)),
      thumbs: ratio(rated.filter((t) => t.thumbs > 0).length, rated.length),
      ratedN: rated.length,
      monthly,
      mode,
      groups,
      groupedShare: ratio(grouped.length, convs.length),
      lessons,
      usefulness,
      seg,
      segLabel: segDef.label,
    };
  }, [s, d, today, segDim]);

  const waveKeys = PLATFORM_SURVEY_MONTHS.map((mi) => monthLabel(mi));

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar segmentNote="In today's data ElevenLabs conversations are not linked to learners: learner filters do not apply to them." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="vt-adoption" value={fmtPct(m.adoption)} sub={`${fmtInt(m.users)} learners with at least one conversation`} />
        <Kpi id="vt-perlearner" value={Number.isFinite(m.perUser) ? m.perUser.toFixed(1) : '-'} sub={`${fmtInt(m.convs)} conversations in the period`} />
        <Kpi id="vt-length" value={Number.isFinite(m.length) ? `${m.length.toFixed(1)} min` : '-'} sub={today ? 'last 30 days, from ElevenLabs' : 'per conversation'} />
        <Kpi id="vt-thumbs" value={fmtPct(m.thumbs)} sub={`thumbs up, ${fmtInt(m.ratedN)} rated conversations`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <ChartCard
            id="vt-monthly"
            table={{ columns: [{ key: 'month', title: 'Month' }, { key: 'Text', title: 'Text', align: 'right' }, { key: 'Voice', title: 'Voice', align: 'right' }], rows: m.monthly }}
            note={`Kappa went live in ${monthLabel(TUTOR_LAUNCH_MONTH)} in the demo data. Conversations by unregistered visitors count only in totals.`}
          >
            <Legend
              items={[
                { label: 'Text', color: SERIES[0] },
                { label: 'Voice', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="Text" stackId="m" fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} />
                <Bar dataKey="Voice" stackId="m" fill={SERIES[1]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            id="vt-mode"
            table={{
              columns: [
                { key: 'label', title: '' },
                { key: 'n', title: 'Learners', align: 'right' },
                { key: 'Text', title: 'Text', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'Voice', title: 'Voice', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'Both', title: 'Both', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.mode,
            }}
            note="Preference from the platform survey; actual use from the conversations (the mode of at least 70% of a learner's conversations, else both). More learners say they prefer voice than use it: is voice hard to start on a phone, or in a shared office?"
          >
            <Legend
              items={[
                { label: 'Text', color: SERIES[0] },
                { label: 'Voice', color: SERIES[1] },
                { label: 'Both', color: SERIES[3] },
              ]}
            />
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={m.mode} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis type="category" dataKey="label" {...yAxisProps} width={110} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'label')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {(['Text', 'Voice', 'Both'] as const).map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="x" fill={[SERIES[0], SERIES[1], SERIES[3]][i]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={26} radius={i === 2 ? [0, 4, 4, 0] : 0}>
                    <LabelList dataKey={k} position="center" formatter={(v: number) => (v >= 0.08 ? fmtPct(v) : '')} style={{ fill: i === 2 ? INK.primary : '#fff', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={13}>
          <ChartCard
            id="vt-groups"
            table={{
              columns: [
                { key: 'name', title: 'Question group' },
                { key: 'value', title: 'Conversations', align: 'right' },
                { key: 'up', title: 'Rated useful', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.groups,
            }}
            note={`Grouped by AI analysis, only for learners who agreed to it (${fmtPct(m.groupedShare)} of conversations). The label is the share of thumbs up.`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={m.groups} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={220} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="value" name="Conversations" radius={HBAR_RADIUS} maxBarSize={18}>
                  {m.groups.map((g) => (
                    <Cell key={g.name} fill={g.up < 0.7 ? '#e34948' : SERIES[0]} />
                  ))}
                  <LabelList dataKey="up" position="right" formatter={(v: number) => (Number.isFinite(v) ? `${Math.round(v * 100)}% useful` : '')} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={11}>
          <ChartCard
            id="vt-lessons"
            table={{ columns: [{ key: 'name', title: 'Lesson' }, { key: 'course', title: 'Course' }, { key: 'value', title: 'Conversations', align: 'right' }], rows: m.lessons }}
            note="Red: lessons where many learners stop. Learners ask the tutor where lessons are hard."
          >
            {m.lessons.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={m.lessons} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" {...yAxisProps} width={230} interval={0} tick={<TruncTick max={32} />} />
                  <Tooltip content={makeTooltip((v) => fmtInt(v), 'course')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="value" name="Conversations" radius={HBAR_RADIUS} maxBarSize={18}>
                    {m.lessons.map((l) => (
                      <Cell key={l.name} fill={l.hard ? '#e34948' : SERIES[0]} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="vt-usefulness"
            table={{
              columns: [{ key: 'text', title: 'Statement' }, ...waveKeys.map((k) => ({ key: k, title: k, align: 'right' as const }))],
              rows: m.usefulness,
            }}
            note="Average score from 1 to 5, tutor users only. Reflection is the tutor's aim: it should help learners think the problem through, not just give the answer."
          >
            <Legend items={waveKeys.map((k, i) => ({ label: `Platform survey ${k}`, color: [SERIES[1], SERIES[0]][i] }))} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.usefulness} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="item" {...axisProps} interval={0} tick={{ fill: INK.muted, fontSize: 11 }} />
                <YAxis {...yAxisProps} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip content={makeTooltip((v) => v.toFixed(1), 'text')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {waveKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={[SERIES[1], SERIES[0]][i]} radius={BAR_RADIUS} maxBarSize={26}>
                    <LabelList dataKey={k} position="top" formatter={(v: number) => (Number.isFinite(v) ? v.toFixed(1) : '')} style={{ fill: INK.secondary, fontSize: 11 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="vt-segment"
            extra={
              <Select
                size="small"
                style={{ width: 160, marginBottom: 8 }}
                value={segDim}
                onChange={setSegDim}
                options={SEG.map((x) => ({ value: x.key, label: x.label }))}
              />
            }
            table={{
              columns: [
                { key: 'group', title: m.segLabel },
                { key: 'active', title: 'Active learners', align: 'right' },
                { key: 'rate', title: 'Tutor adoption', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.seg.shown,
            }}
            note={m.seg.hidden ? `${m.seg.hidden} groups with fewer than ${MIN_GROUP} active learners hidden.` : undefined}
          >
            {m.seg.shown.length ? (
              <ResponsiveContainer width="100%" height={Math.max(180, m.seg.shown.length * 28)}>
                <BarChart data={m.seg.shown} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="group" {...yAxisProps} width={200} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="rate" name="Tutor adoption" radius={HBAR_RADIUS} maxBarSize={18}>
                    {m.seg.shown.map((x) => (
                      <Cell key={x.group} fill={x.group === NOT_ANSWERED ? INK.neutralBar : SERIES[0]} />
                    ))}
                    <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
