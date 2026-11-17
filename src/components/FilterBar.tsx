import type { ReactNode } from 'react';
import { Select, Button, Popover, Badge, Tooltip, Space } from 'antd';
import { FilterOutlined, ReloadOutlined, LockOutlined } from '@ant-design/icons';
import { useStore, DEFAULT_FILTERS, type Filters } from '../lib/store';
import { PERIODS } from '../lib/time';
import {
  AREAS,
  CONTENT_LANGS,
  OCCUPATIONS,
  WORK_AREAS,
  AGE_GROUPS,
  GENDERS,
  ORGANISATIONS,
  DEVICES,
  NOT_ANSWERED,
} from '../data/taxonomy';

function opts(values: readonly string[], withNotAnswered = false) {
  const list = withNotAnswered ? [...values, NOT_ANSWERED] : values;
  return list.map((v) => ({ value: v, label: v }));
}

export default function FilterBar({ extra, segmentNote }: { extra?: ReactNode; segmentNote?: string }) {
  const filters = useStore((s) => s.filters);
  const mode = useStore((s) => s.mode);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);

  const set = <K extends keyof Filters>(k: K) => (v: Filters[K] | undefined) => setFilter(k, (v ?? null) as Filters[K]);

  const moreKeys: (keyof Filters)[] = ['workArea', 'gender', 'prefLang', 'org', 'device'];
  const moreCount = moreKeys.filter((k) => filters[k] !== null).length;
  const anySet = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const segmentSet = ['occupation', 'workArea', 'ageGroup', 'gender', 'prefLang'].some((k) => filters[k as keyof Filters] !== null);

  const lockedLabel = (label: string, why: string) =>
    mode === 'today' ? (
      <Tooltip title={`Not available today: needs ${why}`}>
        <span>
          <LockOutlined style={{ marginRight: 6, color: '#9aa0a8' }} />
          {label}
        </span>
      </Tooltip>
    ) : (
      label
    );

  const more = (
    <div style={{ display: 'grid', gap: 10, width: 260 }}>
      <div>
        <div className="filter-label">Work area</div>
        <Select allowClear placeholder="All work areas" style={{ width: '100%' }} value={filters.workArea ?? undefined} onChange={set('workArea')} options={opts(WORK_AREAS, true)} />
      </div>
      <div>
        <div className="filter-label">Gender</div>
        <Select allowClear placeholder="All" style={{ width: '100%' }} value={filters.gender ?? undefined} onChange={set('gender')} options={opts(GENDERS, true)} />
      </div>
      <div>
        <div className="filter-label">Preferred language</div>
        <Select allowClear placeholder="All languages" style={{ width: '100%' }} value={filters.prefLang ?? undefined} onChange={set('prefLang')} options={opts(CONTENT_LANGS)} />
      </div>
      <div>
        <div className="filter-label">{lockedLabel('Organisation', 'the new organisation field')}</div>
        <Select allowClear disabled={mode === 'today'} placeholder={mode === 'today' ? 'Needs a new profile field' : 'All organisations'} style={{ width: '100%' }} value={filters.org ?? undefined} onChange={set('org')} options={opts(ORGANISATIONS, true)} />
      </div>
      <div>
        <div className="filter-label">{lockedLabel('Device', 'the new tracking')}</div>
        <Select allowClear disabled={mode === 'today'} placeholder={mode === 'today' ? 'Needs new tracking' : 'All devices'} style={{ width: '100%' }} value={filters.device ?? undefined} onChange={set('device')} options={opts(DEVICES)} />
      </div>
    </div>
  );

  return (
    <>
      <div className="filter-bar">
        <Select style={{ width: 140 }} value={filters.period} onChange={(v) => setFilter('period', v)} options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} />
        <Select allowClear placeholder="All learning areas" style={{ width: 190 }} value={filters.area ?? undefined} onChange={(v) => setFilter('area', v ?? null)} options={AREAS.map((a) => ({ value: a.id, label: a.name }))} />
        <Select allowClear placeholder="All content languages" style={{ width: 170 }} value={filters.contentLang ?? undefined} onChange={set('contentLang')} options={opts(CONTENT_LANGS)} />
        <Select allowClear placeholder="All occupations" style={{ width: 165 }} value={filters.occupation ?? undefined} onChange={set('occupation')} options={opts(OCCUPATIONS, true)} />
        <Select allowClear placeholder="All ages" style={{ width: 110 }} value={filters.ageGroup ?? undefined} onChange={set('ageGroup')} options={opts(AGE_GROUPS, true)} />
        <Popover content={more} trigger="click" placement="bottomLeft" title="More learner filters">
          <Badge count={moreCount} size="small">
            <Button icon={<FilterOutlined />}>More</Button>
          </Badge>
        </Popover>
        {extra ? <Space wrap>{extra}</Space> : null}
        {anySet ? (
          <Button type="text" icon={<ReloadOutlined />} onClick={resetFilters}>
            Reset
          </Button>
        ) : null}
      </div>
      {segmentNote && segmentSet && mode === 'today' ? <div className="segment-warning">{segmentNote}</div> : null}
    </>
  );
}
