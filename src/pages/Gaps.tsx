import { useMemo } from 'react';
import { Row, Col, Table, Tag, Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, LabelList, ZAxis, BarChart, Bar } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, DataBadge } from '../components/ui';
import { axisProps, yAxisProps, makeTooltip, pctTick, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtPct, median } from '../lib/scope';
import { topicGaps, langGaps, courseStats, quizStats } from '../lib/metrics';
import { TOPICS, RES_TYPES } from '../data/taxonomy';
import { page, type Status } from '../data/registry';
import { SERIES, INK, rampColor, rampInk, STATUS_COLORS } from '../lib/palette';

interface Pt {
  name: string;
  x: number;
  y: number;
  gap: boolean;
}

function GapTooltip({ active, payload }: { active?: boolean; payload?: { payload: Pt }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="viz-tooltip">
      <div className="tt-title">{p.name}</div>
      <div className="tt-row">
        <span className="tt-key">Learners interested</span>
        <span className="tt-val">{fmtPct(p.x)}</span>
      </div>
      <div className="tt-row">
        <span className="tt-key">Materials available</span>
        <span className="tt-val">{p.y}</span>
      </div>
    </div>
  );
}

export default function Gaps() {
  const s = useScope();
  const p = page('gaps');
  const navigate = useNavigate();
  const { d } = s;

  const m = useMemo(() => {
    const tg = topicGaps(s);
    const medDemand = median(tg.map((t) => t.demandShare));
    const medSupply = median(tg.map((t) => t.supply));
    const pts: Pt[] = tg.map((t) => ({ name: t.name, x: t.demandShare, y: t.supply, gap: t.demandShare >= medDemand && t.supply < medSupply }));
    const lg = langGaps(s).map((l) => ({ ...l }));
    const topics = TOPICS.filter((t) => s.filters.area === null || t.areaId === s.filters.area);
    const format = topics.map((t) => ({
      topic: t.name,
      counts: RES_TYPES.map((rt) => d.resources.filter((r) => r.topicId === t.id && r.type === rt && (!s.filters.contentLang || r.lang === s.filters.contentLang)).length),
    }));
    const formatMax = Math.max(1, ...format.flatMap((f) => f.counts));

    // content to improve
    const items: { key: string; item: string; why: string; value: string; status: Status; path: string }[] = [];
    const cs = courseStats(s).filter((c) => c.enrolments >= 8);
    const medEnrol = median(cs.map((c) => c.enrolments));
    cs.filter((c) => c.enrolments >= medEnrol && c.completionRate < 0.42)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 2)
      .forEach((c) =>
        items.push({
          key: `c${c.courseId}`,
          item: d.courses[c.courseId].title,
          why: 'Popular, but few learners finish it',
          value: `${c.enrolments} enrolments, ${fmtPct(c.completionRate)} complete`,
          status: 'today',
          path: '/courses',
        }),
      );
    const drops: { courseId: number; li: number; drop: number }[] = [];
    for (const c of cs) {
      for (let i = 1; i < c.reachedLesson.length; i++) {
        const a = c.reachedLesson[i - 1];
        if (a < 8) continue;
        drops.push({ courseId: c.courseId, li: i, drop: 1 - c.reachedLesson[i] / a });
      }
    }
    drops
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 2)
      .forEach((x) => {
        const lesson = d.lessons[d.courses[x.courseId].lessonIds[x.li]];
        items.push({
          key: `l${lesson.id}`,
          item: `Lesson ${x.li + 1}: "${lesson.title}"`,
          why: `Steepest fall in "${d.courses[x.courseId].title}"`,
          value: `${Math.round(x.drop * 100)}% of learners stop here`,
          status: 'today',
          path: '/courses',
        });
      });
    quizStats(s)
      .filter((q) => q.learners >= 8)
      .sort((a, b) => a.firstPass - b.firstPass)
      .slice(0, 2)
      .forEach((q) => {
        const quiz = d.quizzes[q.quizId];
        items.push({
          key: `q${q.quizId}`,
          item: quiz.title,
          why: `Hardest quiz in "${d.courses[quiz.courseId].title}"`,
          value: `${fmtPct(q.firstPass)} pass on the first attempt`,
          status: 'today',
          path: '/quizzes',
        });
      });
    if (s.mode === 'proposed') {
      courseStats(s)
        .filter((c) => Number.isFinite(c.satisfaction))
        .sort((a, b) => a.satisfaction - b.satisfaction)
        .slice(0, 1)
        .forEach((c) =>
          items.push({
            key: `s${c.courseId}`,
            item: d.courses[c.courseId].title,
            why: 'Lowest satisfaction',
            value: `${c.satisfaction.toFixed(1)} out of 5`,
            status: 'survey',
            path: '/feedback',
          }),
        );
    }
    return { pts, medDemand, medSupply, lg, format, formatMax, items };
  }, [s, d]);

  const maxX = Math.ceil((Math.max(0.2, ...m.pts.map((x) => x.x)) * 1.08) / 0.05) * 0.05;
  const xTicks = Array.from({ length: Math.round(maxX / 0.05) + 1 }, (_, i) => Math.round(i * 5) / 100);
  const maxY = Math.max(5, ...m.pts.map((x) => x.y)) + 2;

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <ChartCard
            id="gp-demand"
            table={{
              columns: [
                { key: 'name', title: 'Topic' },
                { key: 'x', title: 'Learners interested', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'y', title: 'Materials', align: 'right' },
                { key: 'gap', title: 'Gap', render: (v: boolean) => (v ? <Tag color="red">Wanted, few materials</Tag> : null) },
              ],
              rows: [...m.pts].sort((a, b) => b.x - a.x),
            }}
          >
            <Legend
              items={[
                { label: 'Topic', color: SERIES[0] },
                { label: 'Wanted by many, few materials', color: STATUS_COLORS.critical },
              ]}
            />
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 18 }}>
                <CartesianGrid stroke={INK.grid} />
                <ReferenceArea x1={m.medDemand} x2={maxX} y1={0} y2={m.medSupply} fill={STATUS_COLORS.critical} fillOpacity={0.06} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, maxX]}
                  ticks={xTicks}
                  {...axisProps}
                  tickFormatter={pctTick}
                  label={{ value: 'Share of learners who chose the topic as an interest', position: 'insideBottom', offset: -10, fill: INK.muted, fontSize: 11 }}
                />
                <YAxis type="number" dataKey="y" domain={[0, maxY]} {...yAxisProps} allowDecimals={false} label={{ value: 'Materials', angle: -90, position: 'insideLeft', fill: INK.muted, fontSize: 11 }} />
                <ZAxis range={[70, 70]} />
                <Tooltip content={<GapTooltip />} cursor={false} />
                <Scatter data={m.pts.filter((x) => !x.gap)} fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={2} />
                <Scatter data={m.pts.filter((x) => x.gap)} fill={STATUS_COLORS.critical} stroke="#fcfcfb" strokeWidth={2}>
                  <LabelList
                    dataKey="name"
                    content={(props: { x?: number | string; y?: number | string; value?: number | string }) => (
                      <text x={Number(props.x) + 14} y={Number(props.y) + 8} fill={INK.primary} fontSize={11.5} fontWeight={600}>
                        {String(props.value)}
                      </text>
                    )}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="chart-note">The shaded corner holds topics chosen by more learners than average that have fewer materials than average.</div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            id="gp-lang"
            table={{
              columns: [
                { key: 'lang', title: 'Language' },
                { key: 'learners', title: 'Learners', align: 'right' },
                { key: 'learnerShare', title: 'Share of learners', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'contentItems', title: 'Courses and materials', align: 'right' },
                { key: 'contentShare', title: 'Share of content', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.lg,
            }}
          >
            <Legend
              items={[
                { label: 'Share of learners who prefer it', color: SERIES[0] },
                { label: 'Share of content in it', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={m.lg} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={INK.grid} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={pctTick} />
                <YAxis type="category" dataKey="lang" {...yAxisProps} width={84} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'lang')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="learnerShare" name="Learners" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={14} />
                <Bar dataKey="contentShare" name="Content" fill={SERIES[1]} radius={HBAR_RADIUS} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard
            id="gp-format"
            table={{
              columns: [{ key: 'topic', title: 'Topic' }, ...RES_TYPES.map((t) => ({ key: t, title: t, align: 'right' as const }))],
              rows: m.format.map((f) => Object.fromEntries([['topic', f.topic], ...RES_TYPES.map((t, i) => [t, f.counts[i]])])),
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="heat">
                <thead>
                  <tr>
                    <th />
                    {RES_TYPES.map((t) => (
                      <th className="col" key={t}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.format.map((f) => (
                    <tr key={f.topic}>
                      <th>{f.topic}</th>
                      {f.counts.map((c, i) =>
                        c === 0 ? (
                          <td key={i} className="empty">
                            0
                          </td>
                        ) : (
                          <td key={i} style={{ background: rampColor(0.1 + (c / m.formatMax) * 0.8), color: rampInk(0.1 + (c / m.formatMax) * 0.8) }}>
                            {c}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="chart-note">Number of materials per topic and format. Red cells: no material of that format on that topic.</div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard id="gp-improve">
            <Table
              size="small"
              rowKey="key"
              dataSource={m.items}
              pagination={false}
              columns={[
                {
                  title: 'Item',
                  dataIndex: 'item',
                  render: (t: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>{r.why}</div>
                      <div style={{ fontSize: 12.5, marginTop: 2 }}>{r.value}</div>
                    </div>
                  ),
                },
                { title: 'Data', dataIndex: 'status', render: (st: Status) => <DataBadge status={st} /> },
                {
                  title: '',
                  dataIndex: 'path',
                  render: (path: string) => <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(path)} aria-label="Open the detail" />,
                },
              ]}
            />
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
