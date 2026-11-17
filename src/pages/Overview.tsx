import { useMemo } from 'react';
import { Row, Col, Card, Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, HBAR_RADIUS, TruncTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean } from '../lib/scope';
import { activityEvents, activeLearners, courseStats, resourceUse, signals } from '../lib/metrics';
import { weekIndexOfDay, weekLabel } from '../lib/time';
import { page } from '../data/registry';
import { SERIES, INK } from '../lib/palette';

const KIND_LABEL: Record<string, string> = {
  course: 'Courses',
  quiz: 'Quizzes',
  topic: 'Content gap',
  language: 'Languages',
  satisfaction: 'Feedback',
};

export default function Overview() {
  const s = useScope();
  const navigate = useNavigate();
  const p = page('overview');

  const m = useMemo(() => {
    const { d } = s;
    const events = activityEvents(s);
    const active = activeLearners(events, s.start, s.end);
    const registered = d.learners.filter((l) => s.learnerOk[l.id] && l.regDay <= s.end).length;
    const newRegs = d.learners.filter((l) => s.learnerOk[l.id] && s.inRange(l.regDay)).length;
    const enrols = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day));
    const completions = enrols.filter((e) => e.completedDay !== null).length;
    const firsts = d.attempts.filter((a) => a.attemptNo === 1 && s.learnerOk[a.learnerId] && s.courseOk[a.courseId] && s.inRange(a.day));
    const ru = resourceUse(s);
    const uses = ru.reduce((a, b) => a + b.uses, 0);
    const sv = d.surveys.filter((x) => x.answered && s.learnerOk[x.learnerId] && s.courseOk[x.courseId] && s.inRange(x.answerDay));

    // weekly active learners
    const w0 = weekIndexOfDay(s.start);
    const w1 = weekIndexOfDay(s.end);
    const sets = new Map<number, Set<number>>();
    for (const e of events) {
      if (e.day < s.start || e.day > s.end) continue;
      const w = weekIndexOfDay(e.day);
      if (!sets.has(w)) sets.set(w, new Set());
      sets.get(w)!.add(e.learnerId);
    }
    const weekly = [];
    for (let w = w0; w <= w1; w++) weekly.push({ week: weekLabel(w), learners: sets.get(w)?.size ?? 0 });

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
      active,
      registered,
      newRegs,
      enrolCount: enrols.length,
      completions,
      completionRate: ratio(completions, enrols.length),
      firstPass: ratio(firsts.filter((a) => a.passed).length, firsts.length),
      uses,
      satisfaction: mean(sv.map((x) => mean(x.scores))),
      svCount: sv.length,
      weekly,
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
      <FilterBar segmentNote="Learner filters do not apply to anonymous view counts: in today's data, resource uses include views by everyone." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="ov-active" value={fmtInt(m.active)} sub={`of ${fmtInt(m.registered)} registered`} />
        <Kpi id="ov-registrations" value={fmtInt(m.newRegs)} sub="in the period" />
        <Kpi id="ov-enrolments" value={fmtInt(m.enrolCount)} sub="in the period" />
        <Kpi id="ov-completion" value={fmtPct(m.completionRate)} sub={`${fmtInt(m.completions)} courses completed`} />
        <Kpi id="ov-firstpass" value={fmtPct(m.firstPass)} sub="learners passing on attempt 1" />
        <Kpi id="ov-resuses" value={fmtInt(m.uses)} sub={s.mode === 'today' ? undefined : 'by logged-in learners'} />
        <Kpi id="ov-satisfaction" value={Number.isFinite(m.satisfaction) ? `${m.satisfaction.toFixed(1)} / 5` : '-'} sub={`${fmtInt(m.svCount)} answers`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard id="ov-weekly" table={{ columns: [{ key: 'week', title: 'Week starting' }, { key: 'learners', title: 'Active learners', align: 'right' }], rows: m.weekly }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={m.weekly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week" {...axisProps} minTickGap={28} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} />
                <Area type="monotone" dataKey="learners" name="Active learners" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: '#fcfcfb', strokeWidth: 2 }} />
              </AreaChart>
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
