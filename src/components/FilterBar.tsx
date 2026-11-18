import type { ReactNode } from 'react';
import { Select, Button, Popover, Badge, Tooltip, Space, Tag } from 'antd';
import { FilterOutlined, ReloadOutlined, LockOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore, DEFAULT_FILTERS, PROPOSED_FILTER_KEYS, type Filters } from '../lib/store';
import { useScope } from '../lib/scope';
import { PERIODS } from '../lib/time';
import {
  AREAS,
  CONTENT_LANGS,
  OCCUPATIONS,
  WORK_AREAS,
  AGE_GROUPS,
  GENDERS,
  INST_TYPES,
  ORGANISATIONS,
  DISTRICTS,
  TERRITORIES,
  EXPERIENCE,
  EDUCATION,
  FOUND_VIA,
  DEVICES,
  NOT_ANSWERED,
} from '../data/taxonomy';
import { AUDIENCES, MIN_GROUP } from '../data/audiences';
import { page } from '../data/registry';

function opts(values: readonly string[], withNotAnswered = false) {
  const list = withNotAnswered ? [...values, NOT_ANSWERED] : values;
  return list.map((v) => ({ value: v, label: v }));
}

export default function FilterBar({ extra, segmentNote }: { extra?: ReactNode; segmentNote?: string }) {
  const filters = useStore((s) => s.filters);
  const mode = useStore((s) => s.mode);
  const view = useStore((s) => s.view);
  const viewModified = useStore((s) => s.viewModified);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);
  const applyView = useStore((s) => s.applyView);
  const navigate = useNavigate();
  const scope = useScope();
  const today = mode === 'today';

  const set = <K extends keyof Filters>(k: K) => (v: Filters[K] | undefined) => setFilter(k, (v ?? null) as Filters[K]);

  const moreKeys: (keyof Filters)[] = ['workArea', 'gender', 'prefLang', ...PROPOSED_FILTER_KEYS];
  const moreCount = moreKeys.filter((k) => filters[k] !== null).length;
  const anySet = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) || view !== null;
  const segmentSet = ['occupation', 'workArea', 'ageGroup', 'gender', 'prefLang'].some((k) => filters[k as keyof Filters] !== null);
  const audience = view ? AUDIENCES.find((a) => a.key === view) : null;

  const lockedLabel = (label: string, why: string) =>
    today ? (
      <Tooltip title={`Not available today: needs ${why}`}>
        <span>
          <LockOutlined style={{ marginRight: 6, color: '#9aa0a8' }} />
          {label}
        </span>
      </Tooltip>
    ) : (
      label
    );

  const field = (label: ReactNode, control: ReactNode) => (
    <div>
      <div className="filter-label">{label}</div>
      {control}
    </div>
  );
  const proposedSelect = (k: keyof Filters, all: string, values: readonly string[], na: boolean, why = 'a new profile field', extraOpts?: { value: string; label: string }[]) => (
    <Select
      allowClear
      disabled={today}
      placeholder={today ? `Needs ${why}` : all}
      style={{ width: '100%' }}
      value={(filters[k] as string | null) ?? undefined}
      onChange={set(k) as (v: string | undefined) => void}
      options={extraOpts ?? opts(values, na)}
    />
  );

  const municipalities = TERRITORIES.filter((t) => !filters.district || t.district === filters.district).map((t) => t.municipality);

  const more = (
    <div className="more-filters">
      <div className="more-col">
        <div className="more-head">In the profile today</div>
        {field('Work area', <Select allowClear placeholder="All work areas" style={{ width: '100%' }} value={filters.workArea ?? undefined} onChange={set('workArea')} options={opts(WORK_AREAS, true)} />)}
        {field('Gender', <Select allowClear placeholder="All" style={{ width: '100%' }} value={filters.gender ?? undefined} onChange={set('gender')} options={opts(GENDERS, true)} />)}
        {field('Preferred language', <Select allowClear placeholder="All languages" style={{ width: '100%' }} value={filters.prefLang ?? undefined} onChange={set('prefLang')} options={opts(CONTENT_LANGS)} />)}
        <div className="more-head" style={{ marginTop: 6 }}>
          Session
        </div>
        {field(lockedLabel('Device', 'the event log'), proposedSelect('device', 'All devices', DEVICES, false, 'the event log'))}
      </div>
      <div className="more-col">
        <div className="more-head">Proposed Level 1 fields</div>
        {field(lockedLabel('Institution type', 'a new profile field'), proposedSelect('instType', 'All institution types', INST_TYPES, false))}
        {field(lockedLabel('Institution', 'a new profile field'), proposedSelect('org', 'All institutions', ORGANISATIONS, true))}
        {field(lockedLabel('District', 'a new profile field'), proposedSelect('district', 'All districts', DISTRICTS, false))}
        {field(lockedLabel('Municipality', 'a new profile field'), proposedSelect('municipality', 'All municipalities', municipalities, false))}
        {field(lockedLabel('Years of experience', 'a profile prompt'), proposedSelect('experience', 'All', EXPERIENCE, true, 'a profile prompt'))}
        {field(lockedLabel('Education level', 'a profile prompt'), proposedSelect('education', 'All', EDUCATION, true, 'a profile prompt'))}
        {field(lockedLabel('How they found the platform', 'a new profile field'), proposedSelect('foundVia', 'All', FOUND_VIA, true))}
      </div>
    </div>
  );

  const viewSelect = (
    <Select
      style={{ width: 250 }}
      value={view ?? 'all'}
      onChange={(v) => {
        if (v === 'all') return applyView(null);
        const a = AUDIENCES.find((x) => x.key === v)!;
        applyView(a.key);
        navigate(page(a.start).path);
      }}
      prefix={<EyeOutlined style={{ color: '#7B818A' }} />}
      popupMatchSelectWidth={300}
      options={[
        { value: 'all', label: 'All data (D&I admin)' },
        ...AUDIENCES.map((a) => ({
          value: a.key,
          disabled: today && a.proposedOnly,
          label: (
            <span title={today && a.proposedOnly ? 'Needs a new profile field' : undefined}>
              {today && a.proposedOnly ? <LockOutlined style={{ marginRight: 6, color: '#9aa0a8' }} /> : null}
              {a.view}
            </span>
          ),
        })),
      ]}
    />
  );

  return (
    <>
      <div className="filter-bar">
        <Tooltip title="Saved views: the filters each audience opens with">{viewSelect}</Tooltip>
        <Select style={{ width: 140 }} value={filters.period} onChange={(v) => setFilter('period', v)} options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} />
        <Select allowClear placeholder="All learning areas" style={{ width: 190 }} value={filters.area ?? undefined} onChange={(v) => setFilter('area', v ?? null)} options={AREAS.map((a) => ({ value: a.id, label: a.name }))} />
        <Select allowClear placeholder="All content languages" style={{ width: 170 }} value={filters.contentLang ?? undefined} onChange={set('contentLang')} options={opts(CONTENT_LANGS)} />
        <Select allowClear placeholder="All roles" style={{ width: 175 }} popupMatchSelectWidth={250} value={filters.occupation ?? undefined} onChange={set('occupation')} options={opts(OCCUPATIONS, true)} />
        <Select allowClear placeholder="All ages" style={{ width: 110 }} value={filters.ageGroup ?? undefined} onChange={set('ageGroup')} options={opts(AGE_GROUPS, true)} />
        <Popover content={more} trigger="click" placement="bottomLeft" title="More Level 1 filters">
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
      {audience ? (
        <div className="view-banner">
          <EyeOutlined />
          <span>
            <b>{audience.view}</b>
            {viewModified ? ' (changed)' : ''} · {audience.rhythm} · {audience.detail} · groups under {MIN_GROUP} hidden
          </span>
          <span className="view-screens">
            {audience.screens.map((k) => (
              <Tag key={k} className="view-screen" onClick={() => navigate(page(k).path)}>
                {page(k).title}
              </Tag>
            ))}
          </span>
        </div>
      ) : null}
      {scope.segmentActive && scope.learnerCount < MIN_GROUP ? (
        <div className="segment-warning">
          <WarningOutlined /> Only {scope.learnerCount} {scope.learnerCount === 1 ? 'learner matches' : 'learners match'} these filters. In the live system views of fewer than {MIN_GROUP} people are hidden, so that no one can be identified.
        </div>
      ) : null}
      {segmentNote && segmentSet && today ? <div className="segment-warning">{segmentNote}</div> : null}
    </>
  );
}
