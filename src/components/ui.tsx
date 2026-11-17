import { useState, type ReactNode } from 'react';
import { Card, Tag, Segmented, Table, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ThunderboltOutlined,
  FormOutlined,
  IdcardOutlined,
  TeamOutlined,
  LockOutlined,
  BarChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { chart, STATUS_META, type Status } from '../data/registry';
import { useStore } from '../lib/store';
import { INK } from '../lib/palette';

const STATUS_ICON: Record<Status, ReactNode> = {
  today: <CheckCircleOutlined />,
  track: <ThunderboltOutlined />,
  survey: <FormOutlined />,
  profile: <IdcardOutlined />,
  cop: <TeamOutlined />,
};

export function DataBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <Tag color={m.color} icon={STATUS_ICON[status]}>
      {m.label}
    </Tag>
  );
}

export function Badges({ statuses }: { statuses: Status[] }) {
  return (
    <div className="badges">
      {statuses.map((s) => (
        <DataBadge key={s} status={s} />
      ))}
    </div>
  );
}

export function Locked({ id, compact }: { id: string; compact?: boolean }) {
  const c = chart(id);
  const main = c.badges.find((b) => b !== 'today') ?? c.badges[0];
  return (
    <div className={`locked${compact ? ' compact' : ''}`}>
      {!compact && <LockOutlined className="lock-icon" />}
      <div className="lock-title">{compact ? 'Not recorded today' : 'Not recorded by the platform today'}</div>
      <div className="lock-text">
        Unlocked by: <b>{c.unlock ?? STATUS_META[main].unlockedBy}</b>
      </div>
    </div>
  );
}

export interface TableSpec {
  columns: { key: string; title: string; align?: 'left' | 'right' | 'center'; render?: (v: any, row: any) => ReactNode }[];
  rows: Record<string, any>[];
}

interface ChartCardProps {
  id: string;
  children: ReactNode;
  table?: TableSpec;
  note?: ReactNode;
  extra?: ReactNode;
  /** content to show in today's mode for partial charts, if different */
  height?: number;
}

/** A chart with its title, the question it answers, its data badges, an optional table view, and the locked state. */
export function ChartCard({ id, children, table, note, extra }: ChartCardProps) {
  const c = chart(id);
  const mode = useStore((s) => s.mode);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const locked = mode === 'today' && c.todayMode === 'locked';
  return (
    <Card
      className="chart-card"
      title={
        <div>
          <div className="chart-title">{c.title}</div>
          <div className="chart-question">{c.question}</div>
        </div>
      }
      extra={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Badges statuses={c.badges} />
          {!locked && table ? (
            <Segmented
              size="small"
              value={view}
              onChange={(v) => setView(v as 'chart' | 'table')}
              options={[
                { value: 'chart', icon: <BarChartOutlined />, title: 'Chart' },
                { value: 'table', icon: <TableOutlined />, title: 'Table' },
              ]}
            />
          ) : null}
        </div>
      }
      style={{ height: '100%' }}
    >
      {locked ? (
        <Locked id={id} />
      ) : (
        <>
          {mode === 'today' && c.todayMode === 'partial' && c.todayNote ? <div className="today-note">Today: {c.todayNote}</div> : null}
          {extra}
          {view === 'table' && table ? <DataTable spec={table} /> : children}
          {note ? <div className="chart-note">{note}</div> : null}
        </>
      )}
    </Card>
  );
}

export function DataTable({ spec, pageSize = 8 }: { spec: TableSpec; pageSize?: number }) {
  return (
    <Table
      size="small"
      rowKey={(_, i) => String(i)}
      dataSource={spec.rows}
      pagination={spec.rows.length > pageSize ? { pageSize, size: 'small', showSizeChanger: false } : false}
      columns={spec.columns.map((col) => ({
        key: col.key,
        dataIndex: col.key,
        title: col.title,
        align: col.align,
        render: col.render,
      }))}
      scroll={{ x: true }}
    />
  );
}

export function Kpi({ id, value, sub, label }: { id: string; value: ReactNode; sub?: ReactNode; label?: string }) {
  const c = chart(id);
  const mode = useStore((s) => s.mode);
  const locked = mode === 'today' && c.todayMode === 'locked';
  const partial = mode === 'today' && c.todayMode === 'partial';
  const main = c.badges.find((b) => b !== 'today') ?? 'today';
  const statuses: Status[] = mode === 'today' ? (locked ? [main] : ['today']) : c.badges;
  return (
    <Card className="kpi">
      <div className="kpi-top">
        <div className="kpi-label">{label ?? c.title}</div>
        <Tooltip title={statuses.map((s) => STATUS_META[s].label).join(' + ')}>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {statuses.map((s) => (
              <Tag key={s} color={STATUS_META[s].color} style={{ margin: 0, paddingInline: 5 }}>
                {STATUS_ICON[s]}
              </Tag>
            ))}
          </span>
        </Tooltip>
      </div>
      {locked ? (
        <>
          <div className="kpi-value" style={{ color: INK.muted }}>
            -
          </div>
          <Locked id={id} compact />
        </>
      ) : (
        <>
          <div className="kpi-value">{value}</div>
          {sub ? <div className="kpi-sub">{sub}</div> : null}
          {partial && c.todayNote ? <div className="kpi-sub">{c.todayNote}</div> : null}
        </>
      )}
    </Card>
  );
}

export function PageHead({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <p>{intro}</p>
    </div>
  );
}

export function Legend({ items, line }: { items: { label: string; color: string }[]; line?: boolean }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span className="legend-item" key={it.label}>
          <span className={line ? 'legend-line' : 'legend-swatch'} style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function InlineBar({ value, max = 1, color = '#2a78d6', label }: { value: number; max?: number; color?: string; label: string }) {
  const w = Number.isFinite(value) ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  return (
    <div className="inline-bar">
      <div className="inline-bar-track">
        <div className="inline-bar-fill" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="inline-bar-val">{label}</span>
    </div>
  );
}

export function SegBar({ parts }: { parts: { label: string; value: number; color: string; ink?: string }[] }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <>
      <div className="segbar" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((100 * p.value) / total)}%`).join(', ')}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const share = p.value / total;
            return (
              <Tooltip key={p.label} title={`${p.label}: ${p.value.toLocaleString('en-GB')} (${Math.round(share * 100)}%)`}>
                <div className="segbar-part" style={{ width: `${share * 100}%`, background: p.color, color: p.ink ?? '#fff' }}>
                  {share > 0.09 ? `${Math.round(share * 100)}%` : ''}
                </div>
              </Tooltip>
            );
          })}
      </div>
      <Legend items={parts.map((p) => ({ label: p.label, color: p.color }))} />
    </>
  );
}

export function NoData({ text = 'No data for these filters.' }: { text?: string }) {
  return <div style={{ padding: '36px 0', textAlign: 'center', color: INK.muted, fontSize: 13 }}>{text}</div>;
}
