import { useMemo } from 'react';
import { Row, Col, Statistic } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, SegBar } from '../components/ui';
import { axisProps, yAxisProps, gridProps, makeTooltip, BAR_RADIUS, HBAR_RADIUS, pctTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean } from '../lib/scope';
import { monthOverlap } from '../lib/metrics';
import { CAROUSELS } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK } from '../lib/palette';

const ITEMS_PER_CAROUSEL = 8;

export default function Recommendations() {
  const s = useScope();
  const p = page('recommendations');
  const { d } = s;

  const m = useMemo(() => {
    const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day));
    const matched = es.filter((e) => e.matched);
    const other = es.filter((e) => !e.matched);
    const done = (arr: typeof es) => ratio(arr.filter((e) => e.completedDay !== null).length, arr.length);

    const car = CAROUSELS.map((name) => ({ name, shown: 0, clicks: 0, ctr: 0 }));
    const pos = Array.from({ length: ITEMS_PER_CAROUSEL }, (_, i) => ({ pos: `${i + 1}`, shown: 0, clicks: 0, ctr: 0 }));
    for (const r of d.recStats) {
      if (!s.learnerOk[r.learnerId]) continue;
      const f = monthOverlap(r.month, s.start, s.end);
      if (f <= 0) continue;
      car[r.carousel].shown += r.shown * ITEMS_PER_CAROUSEL * f;
      r.clicks.forEach((c, i) => {
        car[r.carousel].clicks += c * f;
        pos[i].shown += r.shown * f;
        pos[i].clicks += c * f;
      });
    }
    car.forEach((c) => (c.ctr = ratio(c.clicks, c.shown)));
    pos.forEach((x) => (x.ctr = ratio(x.clicks, x.shown)));

    const viaRec = es.filter((e) => e.viaRec);
    const notRec = es.filter((e) => !e.viaRec);

    const sv = d.surveys.filter((x) => x.answered && s.learnerOk[x.learnerId] && s.courseOk[x.courseId] && s.inRange(x.answerDay));
    const svM = sv.filter((x) => d.enrolments[x.enrolmentId].matched);
    const svO = sv.filter((x) => !d.enrolments[x.enrolmentId].matched);
    const relevance = [1, 2, 3, 4, 5].map((score) => ({
      score: String(score),
      matched: ratio(svM.filter((x) => x.relevance === score).length, svM.length),
      other: ratio(svO.filter((x) => x.relevance === score).length, svO.length),
    }));

    return {
      total: es.length,
      matchedN: matched.length,
      otherN: other.length,
      completion: [
        { group: 'Matches interests', rate: done(matched), n: matched.length },
        { group: 'Does not match', rate: done(other), n: other.length },
      ],
      car: car.map((c) => ({ ...c, shown: Math.round(c.shown), clicks: Math.round(c.clicks) })),
      pos,
      attribution: [
        { group: 'From a recommendation', rate: done(viaRec), n: viaRec.length },
        { group: 'Found another way', rate: done(notRec), n: notRec.length },
      ],
      recShare: ratio(viaRec.length, es.length),
      relevance,
      relM: mean(svM.map((x) => x.relevance)),
      relO: mean(svO.map((x) => x.relevance)),
    };
  }, [s, d]);

  const twoBars = (data: { group: string; rate: number; n: number }[], colors: string[]) => (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, 1]} />
        <YAxis type="category" dataKey="group" {...yAxisProps} width={170} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
        <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="rate" name="Completion rate" radius={HBAR_RADIUS} maxBarSize={24}>
          {data.map((x, i) => (
            <Cell key={x.group} fill={colors[i]} />
          ))}
          <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.primary, fontSize: 13, fontWeight: 700 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <ChartCard id="rc-match">
            <Statistic value={fmtPct(ratio(m.matchedN, m.total))} suffix={<span style={{ fontSize: 14, color: INK.secondary }}>of {fmtInt(m.total)} enrolments</span>} />
            <div style={{ marginTop: 12 }}>
              <SegBar
                parts={[
                  { label: 'Course matches the learner\'s interests', value: m.matchedN, color: SERIES[0] },
                  { label: 'Does not match', value: m.otherN, color: INK.neutralBar, ink: INK.primary },
                ]}
              />
            </div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <ChartCard
            id="rc-matchcompletion"
            table={{ columns: [{ key: 'group', title: 'Enrolment' }, { key: 'n', title: 'Enrolments', align: 'right' }, { key: 'rate', title: 'Completion rate', align: 'right', render: (v: number) => fmtPct(v) }], rows: m.completion }}
            note="Association, not proof: learners who pick courses on their own interests may also be more motivated."
          >
            {twoBars(m.completion, [SERIES[0], INK.neutralBar])}
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="rc-carousel"
            table={{
              columns: [
                { key: 'name', title: 'Carousel' },
                { key: 'shown', title: 'Items shown', align: 'right', render: fmtInt },
                { key: 'clicks', title: 'Clicks', align: 'right', render: fmtInt },
                { key: 'ctr', title: 'Click-through rate', align: 'right', render: (v: number) => fmtPct(v, 1) },
              ],
              rows: m.car,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Click-through rate per "Recommended for you" carousel</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={m.car} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={140} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v, 1), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="ctr" name="Click-through rate" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={20}>
                  <LabelList dataKey="ctr" position="right" formatter={(v: number) => fmtPct(v, 1)} style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="rc-position"
            table={{ columns: [{ key: 'pos', title: 'Position' }, { key: 'ctr', title: 'Click-through rate', align: 'right', render: (v: number) => fmtPct(v, 1) }], rows: m.pos }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Click-through rate by position in the carousel</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={m.pos} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="pos" {...axisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip content={makeTooltip((v) => fmtPct(v, 1))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} labelFormatter={(l) => `Position ${l}`} />
                <Bar dataKey="ctr" name="Click-through rate" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={28}>
                  <LabelList dataKey="ctr" position="top" formatter={(v: number) => fmtPct(v, 1)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="rc-attribution"
            table={{ columns: [{ key: 'group', title: 'Enrolment' }, { key: 'n', title: 'Enrolments', align: 'right' }, { key: 'rate', title: 'Completion rate', align: 'right', render: (v: number) => fmtPct(v) }], rows: m.attribution }}
            note={`${fmtPct(m.recShare)} of enrolments came within 7 days of a click on a recommendation (the attribution window is to be agreed).`}
          >
            {twoBars(m.attribution, [SERIES[0], INK.neutralBar])}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="rc-relevance"
            table={{
              columns: [
                { key: 'score', title: 'Score (1-5)' },
                { key: 'matched', title: 'Matches interests', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'other', title: 'Does not match', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.relevance,
            }}
            note={`Average: ${Number.isFinite(m.relM) ? m.relM.toFixed(1) : '-'} when the course matches the learner's interests, ${Number.isFinite(m.relO) ? m.relO.toFixed(1) : '-'} when it does not.`}
          >
            <Legend
              items={[
                { label: 'Course matches interests', color: SERIES[0] },
                { label: 'Does not match', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.relevance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="score" {...axisProps} />
                <YAxis {...yAxisProps} tickFormatter={pctTick} />
                <Tooltip content={makeTooltip((v) => fmtPct(v))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} labelFormatter={(l) => `Relevance ${l} of 5`} />
                <Bar dataKey="matched" name="Matches interests" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={24} />
                <Bar dataKey="other" name="Does not match" fill={SERIES[1]} radius={BAR_RADIUS} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
