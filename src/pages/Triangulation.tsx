import { useMemo } from 'react';
import { Row, Col, Table, Tag } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, NoData, LayerChip } from '../components/ui';
import { yAxisProps, makeTooltip, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtPct, fmtInt, mean } from '../lib/scope';
import { triangulation, VERDICT_META } from '../lib/metrics';
import { formatDay } from '../lib/time';
import { AREAS, L5_METHODS, L5_INDICATORS } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK, rampColor, rampInk } from '../lib/palette';

function Mark({ ok }: { ok: boolean | null }) {
  if (ok === null) return <MinusCircleFilled style={{ color: INK.neutralBar }} />;
  return ok ? <CheckCircleFilled style={{ color: '#0f8a5f' }} /> : <CloseCircleFilled style={{ color: '#d03b3b' }} />;
}

export default function Triangulation() {
  const s = useScope();
  const p = page('triangulation');
  const { d } = s;

  const m = useMemo(() => {
    const tri = triangulation(s);
    const recs = d.l5.filter((x) => s.inRange(x.day) && (s.filters.area === null || x.areaId === s.filters.area));
    const methods = L5_METHODS.map((name) => {
      const rows = recs.filter((x) => x.method === name);
      return { name, value: rows.length, people: rows.reduce((a, b) => a + b.participants, 0) };
    });
    const areas = AREAS.filter((a) => s.filters.area === null || a.id === s.filters.area);
    const grid = areas.map((a) => ({
      area: a.name,
      cells: L5_INDICATORS.map((_, i) => {
        const vals = recs.filter((x) => x.areaId === a.id).map((x) => x.ratings[i]).filter((v) => v > 0);
        return { v: mean(vals), n: vals.length };
      }),
    }));
    return { tri, recs, methods, grid };
  }, [s, d]);

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar segmentNote="Team evidence is recorded per activity, not per learner: learner filters apply to platform records and follow-ups only." />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            id="tr-summary"
            note="Platform records: completion of enrolments that reached 60 days and the first-attempt quiz pass rate, in the period. Learners' reports: use in work at 6 or 12 months. Outside observation: average Layer 5 rating, 1-4. Follow-ups and team evidence count everything to date."
          >
            <Table
              size="small"
              rowKey="areaId"
              pagination={false}
              dataSource={m.tri}
              scroll={{ x: 860 }}
              columns={[
                { title: 'Learning area', dataIndex: 'area', render: (v: string) => <b>{v}</b> },
                {
                  title: (
                    <span className="tri-head">
                      <LayerChip layer="L2" compact /> Platform records
                    </span>
                  ),
                  dataIndex: 'completion',
                  render: (_: number, r) => (
                    <span className="tri-cell">
                      <Mark ok={Number.isFinite(r.completion) ? r.platformOk : null} />
                      Completion {fmtPct(r.completion)} · quiz {fmtPct(r.firstPass)}
                    </span>
                  ),
                },
                {
                  title: (
                    <span className="tri-head">
                      <LayerChip layer="L4" compact /> Learners' reports
                    </span>
                  ),
                  dataIndex: 'use',
                  render: (_: number, r) => (
                    <span className="tri-cell">
                      <Mark ok={r.useN >= 5 ? r.use >= 0.6 : null} />
                      {!r.fuSelected ? 'No course selected for follow-up' : r.useN >= 5 ? `${fmtPct(r.use)} use it in their work (${r.useN})` : `${r.useN} ${r.useN === 1 ? 'answer' : 'answers'} so far, too few`}
                    </span>
                  ),
                },
                {
                  title: (
                    <span className="tri-head">
                      <LayerChip layer="L5" compact /> Outside observation
                    </span>
                  ),
                  dataIndex: 'observed',
                  render: (_: number, r) => (
                    <span className="tri-cell">
                      <Mark ok={r.observedN >= 2 ? r.observed >= 2.9 : null} />
                      {r.observedN ? `${r.observed.toFixed(1)} of 4 (${r.observedN} records)` : 'No records yet'}
                    </span>
                  ),
                },
                {
                  title: 'Evidence',
                  dataIndex: 'verdict',
                  render: (v: keyof typeof VERDICT_META) => (
                    <Tag color={VERDICT_META[v].color} title={VERDICT_META[v].text} style={{ margin: 0 }}>
                      {VERDICT_META[v].label}
                    </Tag>
                  ),
                },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={9}>
          <ChartCard
            id="tr-methods"
            table={{
              columns: [
                { key: 'name', title: 'Method' },
                { key: 'value', title: 'Activities', align: 'right' },
                { key: 'people', title: 'Participants', align: 'right' },
              ],
              rows: m.methods,
            }}
            note={`${fmtInt(m.recs.length)} activities in the period, ${fmtInt(m.methods.reduce((a, b) => a + b.people, 0))} participants.`}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.methods} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={190} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtInt(v), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="value" name="Activities" fill={SERIES[1]} radius={HBAR_RADIUS} maxBarSize={18}>
                  <LabelList dataKey="value" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={15}>
          <ChartCard
            id="tr-indicators"
            table={{
              columns: [{ key: 'area', title: 'Learning area' }, ...L5_INDICATORS.map((ind) => ({ key: ind, title: ind, align: 'right' as const }))],
              rows: m.grid.map((g) => Object.fromEntries([['area', g.area], ...L5_INDICATORS.map((ind, i) => [ind, Number.isFinite(g.cells[i].v) ? g.cells[i].v.toFixed(1) : '-'])])),
            }}
            note="Average rating from 1 (weak) to 4 (strong), coded from each activity. Empty: no evidence on that indicator yet."
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="heat">
                <thead>
                  <tr>
                    <th />
                    {L5_INDICATORS.map((ind) => (
                      <th className="col" key={ind}>
                        {ind}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.grid.map((g) => (
                    <tr key={g.area}>
                      <th>{g.area}</th>
                      {g.cells.map((c, i) =>
                        Number.isFinite(c.v) ? (
                          <td key={i} title={`${c.n} ratings`} style={{ background: rampColor((c.v - 1) / 3), color: rampInk((c.v - 1) / 3) }}>
                            {c.v.toFixed(1)}
                          </td>
                        ) : (
                          <td key={i} style={{ background: '#F7F8FA', color: INK.muted }}>
                            -
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
          <ChartCard id="tr-activities" note="Recorded with a simple admin form. Linked to individual learners only where they consented.">
            {m.recs.length ? (
              <Table
                size="small"
                rowKey="id"
                dataSource={m.recs}
                pagination={{ pageSize: 6, size: 'small', showSizeChanger: false }}
                scroll={{ x: 980 }}
                columns={[
                  { title: 'Date', dataIndex: 'day', width: 110, render: (v: number) => formatDay(v) },
                  { title: 'Method', dataIndex: 'method', width: 170 },
                  { title: 'Learning area', dataIndex: 'areaId', width: 170, render: (v: number) => AREAS[v].name },
                  { title: 'Territory', dataIndex: 'municipality', width: 100 },
                  { title: 'People', dataIndex: 'participants', align: 'right', width: 70 },
                  {
                    title: 'Roles and institutions',
                    dataIndex: 'roles',
                    width: 200,
                    render: (v: string[], r) => <span style={{ fontSize: 12, color: INK.secondary }}>{[...v, ...r.instTypes].join(', ')}</span>,
                  },
                  {
                    title: 'Themes',
                    dataIndex: 'themes',
                    render: (v: string[]) => (
                      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                        {v.map((t) => (
                          <Tag key={t} style={{ margin: 0 }}>
                            {t}
                          </Tag>
                        ))}
                      </span>
                    ),
                  },
                ]}
                expandable={{
                  expandedRowRender: (r) => <div className="comment-text">"{r.quote}"</div>,
                }}
              />
            ) : (
              <NoData text="No team evidence recorded in the period." />
            )}
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
