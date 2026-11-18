import { useMemo } from 'react';
import { Row, Col } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, ComposedChart, Line } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, Legend, SegBar, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean } from '../lib/scope';
import { monthOverlap } from '../lib/metrics';
import { monthIndexOfDay, monthLabel } from '../lib/time';
import { DEVICES } from '../data/taxonomy';
import { GATE_MONTH } from '../data/generate';
import { page } from '../data/registry';
import { SERIES, INK } from '../lib/palette';

const CHANNELS = ['Organic search', 'Direct', 'Referral', 'Social', 'Email', 'AI tools'];
const AI_REF = (k: string) => k.endsWith('.ai') || k.startsWith('chatgpt') || k.startsWith('gemini');

export default function Access() {
  const s = useScope();
  const p = page('access');
  const { d } = s;
  const today = s.mode === 'today';

  const m = useMemo(() => {
    const months = d.traffic.map((t) => ({ t, f: monthOverlap(t.month, s.start, s.end) })).filter((x) => x.f > 0);
    const sum = (get: (t: (typeof d.traffic)[number]) => number) => months.reduce((a, { t, f }) => a + get(t) * f, 0);
    const sessions = sum((t) => Object.values(t.channels).reduce((a, b) => a + b, 0));
    const newU = sum((t) => t.newUsers);
    const retU = sum((t) => t.returningUsers);
    const engaged = mean(months.map(({ t }) => t.engagedRate));

    const traffic = months.map(({ t, f }) => {
      const row: Record<string, number | string> = { month: monthLabel(t.month) };
      for (const c of CHANNELS) row[c] = Math.round(t.channels[c] * f);
      return row;
    });
    const refTotals: Record<string, number> = {};
    for (const { t, f } of months) for (const [k, v] of Object.entries(t.referrers)) refTotals[k] = (refTotals[k] ?? 0) + v * f;
    const referrers = Object.entries(refTotals)
      .map(([name, v]) => ({ name, value: Math.round(v), ai: AI_REF(name) }))
      .sort((a, b) => b.value - a.value);
    const regTotals: Record<string, number> = {};
    for (const { t, f } of months) for (const [k, v] of Object.entries(t.regions)) regTotals[k] = (regTotals[k] ?? 0) + v * f;
    const regions = Object.entries(regTotals).map(([name, v]) => ({ name, value: Math.round(v) }));
    const devAll: Record<string, number> = {};
    for (const { t, f } of months) for (const [k, v] of Object.entries(t.devices)) devAll[k] = (devAll[k] ?? 0) + v * f;
    const devLearners: Record<string, number> = {};
    for (const e of d.resEvents) {
      if (!s.learnerOk[e.learnerId] || !s.inRange(e.day)) continue;
      devLearners[e.device] = (devLearners[e.device] ?? 0) + 1;
    }

    // resource views with and without an account
    const m0 = monthIndexOfDay(s.start);
    const m1 = monthIndexOfDay(s.end);
    const views: { month: string; learners: number; visitors: number; total: number }[] = [];
    for (let mi = m0; mi <= m1; mi++) views.push({ month: monthLabel(mi), learners: 0, visitors: 0, total: 0 });
    for (const a of d.anon) {
      if (!s.resourceOk[a.resourceId]) continue;
      const f = monthOverlap(a.month, s.start, s.end);
      if (f <= 0) continue;
      const row = views[a.month - m0];
      row.visitors += a.visitorViews * f;
      row.total += a.views * f;
    }
    for (const e of d.resEvents) {
      if (!s.resourceOk[e.resourceId] || !s.inRange(e.day) || e.kind === 'download') continue;
      views[monthIndexOfDay(e.day) - m0].learners += 1;
    }
    views.forEach((v) => {
      v.visitors = Math.round(v.visitors);
      v.total = Math.round(v.total);
    });
    const visTotal = views.reduce((a, b) => a + b.visitors, 0);
    const lrnTotal = views.reduce((a, b) => a + b.learners, 0);

    // registration gate
    const gate = d.gateMonths
      .filter((g) => monthOverlap(g.month, s.start, s.end) > 0)
      .map((g) => {
        const regs = d.learners.filter((l) => l.viaGate && monthIndexOfDay(l.regDay) === g.month && s.inRange(l.regDay)).length;
        const f = monthOverlap(g.month, s.start, s.end);
        const shown = Math.round(g.shown * f);
        return { month: monthLabel(g.month), shown, registered: regs, conversion: ratio(regs, shown) };
      });
    const gShown = gate.reduce((a, b) => a + b.shown, 0);
    const gRegs = gate.reduce((a, b) => a + b.registered, 0);

    return {
      sessions,
      engaged,
      returning: ratio(retU, newU + retU),
      traffic,
      referrers,
      regions,
      devAll,
      devLearners,
      views,
      visShare: ratio(visTotal, visTotal + lrnTotal),
      gate,
      gateConv: ratio(gRegs, gShown),
      gShown,
      gRegs,
    };
  }, [s, d]);

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar segmentNote="MonsterInsights counts all visitors in aggregate: learner filters (role, age and others) do not apply to traffic, channels or regions." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="ac-sessions" value={fmtInt(m.sessions)} sub="visits in the period, everyone who accepts cookies" />
        <Kpi id="ac-engaged" value={fmtPct(m.engaged)} sub="engaged sessions" />
        <Kpi id="ac-returning" value={fmtPct(m.returning)} sub="of visitors are returning" />
        <Kpi id="ac-gateconv" value={fmtPct(m.gateConv, 1)} sub={`${fmtInt(m.gRegs)} registrations after ${fmtInt(m.gShown)} gates shown`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <ChartCard id="ac-traffic" table={{ columns: [{ key: 'month', title: 'Month' }, ...CHANNELS.map((c) => ({ key: c, title: c, align: 'right' as const }))], rows: m.traffic }}>
            <Legend items={CHANNELS.map((c, i) => ({ label: c, color: SERIES[i] }))} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={m.traffic} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {CHANNELS.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="c" fill={SERIES[i]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={i === CHANNELS.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard id="ac-referrers" table={{ columns: [{ key: 'name', title: 'Site' }, { key: 'value', title: 'Visits', align: 'right' }], rows: m.referrers }} note="University Moodles and Teams links show which partners send learners. AI tools are a growing channel.">
            <Legend
              items={[
                { label: 'Partner and social sites', color: SERIES[0] },
                { label: 'AI tools', color: SERIES[6] },
              ]}
            />
            <ResponsiveContainer width="100%" height={Math.max(220, m.referrers.length * 30)}>
              <BarChart data={m.referrers} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={160} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="value" name="Visits" radius={HBAR_RADIUS} maxBarSize={18}>
                  {m.referrers.map((r) => (
                    <Cell key={r.name} fill={r.ai ? SERIES[6] : SERIES[0]} />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard
            id="ac-unregistered"
            table={{
              columns: today
                ? [
                    { key: 'month', title: 'Month' },
                    { key: 'total', title: 'Page views (everyone)', align: 'right' },
                  ]
                : [
                    { key: 'month', title: 'Month' },
                    { key: 'learners', title: 'Registered learners', align: 'right' },
                    { key: 'visitors', title: 'Without an account', align: 'right' },
                  ],
              rows: m.views,
            }}
            note={
              today
                ? 'MonsterInsights counts page views by everyone; it cannot tell registered learners from visitors.'
                : `${fmtPct(m.visShare)} of resource views in the period come from visitors without an account: invisible to Levels 1-4. This is the case for the registration gate.`
            }
          >
            <Legend
              items={
                today
                  ? [{ label: 'Resource page views, everyone', color: INK.neutralBar }]
                  : [
                      { label: 'Registered learners (event log)', color: SERIES[0] },
                      { label: 'Visitors without an account (MonsterInsights)', color: INK.neutralBar },
                    ]
              }
            />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.views} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {today ? (
                  <Bar dataKey="total" name="Page views" fill={INK.neutralBar} radius={[4, 4, 0, 0]} maxBarSize={28} />
                ) : (
                  <>
                    <Bar dataKey="learners" name="Registered learners" stackId="v" fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} />
                    <Bar dataKey="visitors" name="Without an account" stackId="v" fill={INK.neutralBar} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            id="ac-gate"
            table={{
              columns: [
                { key: 'month', title: 'Month' },
                { key: 'shown', title: 'Gate shown', align: 'right' },
                { key: 'registered', title: 'Registrations after it', align: 'right' },
                { key: 'conversion', title: 'Conversion', align: 'right', render: (v: number) => fmtPct(v, 1) },
              ],
              rows: m.gate,
            }}
            note={`Public: home page, catalogue and resource descriptions. Up to 3 resources without an account; the fourth asks for one. In the demo data the gate starts in ${monthLabel(GATE_MONTH)}; review the limit after three months.`}
          >
            <Legend
              items={[
                { label: 'Gate shown', color: INK.neutralBar },
                { label: 'Registrations after it', color: SERIES[0] },
              ]}
            />
            {m.gate.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={m.gate} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="shown" name="Gate shown" fill={INK.neutralBar} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="registered" name="Registrations after it" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <NoData text={`The gate starts in ${monthLabel(GATE_MONTH)} in the demo data.`} />
            )}
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard id="ac-devices" note="Includes VR headsets (Meta Quest) for the 360° videos.">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>All visitors (MonsterInsights)</div>
            <SegBar parts={DEVICES.map((dv, i) => ({ label: dv, value: Math.round(m.devAll[dv] ?? 0), color: SERIES[i], ink: i === 3 ? INK.primary : '#fff' }))} />
            {!today ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, margin: '10px 0 4px' }}>Registered learners, per resource use (event log)</div>
                <SegBar parts={DEVICES.map((dv, i) => ({ label: dv, value: m.devLearners[dv] ?? 0, color: SERIES[i], ink: i === 3 ? INK.primary : '#fff' }))} />
              </>
            ) : null}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="ac-region" table={{ columns: [{ key: 'name', title: 'Region' }, { key: 'value', title: 'Visits', align: 'right' }], rows: m.regions }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.regions} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={130} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtInt(v), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="value" name="Visits" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={18}>
                  <LabelList dataKey="value" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}

