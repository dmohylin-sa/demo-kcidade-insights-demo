import { useMemo, useState } from 'react';
import { Row, Col, Select } from 'antd';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, makeTooltip, pctTick, BAR_RADIUS } from '../components/viz';
import { useScope, fmtPct, ratio } from '../lib/scope';
import { INDICATORS, INDICATOR_SHORT, WAVES, OCCUPATIONS, WORK_AREAS, ORGANISATIONS, NOT_ANSWERED } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK, ORDINAL } from '../lib/palette';
import type { FollowUp } from '../data/generate';

function Dumbbell({ rows }: { rows: { group: string; a: number; b: number; n: number }[] }) {
  if (!rows.length) return <NoData text="Not enough answers for these filters." />;
  return (
    <div>
      <Legend
        items={[
          { label: 'At completion', color: ORDINAL[0] },
          { label: '12 months later', color: ORDINAL[3] },
        ]}
      />
      {rows.map((r) => (
        <div className="dumbbell-row" key={r.group} title={`${r.n} answers at 12 months`}>
          <span className="funnel-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.group}
          </span>
          <div className="dumbbell-track">
            <div className="dumbbell-axis" />
            <div className="dumbbell-link" style={{ left: `${Math.min(r.a, r.b) * 100}%`, width: `${Math.abs(r.b - r.a) * 100}%` }} />
            <div className="dumbbell-dot" style={{ left: `${r.a * 100}%`, background: ORDINAL[0] }} />
            <div className="dumbbell-dot" style={{ left: `${r.b * 100}%`, background: ORDINAL[3] }} />
          </div>
          <span className="funnel-val">
            {fmtPct(r.a)} → {fmtPct(r.b)}
          </span>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 110px', gap: 10, fontSize: 11, color: INK.muted }}>
        <span />
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </span>
      </div>
    </div>
  );
}

export default function Impact() {
  const s = useScope();
  const p = page('impact');
  const { d } = s;
  const [indicator, setIndicator] = useState(0);
  const [groupDim, setGroupDim] = useState<'occupation' | 'workArea'>('occupation');

  const m = useMemo(() => {
    const fu = d.followUps.filter((f) => s.learnerOk[f.learnerId] && s.courseOk[f.courseId] && s.inRange(f.sentDay));
    const answered = (w: number, pred: (f: FollowUp) => boolean = () => true) => fu.filter((f) => f.wave === w && f.answered && pred(f));
    const share = (arr: FollowUp[], k: number) => (arr.length ? arr.reduce((a, f) => a + f.agreeP[k], 0) / arr.length : NaN);

    const waves = WAVES.map((w, wi) => {
      const arr = answered(wi);
      const row: Record<string, number | string> = { wave: w, n: arr.length };
      INDICATOR_SHORT.forEach((name, k) => (row[name] = share(arr, k)));
      return row;
    });
    const rates = [1, 2].map((wi) => {
      const sent = fu.filter((f) => f.wave === wi);
      return { wave: WAVES[wi], rate: ratio(sent.filter((f) => f.answered).length, sent.length), sent: sent.length, answered: sent.filter((f) => f.answered).length };
    });

    const groups = groupDim === 'occupation' ? [...OCCUPATIONS] : [...WORK_AREAS];
    const bySegment = groups
      .map((g) => {
        const pred = (f: FollowUp) => (d.learners[f.learnerId][groupDim] as string) === g;
        const a0 = answered(0, pred);
        const a2 = answered(2, pred);
        return { group: g, a: share(a0, indicator), b: share(a2, indicator), n: a2.length };
      })
      .filter((r) => r.n >= 4 && Number.isFinite(r.a) && Number.isFinite(r.b))
      .sort((x, y) => y.b - y.a - (x.b - x.a));
    const byOrg = [...ORGANISATIONS]
      .map((o) => {
        const pred = (f: FollowUp) => d.learners[f.learnerId].org === o;
        const a0 = answered(0, pred);
        const a2 = answered(2, pred);
        return { group: o, a: share(a0, 3), b: share(a2, 3), n: a2.length };
      })
      .filter((r) => r.n >= 2 && Number.isFinite(r.a) && Number.isFinite(r.b))
      .sort((x, y) => y.b - y.a - (x.b - x.a));
    return { waves, rates, bySegment, byOrg };
  }, [s, d, indicator, groupDim]);

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <ChartCard
            id="im-waves"
            table={{
              columns: [{ key: 'wave', title: 'When' }, { key: 'n', title: 'Answers', align: 'right' }, ...INDICATOR_SHORT.map((n) => ({ key: n, title: n, align: 'right' as const, render: (v: number) => fmtPct(v) }))],
              rows: m.waves,
            }}
            note="Share of learners who agree (4 or 5 on a 1-5 scale). The four statements are placeholders: the real indicators come from the co-creation phase."
          >
            <Legend line items={INDICATORS.map((name, i) => ({ label: name, color: SERIES[i] }))} />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={m.waves} margin={{ top: 12, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="wave" {...axisProps} padding={{ left: 30, right: 30 }} />
                <YAxis {...yAxisProps} domain={[0, 1]} tickFormatter={pctTick} />
                <Tooltip content={makeTooltip((v) => fmtPct(v))} />
                {INDICATOR_SHORT.map((name, i) => (
                  <Line key={name} type="linear" dataKey={name} name={INDICATORS[i]} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4, stroke: '#fcfcfb', strokeWidth: 2, fill: SERIES[i] }}>
                    <LabelList dataKey={name} position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11 }} />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={9}>
          <ChartCard
            id="im-rate"
            table={{
              columns: [
                { key: 'wave', title: 'Follow-up' },
                { key: 'sent', title: 'Sent', align: 'right' },
                { key: 'answered', title: 'Answered', align: 'right' },
                { key: 'rate', title: 'Response rate', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.rates,
            }}
            note="Response falls with time. Show the number of answers next to every percentage."
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.rates} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="wave" {...axisProps} />
                <YAxis {...yAxisProps} domain={[0, 1]} tickFormatter={pctTick} />
                <Tooltip content={makeTooltip((v) => fmtPct(v))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="rate" name="Response rate" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={40}>
                  <LabelList dataKey="rate" position="top" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="im-segment"
            extra={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <Select style={{ minWidth: 250 }} value={indicator} onChange={setIndicator} options={INDICATORS.map((name, i) => ({ value: i, label: name }))} />
                <Select
                  style={{ width: 150 }}
                  value={groupDim}
                  onChange={setGroupDim}
                  options={[
                    { value: 'occupation', label: 'Occupation' },
                    { value: 'workArea', label: 'Work area' },
                  ]}
                />
              </div>
            }
            table={{
              columns: [
                { key: 'group', title: 'Group' },
                { key: 'a', title: 'At completion', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'b', title: '12 months', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'n', title: 'Answers at 12 months', align: 'right' },
              ],
              rows: m.bySegment,
            }}
          >
            <Dumbbell rows={m.bySegment} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="im-org"
            table={{
              columns: [
                { key: 'group', title: 'Organisation' },
                { key: 'a', title: 'At completion', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'b', title: '12 months', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'n', title: 'Answers at 12 months', align: 'right' },
              ],
              rows: m.byOrg,
            }}
            note={`"${INDICATORS[3]}", by the learner's organisation. Learners without an organisation (${NOT_ANSWERED.toLowerCase()}) are left out.`}
          >
            <Dumbbell rows={m.byOrg} />
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
