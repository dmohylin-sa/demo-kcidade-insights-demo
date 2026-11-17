import { useMemo, useState } from 'react';
import { Row, Col, Select, Table } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, InlineBar, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, BAR_RADIUS, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio } from '../lib/scope';
import { monthIndexOfDay, monthLabel, MONTH_COUNT } from '../lib/time';
import { OCCUPATIONS, WORK_AREAS, AGE_GROUPS, GENDERS, CONTENT_LANGS, ORGANISATIONS, NOT_ANSWERED } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK, rampColor, rampInk } from '../lib/palette';
import type { Learner } from '../data/generate';

type Dim = 'occupation' | 'workArea' | 'ageGroup' | 'gender' | 'prefLang';

const DIMS: { key: Dim; label: string; values: readonly string[]; na: boolean }[] = [
  { key: 'occupation', label: 'Occupation', values: OCCUPATIONS, na: true },
  { key: 'workArea', label: 'Work area', values: WORK_AREAS, na: true },
  { key: 'ageGroup', label: 'Age group', values: AGE_GROUPS, na: true },
  { key: 'gender', label: 'Gender', values: GENDERS, na: true },
  { key: 'prefLang', label: 'Preferred language', values: CONTENT_LANGS, na: false },
];

export default function Learners() {
  const s = useScope();
  const p = page('learners');
  const { d } = s;
  const [dim, setDim] = useState<Dim>('occupation');
  const dimDef = DIMS.find((x) => x.key === dim)!;

  const m = useMemo(() => {
    const ls = d.learners.filter((l) => s.learnerOk[l.id] && l.regDay <= s.end);
    const enrolledSet = new Set(d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId]).map((e) => e.learnerId));
    const registered = ls.length;
    const enrolled = ls.filter((l) => enrolledSet.has(l.id)).length;

    // registrations per month
    const m0 = monthIndexOfDay(s.start);
    const m1 = monthIndexOfDay(s.end);
    const monthly = [];
    for (let mi = m0; mi <= m1; mi++) monthly.push({ month: monthLabel(mi), learners: 0 });
    for (const l of ls) if (s.inRange(l.regDay)) monthly[monthIndexOfDay(l.regDay) - m0].learners++;

    // profile mix and completion by group
    const values = dimDef.na ? [...dimDef.values, NOT_ANSWERED] : [...dimDef.values];
    const val = (l: Learner) => l[dim] as string;
    const mix = values.map((v) => ({ group: v, learners: ls.filter((l) => val(l) === v).length, na: v === NOT_ANSWERED }));
    const segment = values
      .map((v) => {
        const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day) && val(d.learners[e.learnerId]) === v);
        return { group: v, rate: ratio(es.filter((e) => e.completedDay !== null).length, es.length), enrolments: es.length, na: v === NOT_ANSWERED };
      })
      .filter((x) => x.enrolments > 0);

    // cohort grid: registration month x months since registration
    const cohortRows: { cohort: string; size: number; cells: (number | null)[] }[] = [];
    const firstCohort = Math.max(0, MONTH_COUNT - 12);
    for (let c = firstCohort; c < MONTH_COUNT; c++) {
      const members = ls.filter((l) => monthIndexOfDay(l.regDay) === c);
      const cells: (number | null)[] = [];
      for (let k = 0; k < 12; k++) {
        const mi = c + k;
        if (mi >= MONTH_COUNT) {
          cells.push(null);
          continue;
        }
        const active = members.filter((l) => s.activity[l.id].some((day) => monthIndexOfDay(day) === mi)).length;
        cells.push(ratio(active, members.length));
      }
      cohortRows.push({ cohort: monthLabel(c), size: members.length, cells });
    }

    // organisation
    const orgs = [...ORGANISATIONS, NOT_ANSWERED].map((o) => {
      const members = ls.filter((l) => l.org === o);
      const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day) && d.learners[e.learnerId].org === o);
      return { org: o, learners: members.length, rate: ratio(es.filter((e) => e.completedDay !== null).length, es.length), enrolments: es.length };
    });

    return { registered, enrolled, monthly, mix, segment, cohortRows, orgs };
  }, [s, d, dim, dimDef]);

  const groupBy = (
    <Select
      style={{ width: 230 }}
      value={dim}
      onChange={(v) => setDim(v)}
      options={DIMS.map((x) => ({ value: x.key, label: x.label }))}
      prefix={<span className="filter-label">Group by</span>}
    />
  );
  const maxOrg = Math.max(1, ...m.orgs.map((o) => o.learners));

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar extra={groupBy} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="ln-registered" value={fmtInt(m.registered)} sub="accounts, all time" />
        <Kpi id="ln-enrolled" value={fmtInt(m.enrolled)} sub={`${fmtPct(ratio(m.enrolled, m.registered))} of registered learners`} />
        <Kpi id="ln-never" value={fmtInt(m.registered - m.enrolled)} sub={`${fmtPct(ratio(m.registered - m.enrolled, m.registered))} signed up and never started a course`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard id="ln-monthly" table={{ columns: [{ key: 'month', title: 'Month' }, { key: 'learners', title: 'New learners', align: 'right' }], rows: m.monthly }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.monthly} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="learners" name="New learners" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={24}>
                  <LabelList dataKey="learners" position="top" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard id="ln-mix" table={{ columns: [{ key: 'group', title: dimDef.label }, { key: 'learners', title: 'Learners', align: 'right' }], rows: m.mix }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>By {dimDef.label.toLowerCase()}</div>
            <ResponsiveContainer width="100%" height={Math.max(180, m.mix.length * 32)}>
              <BarChart data={m.mix} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="group" {...yAxisProps} width={150} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="learners" name="Learners" radius={HBAR_RADIUS} maxBarSize={18}>
                  {m.mix.map((x) => (
                    <Cell key={x.group} fill={x.na ? INK.neutralBar : SERIES[0]} />
                  ))}
                  <LabelList dataKey="learners" position="right" style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="ln-segment"
            table={{
              columns: [
                { key: 'group', title: dimDef.label },
                { key: 'enrolments', title: 'Enrolments', align: 'right' },
                { key: 'rate', title: 'Completion rate', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.segment,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>By {dimDef.label.toLowerCase()}</div>
            {m.segment.length ? (
              <ResponsiveContainer width="100%" height={Math.max(180, m.segment.length * 32)}>
                <BarChart data={m.segment} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="group" {...yAxisProps} width={150} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="rate" name="Completion rate" radius={HBAR_RADIUS} maxBarSize={18}>
                    {m.segment.map((x) => (
                      <Cell key={x.group} fill={x.na ? INK.neutralBar : SERIES[0]} />
                    ))}
                    <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
            <div className="chart-note">With real data, groups under a minimum size should be hidden to protect privacy.</div>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard
            id="ln-cohort"
            table={{
              columns: [
                { key: 'cohort', title: 'Registered in' },
                { key: 'size', title: 'Learners', align: 'right' },
                ...Array.from({ length: 12 }, (_, k) => ({ key: `m${k}`, title: `M${k}`, align: 'right' as const, render: (v: number | null) => (v === null ? '' : fmtPct(v)) })),
              ],
              rows: m.cohortRows.map((r) => Object.fromEntries([['cohort', r.cohort], ['size', r.size], ...r.cells.map((c, k) => [`m${k}`, c])])),
            }}
            note="Each row is the group of learners who registered that month. M0 is the month they registered, M1 the month after, and so on. The cell is the share with learning activity that month."
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="heat">
                <thead>
                  <tr>
                    <th>Registered in</th>
                    <th className="col">Learners</th>
                    {Array.from({ length: 12 }, (_, k) => (
                      <th className="col" key={k}>
                        M{k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.cohortRows.map((r) => (
                    <tr key={r.cohort}>
                      <th>{r.cohort}</th>
                      <td style={{ background: '#F7F8FA', color: INK.secondary }}>{r.size}</td>
                      {r.cells.map((c, k) =>
                        c === null || !Number.isFinite(c) ? (
                          <td key={k} style={{ background: 'transparent' }} />
                        ) : (
                          <td key={k} style={{ background: rampColor(0.05 + c * 1.2), color: rampInk(0.05 + c * 1.2) }}>
                            {Math.round(c * 100)}%
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard id="ln-org">
            <Table
              size="small"
              rowKey="org"
              dataSource={m.orgs}
              pagination={false}
              columns={[
                { title: 'Organisation', dataIndex: 'org', render: (v: string) => <span style={{ color: v === NOT_ANSWERED ? INK.muted : undefined, fontWeight: 600 }}>{v}</span> },
                { title: 'Learners', dataIndex: 'learners', width: 260, render: (v: number) => <InlineBar value={v} max={maxOrg} label={fmtInt(v)} /> },
                { title: 'Enrolments', dataIndex: 'enrolments', align: 'right' },
                { title: 'Completion rate', dataIndex: 'rate', width: 220, render: (v: number) => <InlineBar value={v} label={fmtPct(v)} color={SERIES[2]} /> },
              ]}
            />
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}

