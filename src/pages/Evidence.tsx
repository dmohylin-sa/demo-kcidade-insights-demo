import { useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Tooltip } from 'antd';
import { ArrowRightOutlined, ArrowDownOutlined, DatabaseOutlined, DashboardOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHead, LayerChip, DataBadge } from '../components/ui';
import {
  CHARTS,
  PAGES,
  LAYERS,
  LAYER_META,
  SOURCE_META,
  DIMENSIONS,
  DIMENSION_META,
  MATRIX,
  layersOf,
  page as pageDef,
  type Layer,
  type SourceKey,
  type PageKey,
  type ChartDef,
} from '../data/registry';
import { AUDIENCES } from '../data/audiences';
import { INK } from '../lib/palette';

function PageTags({ charts }: { charts: ChartDef[] }) {
  const navigate = useNavigate();
  const byPage = new Map<PageKey, ChartDef[]>();
  for (const c of charts) byPage.set(c.page, [...(byPage.get(c.page) ?? []), c]);
  if (!charts.length) return <span style={{ fontSize: 12, color: INK.muted }}>No chart in the demo</span>;
  return (
    <span className="page-tags">
      {[...byPage.entries()].map(([k, cs]) => (
        <Tooltip key={k} title={cs.map((c) => c.title).join(' · ')}>
          <Tag className="view-screen" onClick={() => navigate(pageDef(k).path)}>
            {pageDef(k).title} <b>{cs.length}</b>
          </Tag>
        </Tooltip>
      ))}
    </span>
  );
}

export default function Evidence() {
  const p = pageDef('evidence');
  const navigate = useNavigate();
  const charts = CHARTS;

  const sources = useMemo(
    () =>
      (Object.keys(SOURCE_META) as SourceKey[]).map((k) => {
        const using = charts.filter((c) => c.sources.includes(k));
        return { key: k, ...SOURCE_META[k], charts: using.length, pages: Array.from(new Set(using.map((c) => c.page))) };
      }),
    [charts],
  );

  const cell = (layer: Layer, dim: (typeof DIMENSIONS)[number]) => charts.filter((c) => c.dim === dim && layersOf(c).includes(layer));
  const platformWide = (layer: Layer) => charts.filter((c) => c.dim === 'platform' && layersOf(c).includes(layer));

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Five layers of evidence feed one set of dashboards">
            <div className="flow">
              <div className="flow-layers">
                <div className="flow-gate">
                  <b>Registration gate</b>
                  <span>Visitors without an account: anonymous traffic only (MonsterInsights). Account required after 3 resources.</span>
                </div>
                <div className="flow-arrow-down">
                  <ArrowDownOutlined /> registered learners
                </div>
                {LAYERS.map((l) => {
                  const m = LAYER_META[l];
                  return (
                    <div key={l} className={`flow-layer${m.byPeople ? ' by-people' : ''}`} style={{ borderLeftColor: m.color }}>
                      <div className="flow-layer-title">
                        <LayerChip layer={l} compact /> {m.kind} {m.n} · {m.name}
                      </div>
                      <div className="flow-layer-what">{m.what}</div>
                      <div className="flow-layer-src">Source: {m.source}</div>
                    </div>
                  );
                })}
                <div className="flow-legend">
                  <span className="flow-key" /> Collected by the platform <span className="flow-key by-people" /> Collected by people
                </div>
              </div>
              <div className="flow-mid">
                <ArrowRightOutlined />
              </div>
              <div className="flow-right">
                <div className="flow-db">
                  <DatabaseOutlined />
                  <div>
                    <b>Reporting database</b>
                    <span>Pseudonymous learner ID · one definition per indicator · groups under 10 hidden</span>
                  </div>
                </div>
                <div className="flow-arrow-down">
                  <ArrowDownOutlined />
                </div>
                <div className="flow-dash">
                  <div className="flow-dash-title">
                    <DashboardOutlined /> Admin dashboards
                  </div>
                  <div className="flow-layer-src">Predefined, then saved views</div>
                  {AUDIENCES.map((a) => (
                    <div key={a.key} className="flow-aud">
                      <span>{a.name}</span>
                      <span>{a.rhythm}</span>
                    </div>
                  ))}
                  <div className="flow-aud">
                    <span>Learners</span>
                    <span>their own data</span>
                  </div>
                  <a onClick={() => navigate('/audiences')} style={{ fontSize: 12.5 }}>
                    Audiences and saved views <ArrowRightOutlined />
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="What each level measures, and where it is in the demo">
            <div style={{ overflowX: 'auto' }}>
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Level</th>
                    {DIMENSIONS.map((dm) => (
                      <th key={dm}>{DIMENSION_META[dm].label}</th>
                    ))}
                    <th>Reach and access</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="matrix-l1">
                    <th>
                      <LayerChip layer="L1" compact /> {LAYER_META.L1.name}
                    </th>
                    <td colSpan={DIMENSIONS.length}>Applies to every cell: each result can be split by role, institution, territory, gender and age (filter row on every screen; groups under 10 people hidden).</td>
                    <td>
                      <PageTags charts={platformWide('L1')} />
                    </td>
                  </tr>
                  {(['L2', 'L3', 'L4', 'L5'] as const).map((l) => (
                    <tr key={l}>
                      <th>
                        <LayerChip layer={l} compact /> {LAYER_META[l].name}
                      </th>
                      {DIMENSIONS.map((dm) => (
                        <td key={dm}>
                          <div className="matrix-what">{MATRIX[l][dm as keyof (typeof MATRIX)['L2']]}</div>
                          <PageTags charts={cell(l, dm)} />
                        </td>
                      ))}
                      <td>
                        <PageTags charts={platformWide(l)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="chart-note">
              Each tag opens the screen; the number is how many charts there draw on that level for that dimension. Hover a tag to see the charts. The client's order: Learning first, Virtual Tutor second, practice transformation designed now and measured from the first follow-up wave, Communities of Practice last.
            </div>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Sources">
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              dataSource={sources}
              scroll={{ x: 900 }}
              columns={[
                { title: 'Source', dataIndex: 'label', render: (v: string) => <b>{v}</b> },
                { title: 'Level', dataIndex: 'layer', render: (l: Layer | null) => (l ? <LayerChip layer={l} /> : <span style={{ fontSize: 12, color: INK.muted }}>Context</span>) },
                { title: 'Today', dataIndex: 'status', render: (st) => <DataBadge status={st} /> },
                { title: 'What it gives', dataIndex: 'note', render: (v: string) => <span style={{ fontSize: 12.5, color: INK.secondary }}>{v}</span> },
                { title: 'Charts', dataIndex: 'charts', align: 'right' },
                {
                  title: 'Screens',
                  dataIndex: 'pages',
                  render: (ps: PageKey[]) => (
                    <span className="page-tags">
                      {ps.map((k) => (
                        <Tag key={k} className="view-screen" onClick={() => navigate(pageDef(k).path)}>
                          {pageDef(k).title}
                        </Tag>
                      ))}
                    </span>
                  ),
                },
              ]}
            />
            <div className="chart-note">
              <LockOutlined /> Not used: MonsterInsights eCommerce, revenue, paid-media and Realtime reports; Campaigns outside campaign periods; Post Views Counter (duplicates MonsterInsights page views); logs of the AI plugins that Kappa replaced.
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}

