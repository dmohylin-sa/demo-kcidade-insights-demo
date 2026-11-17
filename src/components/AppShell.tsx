import { useEffect, type ReactNode } from 'react';
import { Layout, Menu, Segmented, Button, Tooltip, type MenuProps } from 'antd';
import {
  DashboardOutlined,
  ReadOutlined,
  CheckSquareOutlined,
  PlayCircleOutlined,
  BulbOutlined,
  UserOutlined,
  LikeOutlined,
  SmileOutlined,
  RiseOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGES, type PageKey } from '../data/registry';
import { useStore, type Mode } from '../lib/store';
import PresenterPanel from './PresenterPanel';
import geniuseeLogo from '../assets/geniusee-logo.svg';

const { Header, Sider, Content } = Layout;

const ICONS: Record<PageKey, ReactNode> = {
  overview: <DashboardOutlined />,
  courses: <ReadOutlined />,
  quizzes: <CheckSquareOutlined />,
  materials: <PlayCircleOutlined />,
  gaps: <BulbOutlined />,
  learners: <UserOutlined />,
  recommendations: <LikeOutlined />,
  feedback: <SmileOutlined />,
  impact: <RiseOutlined />,
  communities: <TeamOutlined />,
  readiness: <DatabaseOutlined />,
};

function menuItems(): MenuProps['items'] {
  const groups: { label: string; children: { key: string; icon: ReactNode; label: string }[] }[] = [];
  for (const p of PAGES) {
    const item = { key: p.path, icon: ICONS[p.key], label: p.title };
    const g = groups.find((x) => x.label === p.group);
    if (g) g.children.push(item);
    else groups.push({ label: p.group, children: [item] });
  }
  const items: MenuProps['items'] = [];
  for (const g of groups) {
    if (g.label) items.push({ type: 'group', label: g.label, children: g.children });
    else items.push(...g.children);
  }
  return items;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const notesOpen = useStore((s) => s.notesOpen);
  const setNotesOpen = useStore((s) => s.setNotesOpen);
  const current = PAGES.find((p) => p.path === location.pathname) ?? PAGES[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'p' || e.key === 'P') setNotesOpen(!useStore.getState().notesOpen);
      if (e.key === 't' || e.key === 'T') setMode(useStore.getState().mode === 'today' ? 'proposed' : 'today');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNotesOpen, setMode]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span className="brand-name">
            K'CIDADE Academy <span className="brand-sub">Insights</span>
          </span>
        </div>
        <span className="demo-pill">Demo data</span>
        <div className="header-spacer" />
        <span className="mode-label">Show</span>
        <Tooltip title="Switch between what the platform records today and what the proposed additions unlock (shortcut: T)">
          <Segmented
            className="mode-switch"
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'today', label: "Today's data" },
              { value: 'proposed', label: 'With proposed additions' },
            ]}
          />
        </Tooltip>
      </Header>
      <Layout>
        <Sider width={256} breakpoint="lg" collapsedWidth={0} theme="light" style={{ position: 'sticky', top: 0, height: 'calc(100vh - 60px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <Menu mode="inline" selectedKeys={[current.path]} items={menuItems()} onClick={(e) => navigate(e.key)} style={{ borderInlineEnd: 0, paddingTop: 8, flex: 1 }} />
            <div className="sider-footer">
              All figures on these screens are invented for the demo. They follow the structure of the academy's real data.
              <div className="prepared-by">
                Prepared by <img src={geniuseeLogo} alt="Geniusee" />
              </div>
            </div>
          </div>
        </Sider>
        <Content>
          <div className="content-wrap">{children}</div>
        </Content>
      </Layout>
      {!notesOpen ? (
        <Tooltip title="Presenter notes (P)" placement="left">
          <Button className="notes-fab" shape="circle" icon={<ProfileOutlined />} onClick={() => setNotesOpen(true)} aria-label="Presenter notes" />
        </Tooltip>
      ) : null}
      <PresenterPanel pageKey={current.key} />
    </Layout>
  );
}
