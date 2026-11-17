import { useMemo } from 'react';
import { Row, Col, Select, Table, Tag, Tooltip as AntTooltip } from 'antd';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ReferenceArea,
  ZAxis,
} from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, InlineBar, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, BAR_RADIUS } from '../components/viz';
import { useScope, fmtPct, mean } from '../lib/scope';
import { quizStats, questionStats, ZONE_META, type QuestionStat } from '../lib/metrics';
import { useStore } from '../lib/store';
import { QTYPES, QTYPE_KEY } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK, STATUS_COLORS } from '../lib/palette';

function discColor(v: number) {
  if (!Number.isFinite(v)) return INK.muted;
  if (v < 0.05) return STATUS_COLORS.critical;
  if (v < 0.2) return STATUS_COLORS.warning;
  return STATUS_COLORS.good;
}

interface MapPoint {
  x: number;
  y: number;
  text: string;
  type: string;
  course: string;
  zone: QuestionStat['zone'];
}

function MapTooltip({ active, payload }: { active?: boolean; payload?: { payload: MapPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="viz-tooltip" style={{ maxWidth: 320 }}>
      <div className="tt-title">{p.text}</div>
      <div style={{ color: INK.secondary, marginBottom: 4 }}>
        {p.type} · {p.course}
      </div>
      <div className="tt-row">
        <span className="tt-key">Answered correctly</span>
        <span className="tt-val">{fmtPct(p.x)}</span>
      </div>
      <div className="tt-row">
        <span className="tt-key">Discrimination</span>
        <span className="tt-val">{p.y.toFixed(2)}</span>
      </div>
      <div className="tt-row">
        <span className="tt-key">
          <span className="tt-swatch" style={{ background: ZONE_META[p.zone].color }} />
          {ZONE_META[p.zone].label}
        </span>
      </div>
    </div>
  );
}

export default function Quizzes() {
  const s = useScope();
  const p = page('quizzes');
  const courseId = useStore((x) => x.courseId);
  const setCourse = useStore((x) => x.setCourse);
  const quizId = useStore((x) => x.quizId);
  const setQuiz = useStore((x) => x.setQuiz);
  const { d } = s;

  const inScope = d.courses.filter((c) => s.courseOk[c.id]);
  const selectedCourse = inScope.find((c) => c.id === courseId) ?? inScope[0];
  const courseQuizzes = selectedCourse ? d.quizzes.filter((q) => q.courseId === selectedCourse.id) : [];
  const selectedQuiz = courseQuizzes.find((q) => q.id === quizId) ?? courseQuizzes[0];

  const m = useMemo(() => {
    const qs = quizStats(s);
    const items = questionStats(s);

    // attempts needed to pass, per learner and quiz
    const buckets = [0, 0, 0, 0];
    const perLQ = new Map<string, number>();
    for (const a of d.attempts) {
      if (!a.passed || !s.learnerOk[a.learnerId] || !s.courseOk[a.courseId] || !s.inRange(a.day)) continue;
      perLQ.set(`${a.learnerId}:${a.quizId}`, a.attemptNo);
    }
    for (const n of perLQ.values()) buckets[Math.min(n, 4) - 1]++;
    const attemptsData = ['1', '2', '3', '4+'].map((label, i) => ({ label, learners: buckets[i] }));

    // score distribution for the selected quiz
    const hist = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}-${i * 10 + 9}`, from: i * 10, learners: 0 }));
    hist[9].bin = '90-100';
    if (selectedQuiz) {
      for (const a of d.attempts) {
        if (a.quizId !== selectedQuiz.id || a.attemptNo !== 1 || !s.learnerOk[a.learnerId] || !s.inRange(a.day)) continue;
        hist[Math.min(9, Math.floor(a.scorePct / 10))].learners++;
      }
    }

    // question types
    const types = QTYPES.map((t) => {
      const its = items.filter((x) => x.q.type === t);
      return {
        type: t,
        key: QTYPE_KEY[t],
        questions: its.length,
        pCorrect: mean(its.map((x) => x.pCorrect)),
        disc: mean(its.map((x) => x.discrimination)),
        flagged: its.filter((x) => x.zone === 'check').length,
      };
    }).filter((t) => t.questions > 0);

    const points: MapPoint[] = items.map((x) => ({
      x: x.pCorrect,
      y: x.discrimination,
      text: x.q.text,
      type: x.q.type,
      course: d.courses[x.q.courseId].title,
      zone: x.zone,
    }));

    const order: Record<QuestionStat['zone'], number> = { check: 0, hard: 1, easy: 2, good: 3 };
    const review = items
      .filter((x) => x.zone !== 'good' || x.q.why)
      .filter((x) => x.n >= 12)
      .sort((a, b) => order[a.zone] - order[b.zone] || (a.q.why ? 0 : 1) - (b.q.why ? 0 : 1) || a.discrimination - b.discrimination)
      .slice(0, 14)
      .map((x) => {
        const quiz = d.quizzes[x.q.quizId];
        return {
          key: x.q.id,
          text: x.q.text,
          where: `${d.courses[x.q.courseId].title} · ${quiz.title.split(':')[0]}`,
          type: x.q.type,
          pCorrect: x.pCorrect,
          disc: x.discrimination,
          wrong: x.q.wrongAnswer,
          zone: x.zone,
          todo: x.q.why ?? ZONE_META[x.zone].advice,
        };
      });

    const quizzesInScope = d.quizzes.filter((q) => s.courseOk[q.courseId]);
    const statsOn = quizzesInScope.filter((q) => q.statsOn).length;

    const quizRows = qs
      .filter((q) => q.attempts > 0)
      .map((q) => {
        const quiz = d.quizzes[q.quizId];
        return { ...q, title: quiz.title, course: d.courses[quiz.courseId].title, passMark: quiz.passMark, statsOn: quiz.statsOn };
      })
      .sort((a, b) => (a.firstPass || 0) - (b.firstPass || 0));

    return { attemptsData, hist, types, points, review, statsOn, total: quizzesInScope.length, quizRows };
  }, [s, selectedQuiz, d]);

  const extra = (
    <>
      <Select
        style={{ width: 300 }}
        value={selectedCourse?.id}
        onChange={(v) => setCourse(v)}
        options={inScope.map((c) => ({ value: c.id, label: c.title }))}
        prefix={<span className="filter-label">Course</span>}
      />
      <Select
        style={{ width: 280 }}
        value={selectedQuiz?.id}
        onChange={(v) => setQuiz(v)}
        options={courseQuizzes.map((q) => ({ value: q.id, label: q.title }))}
        prefix={<span className="filter-label">Quiz</span>}
      />
    </>
  );

  const zones = (['good', 'easy', 'hard', 'check'] as const).map((z) => ({ label: ZONE_META[z].label, color: ZONE_META[z].color }));

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar extra={extra} />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard id="qz-table" note="Sorted with the lowest first-attempt pass rate first. Click a quiz to see its score distribution.">
            <Table
              size="small"
              rowKey="quizId"
              dataSource={m.quizRows}
              pagination={{ pageSize: 7, size: 'small', showSizeChanger: false }}
              scroll={{ x: 900 }}
              rowClassName={(r) => (r.quizId === selectedQuiz?.id ? 'ant-table-row-selected clickable-row' : 'clickable-row')}
              onRow={(r) => ({
                onClick: () => {
                  setCourse(d.quizzes[r.quizId].courseId);
                  setQuiz(r.quizId);
                },
              })}
              columns={[
                {
                  title: 'Quiz',
                  dataIndex: 'title',
                  render: (t: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>
                        {r.course}
                        {!r.statsOn ? (
                          <AntTooltip title="Quiz statistics are switched off: no question-level data">
                            <Tag style={{ marginLeft: 6, fontSize: 10.5 }}>statistics off</Tag>
                          </AntTooltip>
                        ) : null}
                      </div>
                    </div>
                  ),
                },
                { title: 'Learners', dataIndex: 'learners', align: 'right', sorter: (a, b) => a.learners - b.learners },
                { title: 'Attempts', dataIndex: 'attempts', align: 'right', sorter: (a, b) => a.attempts - b.attempts },
                {
                  title: 'First-attempt pass',
                  dataIndex: 'firstPass',
                  width: 170,
                  sorter: (a, b) => (a.firstPass || 0) - (b.firstPass || 0),
                  render: (v: number) => <InlineBar value={v} label={fmtPct(v)} />,
                },
                { title: 'Final pass', dataIndex: 'finalPass', align: 'right', render: (v: number) => fmtPct(v), sorter: (a, b) => (a.finalPass || 0) - (b.finalPass || 0) },
                {
                  title: 'Attempts to pass',
                  dataIndex: 'avgAttemptsToPass',
                  align: 'right',
                  render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-'),
                  sorter: (a, b) => (a.avgAttemptsToPass || 0) - (b.avgAttemptsToPass || 0),
                },
                { title: 'Avg first score', dataIndex: 'avgFirstScore', align: 'right', render: (v: number) => fmtPct(v) },
                { title: 'Pass mark', dataIndex: 'passMark', align: 'right', render: (v: number) => `${v}%` },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={9}>
          <ChartCard id="qz-attempts" table={{ columns: [{ key: 'label', title: 'Attempts' }, { key: 'learners', title: 'Learners', align: 'right' }], rows: m.attemptsData }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={m.attemptsData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="learners" name="Learners who passed" radius={BAR_RADIUS} maxBarSize={36} fill={SERIES[0]}>
                  <LabelList dataKey="learners" position="top" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-note">Learners who passed a quiz, by the attempt on which they passed.</div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={15}>
          <ChartCard id="qz-scores" table={{ columns: [{ key: 'bin', title: 'Score %' }, { key: 'learners', title: 'Learners', align: 'right' }], rows: m.hist }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              {selectedQuiz?.title} <span style={{ fontWeight: 400, color: INK.secondary }}>· pass mark {selectedQuiz?.passMark}%</span>
            </div>
            {m.hist.some((h) => h.learners > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={m.hist} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="from" {...axisProps} tickFormatter={(v) => `${v}%`} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} labelFormatter={() => ''} />
                  <ReferenceLine
                    x={Math.floor((selectedQuiz?.passMark ?? 70) / 10) * 10}
                    stroke={INK.primary}
                    strokeWidth={1}
                    label={{ value: 'Pass mark', position: 'top', fill: INK.secondary, fontSize: 11 }}
                  />
                  <Bar dataKey="learners" name="Learners (first attempt)" fill={SERIES[0]} radius={BAR_RADIUS} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard
            id="qz-types"
            note={`Question-level data covers ${m.statsOn} of ${m.total} quizzes: the others have LearnDash "statistics" switched off. Discrimination: how strongly getting a question right goes with doing well on the rest of the quiz, from -1 to 1. Above 0.2 is good; below 0.05 the question does not tell strong and weak learners apart.`}
          >
            <Table
              size="small"
              rowKey="type"
              dataSource={m.types}
              pagination={false}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: 'Question type',
                  dataIndex: 'type',
                  render: (t: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 11.5, color: INK.muted }}>{r.key}</div>
                    </div>
                  ),
                },
                { title: 'Questions', dataIndex: 'questions', align: 'right' },
                { title: 'Answered correctly', dataIndex: 'pCorrect', width: 220, render: (v: number) => <InlineBar value={v} label={fmtPct(v)} /> },
                {
                  title: 'Discrimination',
                  dataIndex: 'disc',
                  width: 220,
                  render: (v: number) => <InlineBar value={Math.max(0, v)} max={0.6} color={discColor(v)} label={Number.isFinite(v) ? v.toFixed(2) : '-'} />,
                },
                {
                  title: 'Flagged',
                  dataIndex: 'flagged',
                  align: 'right',
                  render: (v: number, r) => (v > 0 ? <Tag color="red">{`${v} of ${r.questions}`}</Tag> : <span style={{ color: INK.muted }}>0</span>),
                },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={11}>
          <ChartCard id="qz-map">
            <Legend items={zones} />
            {m.points.length ? (
              <ResponsiveContainer width="100%" height={330}>
                <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 18 }}>
                  <CartesianGrid stroke={INK.grid} />
                  <ReferenceArea x1={0} x2={1} y1={-0.8} y2={0.05} fill={STATUS_COLORS.critical} fillOpacity={0.05} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, 1]}
                    {...axisProps}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    label={{ value: 'Answered correctly (difficulty)', position: 'insideBottom', offset: -10, fill: INK.muted, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[-0.8, 1]}
                    ticks={[-0.8, -0.4, 0, 0.4, 0.8]}
                    {...yAxisProps}
                    tickFormatter={(v) => v.toFixed(1)}
                    label={{ value: 'Discrimination', angle: -90, position: 'insideLeft', fill: INK.muted, fontSize: 11 }}
                  />
                  <ZAxis range={[60, 60]} />
                  <ReferenceLine y={0.05} stroke={INK.axis} />
                  <Tooltip content={<MapTooltip />} cursor={false} />
                  {(['good', 'easy', 'hard', 'check'] as const).map((z) => (
                    <Scatter key={z} name={ZONE_META[z].label} data={m.points.filter((pt) => pt.zone === z)} fill={ZONE_META[z].color} stroke="#fcfcfb" strokeWidth={2} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <NoData text="Not enough attempts for question-level analysis with these filters." />
            )}
            <div className="chart-note">Each dot is a question. Up = separates strong from weak learners better. The shaded band at the bottom is where wording or the answer key should be checked.</div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={13}>
          <ChartCard id="qz-review">
            {m.review.length ? (
              <Table
                size="small"
                rowKey="key"
                dataSource={m.review}
                pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                columns={[
                  {
                    title: 'Question',
                    dataIndex: 'text',
                    render: (t: string, r) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{t}</div>
                        <div style={{ fontSize: 12, color: INK.secondary }}>
                          {r.type} · {r.where}
                        </div>
                        <div style={{ fontSize: 12, color: INK.secondary, marginTop: 2 }}>
                          Most chosen wrong answer: <i>{r.wrong}</i>
                        </div>
                        <div style={{ fontSize: 12.5, marginTop: 4 }}>{r.todo}</div>
                      </div>
                    ),
                  },
                  { title: 'Correct', dataIndex: 'pCorrect', align: 'right', render: (v: number) => fmtPct(v) },
                  { title: 'Discr.', dataIndex: 'disc', align: 'right', render: (v: number) => <span style={{ color: discColor(v), fontWeight: 700 }}>{v.toFixed(2)}</span> },
                  {
                    title: 'Verdict',
                    dataIndex: 'zone',
                    render: (z: QuestionStat['zone']) => (
                      <Tag color={z === 'check' ? 'red' : z === 'hard' ? 'gold' : z === 'easy' ? 'default' : 'blue'}>{ZONE_META[z].label}</Tag>
                    ),
                  },
                ]}
              />
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}

