import { useMemo } from 'react';
import { Row, Col, Select, Table, Slider, Tag, Tooltip as AntTooltip, Space, Statistic } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, AreaChart, Area } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, InlineBar, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, BAR_RADIUS, pctTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, median } from '../lib/scope';
import { courseStats } from '../lib/metrics';
import { useStore } from '../lib/store';
import { monthIndexOfDay, monthLabel, weekIndexOfDay, weekLabel, formatDay, TODAY } from '../lib/time';
import { AREAS } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, ORDINAL, INK, areaColor, STATUS_COLORS } from '../lib/palette';

export default function Courses() {
  const s = useScope();
  const p = page('courses');
  const courseId = useStore((x) => x.courseId);
  const setCourse = useStore((x) => x.setCourse);
  const riskDays = useStore((x) => x.riskDays);
  const setRiskDays = useStore((x) => x.setRiskDays);
  const { d } = s;

  const inScope = d.courses.filter((c) => s.courseOk[c.id]);
  const selected = inScope.find((c) => c.id === courseId) ?? inScope[0];

  const m = useMemo(() => {
    const stats = courseStats(s);
    const m0 = monthIndexOfDay(s.start);
    const m1 = monthIndexOfDay(s.end);
    const monthly: Record<string, number | string>[] = [];
    for (let mi = m0; mi <= m1; mi++) {
      const row: Record<string, number | string> = { month: monthLabel(mi) };
      AREAS.forEach((a) => (row[a.name] = 0));
      monthly.push(row);
    }
    for (const e of d.enrolments) {
      if (!s.learnerOk[e.learnerId] || !s.courseOk[e.courseId] || !s.inRange(e.day)) continue;
      const row = monthly[monthIndexOfDay(e.day) - m0];
      const area = AREAS[d.courses[e.courseId].areaId].name;
      row[area] = (row[area] as number) + 1;
    }
    const areasShown = AREAS.filter((a) => s.filters.area === null || a.id === s.filters.area);

    let funnel: { label: string; value: number }[] = [];
    let lessons: { lesson: string; title: string; share: number; count: number; drop: number }[] = [];
    let time: { lesson: string; title: string; minutes: number }[] = [];
    if (selected) {
      const es = d.enrolments.filter((e) => e.courseId === selected.id && s.learnerOk[e.learnerId] && s.inRange(e.day));
      const nL = selected.lessonIds.length;
      funnel = [
        { label: 'Enrolled', value: es.length },
        { label: 'Started', value: es.filter((e) => e.started).length },
        { label: 'Finished lesson 1', value: es.filter((e) => e.lessonsDone >= 1).length },
        { label: 'Half the lessons', value: es.filter((e) => e.lessonsDone >= Math.ceil(nL / 2)).length },
        { label: 'Completed', value: es.filter((e) => e.completedDay !== null).length },
      ];
      const startedCount = es.filter((e) => e.started).length;
      lessons = selected.lessonIds.map((lid, i) => {
        const count = es.filter((e) => e.lessonsDone > i).length;
        const prev = i === 0 ? startedCount : es.filter((e) => e.lessonsDone > i - 1).length;
        return { lesson: `L${i + 1}`, title: d.lessons[lid].title, count, share: ratio(count, es.length), drop: prev ? 1 - count / prev : 0 };
      });
      // timer totals have no dates: every enrolment counts, whatever the period
      const all = d.enrolments.filter((e) => e.courseId === selected.id && s.learnerOk[e.learnerId]);
      time = selected.lessonIds.map((lid, i) => ({
        lesson: `L${i + 1}`,
        title: d.lessons[lid].title,
        minutes: Math.round(median(all.filter((e) => e.timerMin.length > i).map((e) => e.timerMin[i]))) || 0,
      }));
    }
    let maxDropIdx = -1;
    lessons.forEach((l, i) => {
      if (i > 0 && (maxDropIdx < 0 || l.drop > lessons[maxDropIdx].drop)) maxDropIdx = i;
    });

    const w0 = weekIndexOfDay(s.start);
    const w1 = weekIndexOfDay(s.end);
    const weekMap = new Map<number, number>();
    for (const e of d.enrolments) {
      if (!s.learnerOk[e.learnerId] || !s.courseOk[e.courseId]) continue;
      e.lessonDays.forEach((day, i) => {
        if (!s.inRange(day)) return;
        const w = weekIndexOfDay(day);
        weekMap.set(w, (weekMap.get(w) ?? 0) + (e.timerMin[i] ?? 0));
      });
    }
    const weekly = [];
    for (let w = w0; w <= w1; w++) weekly.push({ week: weekLabel(w), hours: Math.round((weekMap.get(w) ?? 0) / 6) / 10 });

    const risk = d.enrolments
      .filter(
        (e) =>
          s.learnerOk[e.learnerId] &&
          s.courseOk[e.courseId] &&
          e.completedDay === null &&
          TODAY - e.lastActivityDay >= riskDays &&
          TODAY - e.lastActivityDay < 90,
      )
      .sort((a, b) => b.lastActivityDay - a.lastActivityDay)
      .map((e) => ({
        key: e.id,
        learner: d.learners[e.learnerId].code,
        course: d.courses[e.courseId].title,
        progress: `${e.lessonsDone} of ${d.courses[e.courseId].lessonIds.length} lessons`,
        last: formatDay(e.lastActivityDay),
        days: TODAY - e.lastActivityDay,
      }));
    const dropped = d.enrolments.filter(
      (e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && e.completedDay === null && TODAY - e.lastActivityDay >= 90,
    ).length;

    return { stats, monthly, areasShown, funnel, lessons, maxDropIdx, time, weekly, risk, dropped };
  }, [s, selected, riskDays, d]);

  const courseSelect = (
    <Select
      style={{ width: 320 }}
      value={selected?.id}
      onChange={(v) => setCourse(v)}
      options={inScope.map((c) => ({ value: c.id, label: c.title }))}
      placeholder="Course"
      prefix={<span className="filter-label">Course</span>}
    />
  );

  const tableRows = m.stats
    .map((cs) => ({ ...cs, title: d.courses[cs.courseId].title, lang: d.courses[cs.courseId].lang, area: AREAS[d.courses[cs.courseId].areaId].name }))
    .sort((a, b) => b.enrolments - a.enrolments);

  const bigDrop = m.maxDropIdx > 0 && m.lessons[m.maxDropIdx].drop > 0.15;

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar extra={courseSelect} />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard id="co-table">
            <Table
              size="small"
              rowKey="courseId"
              dataSource={tableRows}
              pagination={false}
              scroll={{ x: 900 }}
              rowClassName={(r) => (r.courseId === selected?.id ? 'ant-table-row-selected clickable-row' : 'clickable-row')}
              onRow={(r) => ({ onClick: () => setCourse(r.courseId) })}
              columns={[
                {
                  title: 'Course',
                  dataIndex: 'title',
                  render: (t: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: areaColor(d.courses[r.courseId].areaId), marginRight: 6 }} />
                        {r.area} · {r.lang}
                      </div>
                    </div>
                  ),
                },
                { title: 'Enrolments', dataIndex: 'enrolments', align: 'right', sorter: (a, b) => a.enrolments - b.enrolments },
                { title: 'Active in period', dataIndex: 'activeLearners', align: 'right', sorter: (a, b) => a.activeLearners - b.activeLearners },
                {
                  title: 'Completion rate',
                  dataIndex: 'completionRate',
                  width: 170,
                  sorter: (a, b) => (a.completionRate || 0) - (b.completionRate || 0),
                  render: (v: number) => <InlineBar value={v} label={fmtPct(v)} />,
                },
                {
                  title: 'Median days to complete',
                  dataIndex: 'medianDays',
                  align: 'right',
                  render: (v: number) => (Number.isFinite(v) ? Math.round(v) : '-'),
                  sorter: (a, b) => (a.medianDays || 0) - (b.medianDays || 0),
                },
                { title: 'First-attempt pass', dataIndex: 'firstPass', align: 'right', render: (v: number) => fmtPct(v), sorter: (a, b) => (a.firstPass || 0) - (b.firstPass || 0) },
                {
                  title: 'Satisfaction',
                  dataIndex: 'satisfaction',
                  align: 'right',
                  render: (v: number) =>
                    s.mode === 'today' ? (
                      <AntTooltip title="Needs the course survey">
                        <LockOutlined style={{ color: INK.muted }} />
                      </AntTooltip>
                    ) : Number.isFinite(v) ? (
                      `${v.toFixed(1)} / 5`
                    ) : (
                      '-'
                    ),
                  sorter: (a, b) => (a.satisfaction || 0) - (b.satisfaction || 0),
                },
              ]}
            />
            <div className="chart-note">Click a course to see its funnel and lessons below. Completion rate counts the enrolments made in the period.</div>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard
            id="co-monthly"
            table={{ columns: [{ key: 'month', title: 'Month' }, ...m.areasShown.map((a) => ({ key: a.name, title: a.name, align: 'right' as const }))], rows: m.monthly }}
          >
            <Legend items={m.areasShown.map((a) => ({ label: a.name, color: areaColor(a.id) }))} />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={m.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {m.areasShown.map((a, i) => (
                  <Bar
                    key={a.id}
                    dataKey={a.name}
                    stackId="areas"
                    fill={areaColor(a.id)}
                    stroke="#fcfcfb"
                    strokeWidth={1}
                    maxBarSize={28}
                    radius={i === m.areasShown.length - 1 ? BAR_RADIUS : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={11}>
          <ChartCard id="co-funnel" table={{ columns: [{ key: 'label', title: 'Stage' }, { key: 'value', title: 'Learners', align: 'right' }], rows: m.funnel }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{selected?.title}</div>
            {m.funnel.length && m.funnel[0].value > 0 ? (
              m.funnel.map((f, i) => {
                const w = ratio(f.value, m.funnel[0].value);
                return (
                  <div className="funnel-row" key={f.label}>
                    <span className="funnel-label">{f.label}</span>
                    <div className="funnel-track">
                      <div className="funnel-fill" style={{ width: `${w * 100}%`, background: ORDINAL[i] }} />
                    </div>
                    <span className="funnel-val">
                      {fmtInt(f.value)}
                      <small>{fmtPct(w)}</small>
                    </span>
                  </div>
                );
              })
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={13}>
          <ChartCard
            id="co-lessons"
            table={{
              columns: [
                { key: 'lesson', title: 'Lesson' },
                { key: 'title', title: 'Title' },
                { key: 'count', title: 'Learners who finished it', align: 'right' },
                { key: 'share', title: 'Share of enrolled', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.lessons,
            }}
            note={
              bigDrop ? (
                <span>
                  <span style={{ color: STATUS_COLORS.critical, fontWeight: 700 }}>Largest fall:</span> {Math.round(m.lessons[m.maxDropIdx].drop * 100)}% of learners who finished lesson {m.maxDropIdx} did not finish lesson{' '}
                  {m.maxDropIdx + 1} ("{m.lessons[m.maxDropIdx].title}").
                </span>
              ) : null
            }
          >
            {m.lessons.length && m.funnel[0]?.value ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={m.lessons} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lesson" {...axisProps} />
                  <YAxis {...yAxisProps} tickFormatter={pctTick} domain={[0, 1]} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'title')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="share" name="Finished this lesson" radius={BAR_RADIUS} maxBarSize={24}>
                    {m.lessons.map((l, i) => (
                      <Cell key={l.lesson} fill={bigDrop && i === m.maxDropIdx ? STATUS_COLORS.critical : SERIES[0]} />
                    ))}
                    <LabelList dataKey="share" position="top" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
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
            id="co-time"
            table={{ columns: [{ key: 'lesson', title: 'Lesson' }, { key: 'title', title: 'Title' }, { key: 'minutes', title: 'Median minutes', align: 'right' }], rows: m.time }}
            note="From the course timer: total time per learner and lesson. It has no dates, so the period filter does not apply."
          >
            {m.time.some((t) => t.minutes > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={m.time} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lesson" {...axisProps} />
                  <YAxis {...yAxisProps} unit=" m" />
                  <Tooltip content={makeTooltip((v) => `${v} min`, 'title')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="minutes" name="Median time" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={24}>
                    <LabelList dataKey="minutes" position="top" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="co-timeweek" table={{ columns: [{ key: 'week', title: 'Week starting' }, { key: 'hours', title: 'Hours', align: 'right' }], rows: m.weekly }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={m.weekly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week" {...axisProps} minTickGap={28} />
                <YAxis {...yAxisProps} unit=" h" />
                <Tooltip content={makeTooltip((v) => `${v} h`)} />
                <Area type="monotone" dataKey="hours" name="Learning time" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard
            id="co-risk"
            extra={
              <Space size={32} wrap style={{ marginBottom: 12, alignItems: 'center' }}>
                <div style={{ width: 300 }}>
                  <div className="filter-label">No activity for at least {riskDays} days</div>
                  <Slider min={7} max={60} step={1} value={riskDays} onChange={(v) => setRiskDays(v as number)} marks={{ 7: '7', 14: '14', 30: '30', 60: '60' }} />
                </div>
                <Statistic title="At risk (inactive under 90 days)" value={m.risk.length} />
                <Statistic title="Dropped (inactive 90+ days)" value={m.dropped} />
              </Space>
            }
          >
            <Table
              size="small"
              dataSource={m.risk}
              pagination={{ pageSize: 6, size: 'small', showSizeChanger: false }}
              columns={[
                { title: 'Learner', dataIndex: 'learner', render: (v: string) => <Tag>{v}</Tag> },
                { title: 'Course', dataIndex: 'course' },
                { title: 'Progress', dataIndex: 'progress' },
                { title: 'Last activity', dataIndex: 'last' },
                { title: 'Days inactive', dataIndex: 'days', align: 'right' },
              ]}
            />
            <div className="chart-note">Learner IDs are pseudonymous, as in the reporting system. Contacting a learner happens in WordPress.</div>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
