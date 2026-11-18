import { Row, Col, Card, Tag, Button, Tooltip, Table } from 'antd';
import { EyeOutlined, LockOutlined, ClockCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../components/ui';
import { AUDIENCES, LEARNER_AUDIENCE, MIN_GROUP } from '../data/audiences';
import { page as pageDef, type PageKey } from '../data/registry';
import { useStore } from '../lib/store';
import { INK } from '../lib/palette';

const STANDARD: { name: string; covers: string; screens: PageKey[] }[] = [
  { name: 'Overview', covers: 'Headline indicators', screens: ['overview', 'learners', 'access'] },
  { name: 'Learning', covers: 'Levels 2-3 for learning', screens: ['courses', 'quizzes', 'materials', 'gaps', 'recommendations', 'feedback'] },
  { name: 'Virtual Tutor', covers: 'Levels 2-3 for the tutor', screens: ['tutor'] },
  { name: 'Practice and impact', covers: 'Levels 4 and 5', screens: ['impact', 'triangulation'] },
  { name: 'Communities of Practice', covers: 'Once connected', screens: ['communities'] },
];

export default function Audiences() {
  const p = pageDef('audiences');
  const navigate = useNavigate();
  const mode = useStore((s) => s.mode);
  const view = useStore((s) => s.view);
  const applyView = useStore((s) => s.applyView);

  const tag = (k: PageKey) => (
    <Tag key={k} className="view-screen" onClick={() => navigate(pageDef(k).path)}>
      {pageDef(k).title}
    </Tag>
  );

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <Row gutter={[16, 16]}>
        {AUDIENCES.map((a) => {
          const locked = mode === 'today' && a.proposedOnly;
          return (
            <Col xs={24} md={12} xl={8} key={a.key}>
              <Card className={`aud-card${view === a.key ? ' active' : ''}`} style={{ height: '100%' }}>
                <div className="aud-head">
                  <span className="aud-name">{a.name}</span>
                  <Tag icon={<ClockCircleOutlined />} color="blue" style={{ margin: 0 }}>
                    {a.rhythm}
                  </Tag>
                </div>
                <div className="aud-row">
                  <span>Sees</span>
                  {a.sees}
                </div>
                <div className="aud-row">
                  <span>Decides</span>
                  {a.decides}
                </div>
                <div className="aud-row">
                  <span>Detail</span>
                  {a.detail}
                </div>
                <div className="aud-row">
                  <span>Screens</span>
                  <span className="page-tags">{a.screens.map(tag)}</span>
                </div>
                <Tooltip title={locked ? 'Needs a new profile field (institution or territory)' : undefined}>
                  <Button
                    type={view === a.key ? 'primary' : 'default'}
                    icon={locked ? <LockOutlined /> : <EyeOutlined />}
                    disabled={locked}
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      applyView(a.key);
                      navigate(pageDef(a.start).path);
                    }}
                  >
                    Open "{a.view}"
                  </Button>
                </Tooltip>
              </Card>
            </Col>
          );
        })}
        <Col xs={24} md={12} xl={8}>
          <Card className="aud-card muted" style={{ height: '100%' }}>
            <div className="aud-head">
              <span className="aud-name">{LEARNER_AUDIENCE.name}</span>
              <Tag style={{ margin: 0 }}>{LEARNER_AUDIENCE.rhythm}</Tag>
            </div>
            <div className="aud-row">
              <span>Sees</span>
              {LEARNER_AUDIENCE.sees}
            </div>
            <div className="aud-row">
              <span>Decides</span>
              {LEARNER_AUDIENCE.decides}
            </div>
            <div className="aud-row">
              <span>Detail</span>
              {LEARNER_AUDIENCE.detail}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Predefined first: the five standard dashboards">
            <Table
              size="small"
              rowKey="name"
              pagination={false}
              dataSource={STANDARD}
              columns={[
                { title: 'Dashboard', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                { title: 'Covers', dataIndex: 'covers' },
                { title: 'Screens in this demo', dataIndex: 'screens', render: (ks: PageKey[]) => <span className="page-tags">{ks.map(tag)}</span> },
              ]}
            />
            <div className="chart-note">
              Every dashboard can be filtered by any Level 1 field, period, learning area, course, institution and territory, and a filtered view can be saved for an audience. A report builder (choose indicators, filters and layout; templates per stakeholder; scheduled e-mails) can come later.
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Rules across all dashboards" style={{ height: '100%' }}>
            <ul className="rules">
              <li>
                <SafetyOutlined /> Access follows platform roles.
              </li>
              <li>
                <SafetyOutlined /> Individual-level views need their own permission (platform team only).
              </li>
              <li>
                <SafetyOutlined /> Groups smaller than {MIN_GROUP} people are hidden, so no learner can be identified.
              </li>
              <li>
                <SafetyOutlined /> Partners see only their institution; municipalities only their territory.
              </li>
              <li>
                <SafetyOutlined /> Every view can be exported to PDF or CSV.
              </li>
            </ul>
            <div style={{ fontSize: 12.5, color: INK.secondary }}>The decisions in the table are a proposal for the D&I team to confirm.</div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
