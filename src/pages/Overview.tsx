import { useMemo } from 'react';
import { Row, Col, Card, Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, NoData, Legend, LayerChip } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, HBAR_RADIUS, TruncTick, pctTick, makeTooltip } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean } from '../lib/scope';
import { activityEvents, monthlyActive, monthlyHeadline, courseStats, resourceUse, signals, triangulation, completionEligible, COMPLETION_MIN_AGE } from '../lib/metrics';
import { monthOverlap } from '../lib/metrics';
import { TODAY } from '../lib/time';
import { page, type Layer } from '../data/registry';
import { SERIES, INK } from '../lib/palette';
import type { ReactNode } from 'react';

const KIND_LABEL: Record<string, string> = {
  course: 'Courses',
  quiz: 'Quizzes',
  topic: 'Content gap',
  language: 'Languages',
  satisfaction: 'Feedback',
  search: 'Content gap',
  triangulation: 'Triangulation',
};

function Group({ layers, title, n, children }: { layers: Layer[]; title: string; n: number; children: ReactNode }) {
  return (
    <div className="kpi-group" style={{ flex: `${n} 1 ${n * 220}px` }}>
      <div className="kpi-group-head">
        {layers.map((l) => (
          <LayerChip key={l} layer={l} compact />
        ))}
        <span>{title}</span>
      </div>
      <div className="kpi-grid">{children}</div>
    </div>
  );
}

export default function Overview() {
  const s = useScope();
  const navigate = useNavigate();
  const p = page('overview');

  const m = useMemo(() => {
    const { d } = s;
    const events = activityEvents(s);
    const monthly = monthlyActive(s, events);
    const head = monthlyHeadline(monthly);
    const registered = d.learners.filter((l) => s.learnerOk[l.id] && l.regDay <= s.end).length;
    const newRegs = d.learners.filter((l) => s.learnerOk[l.id] && s.inRange(l.regDay)).length;
    const enrols = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day));
    const eligible = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && completionEligible(s, e.day));
    const completions = eligible.filter((e) => e.completedDay !== null).length;
    const firsts = d.attempts.filter((a) => a.attemptNo === 1 && s.learnerOk[a.learnerId] && s.courseOk[a.courseId] && s.inRange(a.day));
    const ru = resourceUse(s);
    // resources opened and downloaded by learners (today: downloads only)
    const learnerRes = d.resEvents.filter((e) => s.learnerOk[e.learnerId] && s.resourceOk[e.resourceId] && s.inRange(e.day) && (s.mode === 'proposed' || e.kind === 'download'));
    const activeIds = new Set(events.filter((e) => s.inRange(e.day)).map((e) => e.learnerId));
    const tutorIds = new Set(d.tutorConvs.filter((t) => s.learnerOk[t.learnerId] && s.inRange(t.day)).map((t) => t.learnerId));
    // recommendation uptake: items shown -> enrolments from a recommendation
    let shown = 0;
    for (const r of d.recStats) {
      if (!s.learnerOk[r.learnerId]) continue;
      const f = monthOverlap(r.month, s.start, s.end);
      if (f > 0) shown += r.shown * 8 * f;
    }
    const recEnrols = enrols.filter((e) => e.viaRec).length;
    const sv = d.surveys.filter((x) => x.answered && s.learnerOk[x.learnerId] && s.courseOk[x.courseId] && s.inRange(x.answerDay));
    const ps = d.platformSurveys.filter((x) => x.answered && s.learnerOk[x.learnerId]);
    const lastWave = Math.max(-1, ...ps.map((x) => x.wave));
    const psLast = ps.filter((x) => x.wave === lastWave);
    const nps = ratio(psLast.filter((x) => x.nps >= 9).length - psLast.filter((x) => x.nps <= 6).length, psLast.length) * 100;
    const fu = d.followUps.filter((f) => f.wave === 0 && s.learnerOk[f.learnerId] && s.courseOk[f.courseId]);
    const fuAns = fu.filter((f) => f.answered);
    const tri = triangulation(s);

    const topCourses = courseStats(s)
      .filter((c) => c.enrolments > 0)
      .sort((a, b) => b.enrolments - a.enrolments)
      .slice(0, 6)
      .map((c) => ({ name: d.courses[c.courseId].title, value: c.enrolments }));
    const topRes = [...ru]
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 6)
      .filter((r) => r.uses > 0)
      .map((r) => ({ name: d.resources[r.resourceId].title, value: r.uses }));

    return {
      head,
      monthly,
      registered,
      newRegs,
      completions,
      eligible: eligible.length,
      completionRate: ratio(completions, eligible.length),
      firstPass: ratio(firsts.filter((a) => a.passed).length, firsts.length),
      resPerLearner: ratio(learnerRes.length, activeIds.size),
      tutorAdoption: ratio([...tutorIds].filter((id) => activeIds.has(id)).length, activeIds.size),
      tutorUsers: tutorIds.size,
      recUptake: ratio(recEnrols, shown),
      recEnrols,
      shown,
      satisfaction: mean(sv.map((x) => x.scores[0])),
      learning: mean(sv.map((x) => x.scores[2])),
      svCount: sv.length,
      nps,
      npsN: psLast.length,
      applying: ratio(fuAns.filter((f) => f.use <= 1).length, fuAns.length),
      fuRate: ratio(fuAns.length, fu.length),
      fuN: fuAns.length,
      strong: tri.filter((t) => t.verdict === 'strong').length,
      triAreas: tri.length,
      topCourses,
      topRes,
      signals: signals(s),
    };
  }, [s]);

  const hbar = (data: { name: string; value: number }[], color: string) =>
    data.length ? (
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" {...yAxisProps} width={235} tick={<TruncTick />} interval={0} />
          <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="value" name="Count" fill={color} radius={HBAR_RADIUS} maxBarSize={20}>
            <LabelList dataKey="value" position="right" style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <NoData />
    );

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar segmentNote="Learner filters do not apply to anonymous page views: in today's data, the most used resources include views by everyone." />

      <div className="kpi-groups">
        <Group layers={['L1', 'L2']} title="Reach and use" n={4}>
          <Kpi id="ov-registered" value={fmtInt(m.registered)} sub={`${fmtInt(m.newRegs)} new in the period`} />
          <Kpi id="ov-mal" value={fmtInt(m.head.avgActive)} sub={`average per month, ${m.head.from}-${m.head.to}`} />
          <Kpi id="ov-return" value={fmtPct(m.head.avgReturn)} sub="of last month's active learners came back" />
          <Kpi id="ov-resperlearner" value={Number.isFinite(m.resPerLearner) ? m.resPerLearner.toFixed(1) : '-'} sub={s.mode === 'today' ? 'downloads per active learner' : 'opened or downloaded, per active learner'} />
        </Group>
        <Group layers={['L2']} title="Learning, tutor and recommendations" n={4}>
          <Kpi id="ov-completion" value={fmtPct(m.completionRate)} sub={`${fmtInt(m.completions)} of ${fmtInt(m.eligible)} enrolments that reached ${COMPLETION_MIN_AGE} days in the period`} />
          <Kpi id="ov-firstpass" value={fmtPct(m.firstPass)} sub="pass on attempt 1: read with completion" />
          <Kpi id="ov-tutor" value={fmtPct(m.tutorAdoption)} sub={`${fmtInt(m.tutorUsers)} learners talked to Kappa`} />
          <Kpi id="ov-recuptake" value={`${(m.recUptake * 1000).toFixed(1)}‰`} sub={`${fmtInt(m.recEnrols)} enrolments from ${fmtInt(m.shown)} items shown`} />
        </Group>
        <Group layers={['L3']} title="How useful" n={3}>
          <Kpi id="ov-satisfaction" value={Number.isFinite(m.satisfaction) ? `${m.satisfaction.toFixed(1)} / 5` : '-'} sub={`quality, ${fmtInt(m.svCount)} answers`} />
          <Kpi id="ov-learning" value={Number.isFinite(m.learning) ? `${m.learning.toFixed(1)} / 5` : '-'} sub="increased my understanding" />
          <Kpi id="ov-nps" value={Number.isFinite(m.nps) ? `${m.nps > 0 ? '+' : ''}${Math.round(m.nps)}` : '-'} sub={`net promoter score, ${fmtInt(m.npsN)} answers`} />
        </Group>
        <Group layers={['L4', 'L5']} title="Applied in practice and observed" n={2}>
          <Kpi id="ov-applying" value={fmtPct(m.applying)} sub={`use it in their work at 6 months; ${fmtInt(m.fuN)} answers, ${fmtPct(m.fuRate)} response`} />
          <Kpi id="ov-confirmed" value={`${m.strong} of ${m.triAreas}`} sub="learning areas where all three kinds of evidence agree" />
        </Group>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            id="ov-monthly"
            table={{
              columns: [
                { key: 'month', title: 'Month' },
                { key: 'active', title: 'Active learners', align: 'right' },
                { key: 'returnRate', title: 'Return rate', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.monthly,
            }}
            note="Active: at least one learning action in the month (lesson, quiz, resource opened, tutor conversation); a login alone does not count. Return rate: share of last month's active learners who are active again. The current month is still running."
          >
            <Legend
              items={[
                { label: 'Monthly active learners', color: SERIES[0] },
                { label: 'Return rate', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={m.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis yAxisId="a" {...yAxisProps} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" {...yAxisProps} domain={[0, 1]} tickFormatter={pctTick} />
                <Tooltip content={makeTooltip((v, name) => (name === 'Return rate' ? fmtPct(v) : fmtInt(v)))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar yAxisId="a" dataKey="active" name="Monthly active learners" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {m.monthly.map((r) => (
                    <Cell key={r.mi} fill={SERIES[0]} fillOpacity={r.partial ? 0.4 : 1} />
                  ))}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="returnRate" name="Return rate" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="ov-topcourses" table={{ columns: [{ key: 'name', title: 'Course' }, { key: 'value', title: 'Enrolments', align: 'right' }], rows: m.topCourses }}>
            {hbar(m.topCourses, SERIES[0])}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="ov-topresources" table={{ columns: [{ key: 'name', title: 'Material' }, { key: 'value', title: 'Uses', align: 'right' }], rows: m.topRes }}>
            {hbar(m.topRes, SERIES[0])}
          </ChartCard>
        </Col>
      </Row>

      <div style={{ margin: '24px 0 10px' }}>
        <h2 className="section-title">Worth a look</h2>
        <p className="section-desc">Signals picked out of the data by simple rules. Each one links to the screen with the detail.</p>
      </div>
      <Row gutter={[16, 16]}>
        {m.signals.length ? (
          m.signals.map((sg) => (
            <Col xs={24} md={12} xl={Math.max(6, Math.floor(24 / m.signals.length))} key={sg.key}>
              <Card className="signal-card" hoverable onClick={() => navigate(sg.path)}>
                <span className="signal-kind">{KIND_LABEL[sg.kind]}</span>
                <span className="signal-title">{sg.title}</span>
                <span className="signal-detail">{sg.detail}</span>
                <Button type="link" style={{ padding: 0, alignSelf: 'flex-start' }} icon={<ArrowRightOutlined />} iconPosition="end">
                  See the detail
                </Button>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={24}>
            <Card>
              <NoData text="No signals for these filters." />
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
}
