import { useMemo, useState } from 'react';
import { Row, Col, Select, Table, Segmented } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, InlineBar, NoData, Legend, SegBar } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, BAR_RADIUS, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, suppress } from '../lib/scope';
import { activityEvents, completionEligible } from '../lib/metrics';
import { monthIndexOfDay, monthLabel, MONTH_COUNT, TODAY } from '../lib/time';
import {
  OCCUPATIONS,
  WORK_AREAS,
  AGE_GROUPS,
  GENDERS,
  CONTENT_LANGS,
  INSTITUTIONS,
  INST_TYPES,
  DISTRICTS,
  EXPERIENCE,
  EDUCATION,
  FOUND_VIA,
  TERRITORIES,
  ROLE_TARGETS,
  INST_TARGETS,
  DISTRICT_TARGETS,
  NOT_ANSWERED,
} from '../data/taxonomy';
import { MIN_GROUP } from '../data/audiences';
import { page } from '../data/registry';
import { SERIES, INK, rampColor, rampInk } from '../lib/palette';
import type { Learner } from '../data/generate';

type Dim = 'occupation' | 'workArea' | 'ageGroup' | 'gender' | 'prefLang' | 'instType' | 'district' | 'experience' | 'education' | 'foundVia';

const DIMS: { key: Dim; label: string; values: readonly string[]; na: boolean; proposed?: boolean }[] = [
  { key: 'occupation', label: 'Role', values: OCCUPATIONS, na: true },
  { key: 'ageGroup', label: 'Age group', values: AGE_GROUPS, na: true },
  { key: 'gender', label: 'Gender', values: GENDERS, na: true },
  { key: 'workArea', label: 'Work area', values: WORK_AREAS, na: true },
  { key: 'prefLang', label: 'Preferred language', values: CONTENT_LANGS, na: false },
  { key: 'instType', label: 'Institution type', values: INST_TYPES, na: false, proposed: true },
  { key: 'district', label: 'District', values: DISTRICTS, na: false, proposed: true },
  { key: 'experience', label: 'Years of experience', values: EXPERIENCE, na: true, proposed: true },
  { key: 'education', label: 'Education level', values: EDUCATION, na: true, proposed: true },
  { key: 'foundVia', label: 'How they found the platform', values: FOUND_VIA, na: true, proposed: true },
];

type ReachDim = 'occupation' | 'instType' | 'district';
const REACH: { key: ReachDim; label: string; targets: Record<string, number>; proposed?: boolean }[] = [
  { key: 'occupation', label: 'Role', targets: ROLE_TARGETS },
  { key: 'instType', label: 'Institution type', targets: INST_TARGETS, proposed: true },
  { key: 'district', label: 'District', targets: DISTRICT_TARGETS, proposed: true },
];

export default function Learners() {
  const s = useScope();
  const p = page('learners');
  const { d } = s;
  const today = s.mode === 'today';
  const [dimSel, setDim] = useState<Dim>('occupation');
  const [reachSel, setReach] = useState<ReachDim>('occupation');
  const dim = today && DIMS.find((x) => x.key === dimSel)?.proposed ? 'occupation' : dimSel;
  const reachDim = today && REACH.find((x) => x.key === reachSel)?.proposed ? 'occupation' : reachSel;
  const dimDef = DIMS.find((x) => x.key === dim)!;
  const reachDef = REACH.find((x) => x.key === reachDim)!;

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

    // reach against intended audiences
    const known = ls.filter((l) => (l[reachDim] as string) !== NOT_ANSWERED);
    const reach = Object.entries(reachDef.targets).map(([group, target]) => {
      const n = known.filter((l) => (l[reachDim] as string) === group).length;
      return { group, share: ratio(n, known.length), target, n };
    });

    // profile mix and completion by group
    const values = dimDef.na ? [...dimDef.values, NOT_ANSWERED] : [...dimDef.values];
    const val = (l: Learner) => l[dim] as string;
    const mix = values.map((v) => ({ group: v, learners: ls.filter((l) => val(l) === v).length, na: v === NOT_ANSWERED }));
    const segAll = values
      .map((v) => {
        const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && completionEligible(s, e.day) && val(d.learners[e.learnerId]) === v);
        const people = new Set(es.map((e) => e.learnerId)).size;
        return { group: v, rate: ratio(es.filter((e) => e.completedDay !== null).length, es.length), enrolments: es.length, people, na: v === NOT_ANSWERED };
      })
      .filter((x) => x.enrolments > 0);
    const seg = suppress(segAll, (x) => x.people);

    // cohort grid: registration month x months since registration
    const cohortRows: { cohort: string; size: number; cells: (number | null)[] }[] = [];
    const firstCohort = Math.max(0, MONTH_COUNT - 12);
    const events = activityEvents(s);
    const months = new Map<number, Set<number>>();
    for (const e of events) {
      const mi = monthIndexOfDay(e.day);
      if (!months.has(e.learnerId)) months.set(e.learnerId, new Set());
      months.get(e.learnerId)!.add(mi);
    }
    for (let c = firstCohort; c < MONTH_COUNT; c++) {
      const members = ls.filter((l) => monthIndexOfDay(l.regDay) === c);
      const cells: (number | null)[] = [];
      for (let k = 0; k < 12; k++) {
        const mi = c + k;
        if (mi >= MONTH_COUNT) {
          cells.push(null);
          continue;
        }
        const active = members.filter((l) => months.get(l.id)?.has(mi)).length;
        cells.push(ratio(active, members.length));
      }
      cohortRows.push({ cohort: monthLabel(c), size: members.length, cells });
    }

    // territory and institution
    const outcome = (pred: (l: Learner) => boolean) => {
      const members = ls.filter(pred);
      const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && completionEligible(s, e.day) && pred(d.learners[e.learnerId]));
      const activeIds = new Set(events.filter((e) => s.inRange(e.day)).map((e) => e.learnerId));
      return {
        learners: members.length,
        active: members.filter((l) => activeIds.has(l.id)).length,
        enrolments: es.length,
        rate: ratio(es.filter((e) => e.completedDay !== null).length, es.length),
      };
    };
    const territory = suppress(
      TERRITORIES.map((t) => ({ key: t.municipality, municipality: t.municipality, district: t.district, ...outcome((l) => l.municipality === t.municipality) })).sort((a, b) => b.learners - a.learners),
      (r) => r.learners,
    );
    const institutions = suppress(
      [...INSTITUTIONS.map((i) => ({ key: i.name, name: i.name, type: i.type, ...outcome((l) => l.org === i.name) }))].sort((a, b) => b.learners - a.learners),
      (r) => r.learners,
    );
    const noInst = outcome((l) => l.org === NOT_ANSWERED);

    const consents = [
      { label: 'Use of data for evaluation', yes: ls.filter((l) => l.consentEval).length },
      { label: 'Re-contact after courses', yes: ls.filter((l) => l.consentRecontact).length },
      { label: 'AI analysis of tutor conversations', yes: ls.filter((l) => l.consentAI).length },
    ].map((c) => ({ ...c, no: ls.length - c.yes, share: ratio(c.yes, ls.length) }));

    return { registered, enrolled, monthly, reach, mix, seg, cohortRows, territory, institutions, noInst, consents };
  }, [s, d, dim, dimDef, reachDim, reachDef]);

  const groupBy = (
    <Select
      style={{ width: 260 }}
      value={dim}
      onChange={(v) => setDim(v)}
      popupMatchSelectWidth={280}
      options={DIMS.map((x) => ({
        value: x.key,
        disabled: today && x.proposed,
        label: (
          <span>
            {today && x.proposed ? <LockOutlined style={{ marginRight: 6, color: '#9aa0a8' }} /> : null}
            {x.label}
          </span>
        ),
      }))}
      prefix={<span className="filter-label">Group by</span>}
    />
  );
  const maxInst = Math.max(1, ...m.institutions.shown.map((o) => o.learners));
  const maxTerr = Math.max(1, ...m.territory.shown.map((o) => o.learners));
  const hiddenNote = (n: number, what: string) => (n > 0 ? `${n} ${what} with fewer than ${MIN_GROUP} people hidden.` : '');

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar extra={groupBy} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="ln-registered" value={fmtInt(m.registered)} sub="accounts, all time" />
        <Kpi id="ln-enrolled" value={fmtInt(m.enrolled)} sub={`${fmtPct(ratio(m.enrolled, m.registered))} of registered learners`} />
        <Kpi id="ln-never" value={fmtInt(m.registered - m.enrolled)} sub={`${fmtPct(ratio(m.registered - m.enrolled, m.registered))} never started a course (some use resources only)`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ChartCard
            id="ln-reach"
            extra={
              <Segmented
                size="small"
                style={{ marginBottom: 8 }}
                value={reachDim}
                onChange={(v) => setReach(v as ReachDim)}
                options={REACH.map((r) => ({ value: r.key, label: r.label, disabled: today && r.proposed }))}
              />
            }
            table={{
              columns: [
                { key: 'group', title: reachDef.label },
                { key: 'n', title: 'Learners', align: 'right' },
                { key: 'share', title: 'Share', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'target', title: 'Intended', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.reach,
            }}
            note="Share of learners who answered, against the share the D&I team intends to reach (demo targets)."
          >
            <Legend
              items={[
                { label: 'Share of learners', color: SERIES[0] },
                { label: 'Intended share', color: INK.neutralBar },
              ]}
            />
            <ResponsiveContainer width="100%" height={Math.max(200, m.reach.length * 34)}>
              <BarChart data={m.reach} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barGap={1}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="group" {...yAxisProps} width={190} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="share" name="Share of learners" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={12}>
                  <LabelList dataKey="share" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="target" name="Intended share" fill={INK.neutralBar} radius={HBAR_RADIUS} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="ln-monthly" table={{ columns: [{ key: 'month', title: 'Month' }, { key: 'learners', title: 'New learners', align: 'right' }], rows: m.monthly }}>
            <ResponsiveContainer width="100%" height={260}>
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
            <ResponsiveContainer width="100%" height={Math.max(180, m.mix.length * 30)}>
              <BarChart data={m.mix} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="group" {...yAxisProps} width={190} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
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
                { key: 'people', title: 'Learners', align: 'right' },
                { key: 'enrolments', title: 'Enrolments', align: 'right' },
                { key: 'rate', title: 'Completion rate', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.seg.shown,
            }}
            note={`Enrolments that reached 60 days in the period. ${hiddenNote(m.seg.hidden, 'groups')}`}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>By {dimDef.label.toLowerCase()}</div>
            {m.seg.shown.length ? (
              <ResponsiveContainer width="100%" height={Math.max(180, m.seg.shown.length * 30)}>
                <BarChart data={m.seg.shown} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="group" {...yAxisProps} width={190} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="rate" name="Completion rate" radius={HBAR_RADIUS} maxBarSize={18}>
                    {m.seg.shown.map((x) => (
                      <Cell key={x.group} fill={x.na ? INK.neutralBar : SERIES[0]} />
                    ))}
                    <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 12, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData text={`No group has ${MIN_GROUP} or more learners for these filters.`} />
            )}
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
            note="Each row is the group of learners who registered that month. M0 is the month they registered, M1 the month after, and so on. The cell is the share with a learning action that month."
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

        <Col xs={24} lg={12}>
          <ChartCard id="ln-territory" note={`Learners with a learning action in the period count as active. Completion: enrolments that reached 60 days in the period. ${hiddenNote(m.territory.hidden, 'municipalities')}`}>
            <Table
              size="small"
              rowKey="key"
              dataSource={m.territory.shown}
              pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
              columns={[
                {
                  title: 'Municipality',
                  dataIndex: 'municipality',
                  render: (v: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{v}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>{r.district} district</div>
                    </div>
                  ),
                },
                { title: 'Learners', dataIndex: 'learners', width: 170, render: (v: number) => <InlineBar value={v} max={maxTerr} label={fmtInt(v)} /> },
                { title: 'Active', dataIndex: 'active', align: 'right' },
                { title: 'Completion', dataIndex: 'rate', align: 'right', render: (v: number) => fmtPct(v) },
              ]}
            />
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="ln-institution"
            note={`${fmtInt(m.noInst.learners)} learners gave an institution type but no name. ${hiddenNote(m.institutions.hidden, 'institutions')}`}
          >
            <Table
              size="small"
              rowKey="key"
              dataSource={m.institutions.shown}
              pagination={false}
              columns={[
                {
                  title: 'Institution',
                  dataIndex: 'name',
                  render: (v: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{v}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>{r.type}</div>
                    </div>
                  ),
                },
                { title: 'Learners', dataIndex: 'learners', width: 150, render: (v: number) => <InlineBar value={v} max={maxInst} label={fmtInt(v)} /> },
                { title: 'Completion', dataIndex: 'rate', width: 150, render: (v: number) => <InlineBar value={v} label={fmtPct(v)} color={SERIES[2]} /> },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard id="ln-consent" note="Legal basis for Levels 2-5. An answer is required at registration; a yes is not. Learners without the re-contact consent get no follow-up; without the AI consent their tutor questions are not grouped.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 28px' }}>
              {m.consents.map((c) => (
                <div key={c.label}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <SegBar
                    parts={[
                      { label: 'Yes', value: c.yes, color: SERIES[2] },
                      { label: 'No', value: c.no, color: INK.neutralBar, ink: INK.primary },
                    ]}
                  />
                </div>
              ))}
            </div>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
