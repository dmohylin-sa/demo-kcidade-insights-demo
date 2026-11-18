import { useMemo, useState } from 'react';
import { Row, Col, Card, Table, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHead, SegBar, DataBadge, LayerChip } from '../components/ui';
import { CHARTS, PAGES, STATUS_META, layersOf, type Status, type ChartDef } from '../data/registry';
import { INK } from '../lib/palette';

const STATUS_FILL: Record<Status, string> = {
  today: '#1baf7a',
  track: '#2a78d6',
  survey: '#6250d6',
  profile: '#eda100',
  cop: '#e87ba4',
  ai: '#3b5bdb',
  evidence: '#d9480f',
};

const WORK: { status: Status; text: string; starts: string }[] = [
  {
    status: 'track',
    text: 'The platform event log: resources opened and downloaded, video and audio, searches, recommendations shown and clicked, tutor conversations with their mode and lesson, the registration gate.',
    starts: 'Data starts at go-live.',
  },
  {
    status: 'survey',
    text: 'One-click resource feedback, the end-of-course survey, tutor thumbs, the six-monthly platform survey, and the follow-ups at 6 and 12 months for selected courses.',
    starts: 'Data starts with the first survey.',
  },
  {
    status: 'profile',
    text: 'Level 1 fields: institution type and name, district and municipality, experience, education, how they found the platform, a starting point, and the consents.',
    starts: 'Data starts when learners fill them in.',
  },
  { status: 'ai', text: 'AI grouping of tutor questions and the content gaps it flags. Scoring, summaries and patterns come in a second phase.', starts: 'Only for learners who agree to AI analysis.' },
  { status: 'cop', text: 'A connection to the Communities of Practice app: members, posts, replies, moderation and co-created resources, linked to the learner.', starts: 'Depends on the app\'s API; second phase.' },
  { status: 'evidence', text: 'A simple admin form for Layer 5: focus groups, interviews, manager questionnaires and trainer reports, with themes and quotes.', starts: 'Filled in by the AKF teams.' },
];

/** what a chart needs beyond today's data: the first badge that is not "today", or today */
function need(c: ChartDef): Status {
  if (c.todayMode !== 'locked') return 'today';
  return c.badges.find((b) => b !== 'today') ?? 'today';
}

export default function Readiness() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | Status>('all');
  const charts = CHARTS.filter((c) => c.page !== 'readiness');

  const counts = useMemo(() => {
    const out: Record<Status, number> = { today: 0, track: 0, survey: 0, profile: 0, cop: 0, ai: 0, evidence: 0 };
    for (const c of charts) out[need(c)]++;
    return out;
  }, [charts]);
  const partial = charts.filter((c) => c.todayMode === 'partial').length;

  const rows = charts
    .filter((c) => filter === 'all' || need(c) === filter)
    .map((c) => ({
      key: c.id,
      page: PAGES.find((p) => p.key === c.page)!,
      title: c.title,
      question: c.question,
      need: need(c),
      today: c.todayMode,
      chart: c,
      unlock: c.todayMode === 'locked' ? c.unlock ?? STATUS_META[need(c)].unlockedBy : c.todayMode === 'partial' ? c.todayNote : 'Works on existing data',
    }));

  const order: Status[] = ['today', 'track', 'survey', 'profile', 'ai', 'cop', 'evidence'];

  return (
    <>
      <PageHead title="Data readiness" intro="What works on the academy's existing data from day one, and what each piece of new work unlocks." />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                <div className="kpi-label">Charts and figures in this demo</div>
                <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.05, color: INK.primary }}>
                  {counts.today} <span style={{ fontSize: 20, fontWeight: 600, color: INK.secondary }}>of {charts.length} work on existing data</span>
                </div>
                <div className="kpi-sub">{partial} of them gain more detail with the new tracking. History goes back to the academy's launch.</div>
              </div>
            </div>
            <SegBar
              parts={order.map((st) => ({
                label: st === 'today' ? 'Existing data' : `Needs: ${STATUS_META[st].label}`,
                value: counts[st],
                color: STATUS_FILL[st],
                ink: st === 'profile' || st === 'cop' ? INK.primary : '#fff',
              }))}
            />
          </Card>
        </Col>

        {WORK.map((w) => (
          <Col xs={24} md={12} xl={8} key={w.status}>
            <Card style={{ height: '100%' }}>
              <DataBadge status={w.status} />
              <p style={{ marginTop: 10, fontSize: 13.5, color: INK.secondary }}>{w.text}</p>
              <b>
                Unlocks {counts[w.status]} {counts[w.status] === 1 ? 'chart' : 'charts'}.
              </b>{' '}
              {w.starts}
            </Card>
          </Col>
        ))}

        <Col xs={24}>
          <Card
            title="Every chart and what it needs"
            extra={
              <Select
                style={{ width: 210 }}
                value={filter}
                onChange={(v) => setFilter(v as 'all' | Status)}
                options={[{ value: 'all', label: 'All charts' }, ...order.map((st) => ({ value: st, label: st === 'today' ? 'Existing data' : `Needs: ${STATUS_META[st].label}` }))]}
              />
            }
          >
            <Table
              size="small"
              rowKey="key"
              dataSource={rows}
              pagination={{ pageSize: 12, size: 'small', showSizeChanger: false }}
              scroll={{ x: 800 }}
              columns={[
                {
                  title: 'Screen',
                  dataIndex: 'page',
                  render: (p) => (
                    <a onClick={() => navigate(p.path)} style={{ whiteSpace: 'nowrap' }}>
                      {p.title}
                    </a>
                  ),
                },
                {
                  title: 'Chart',
                  dataIndex: 'title',
                  render: (t: string, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>{r.question}</div>
                    </div>
                  ),
                },
                {
                  title: 'Layers',
                  dataIndex: 'chart',
                  render: (c: ChartDef) => (
                    <span style={{ display: 'inline-flex', gap: 3 }}>
                      {layersOf(c).map((l) => (
                        <LayerChip key={l} layer={l} compact />
                      ))}
                    </span>
                  ),
                },
                { title: 'Today', dataIndex: 'today', render: (v: string) => (v === 'full' ? 'Complete' : v === 'partial' ? 'Partial' : 'Not recorded') },
                { title: 'Needs', dataIndex: 'need', render: (st: Status) => <DataBadge status={st} /> },
                { title: 'Detail', dataIndex: 'unlock', render: (v: string) => <span style={{ fontSize: 12.5, color: INK.secondary }}>{v}</span> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
