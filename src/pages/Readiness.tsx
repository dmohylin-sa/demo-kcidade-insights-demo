import { useMemo, useState } from 'react';
import { Row, Col, Card, Table, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHead, SegBar, DataBadge } from '../components/ui';
import { CHARTS, PAGES, STATUS_META, type Status, type ChartDef } from '../data/registry';
import { INK } from '../lib/palette';

const STATUS_FILL: Record<Status, string> = {
  today: '#1baf7a',
  track: '#2a78d6',
  survey: '#6250d6',
  profile: '#eda100',
  cop: '#e87ba4',
};

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
    const out: Record<Status, number> = { today: 0, track: 0, survey: 0, profile: 0, cop: 0 };
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
      unlock: c.todayMode === 'locked' ? c.unlock ?? STATUS_META[need(c)].unlockedBy : c.todayMode === 'partial' ? c.todayNote : 'Works on existing data',
    }));

  const order: Status[] = ['today', 'track', 'survey', 'profile', 'cop'];

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
                ink: st === 'profile' ? INK.primary : '#fff',
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card style={{ height: '100%' }}>
            <DataBadge status="track" />
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK.secondary }}>
              Records what learners do that the platform does not keep today: who opens a document, plays a video or a podcast, how far they watch, what the "Recommended for you" carousels show and what is clicked.
            </p>
            <b>Unlocks {counts.track} {counts.track === 1 ? 'chart' : 'charts'}.</b> Data starts at go-live.
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={{ height: '100%' }}>
            <DataBadge status="survey" />
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK.secondary }}>
              A course survey at completion and follow-ups at 6 and 12 months, sent with a reference to the learner and the course, with reminders.
            </p>
            <b>Unlocks {counts.survey} {counts.survey === 1 ? 'chart' : 'charts'}.</b> Data starts with the first survey.
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={{ height: '100%' }}>
            <DataBadge status="profile" />
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK.secondary }}>An organisation field on registration and the profile, chosen from a managed list, so results can be grouped by organisation.</p>
            <b>Unlocks {counts.profile} {counts.profile === 1 ? 'chart' : 'charts'}.</b> Data starts when learners fill it in.
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={{ height: '100%' }}>
            <DataBadge status="cop" />
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK.secondary }}>A connection to the Communities of Practice app: members, posts, replies and moderation, linked to the learner's account.</p>
            <b>Unlocks {counts.cop} {counts.cop === 1 ? 'chart' : 'charts'}.</b> Depends on the app's API and launch.
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Every chart and what it needs"
            extra={
              <Segmented
                value={filter}
                onChange={(v) => setFilter(v as 'all' | Status)}
                options={[{ value: 'all', label: 'All' }, ...order.map((st) => ({ value: st, label: st === 'today' ? 'Existing data' : STATUS_META[st].label }))]}
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
