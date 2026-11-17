import { useMemo, useState } from 'react';
import { Row, Col, Table, Select, Tooltip as AntTooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, Legend, SegBar, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, pctTick, TruncTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio } from '../lib/scope';
import { resourceUse, monthOverlap } from '../lib/metrics';
import { monthIndexOfDay, monthLabel } from '../lib/time';
import { AREAS, RES_TYPES, DEVICES } from '../data/taxonomy';
import { page } from '../data/registry';
import { SERIES, INK, typeColor, rampColor, rampInk, ORDINAL } from '../lib/palette';

export default function Materials() {
  const s = useScope();
  const p = page('materials');
  const { d } = s;
  const [videoId, setVideoId] = useState<number | null>(null);

  const m = useMemo(() => {
    const ru = resourceUse(s);
    const byId = new Map(ru.map((r) => [r.resourceId, r]));
    const uses = ru.reduce((a, b) => a + b.uses, 0);
    const learnerSet = new Set<number>();
    const deviceCount: Record<string, number> = {};
    let plays = 0;
    let finished = 0;
    const m0 = monthIndexOfDay(s.start);
    const m1 = monthIndexOfDay(s.end);
    const monthly: Record<string, number | string>[] = [];
    for (let mi = m0; mi <= m1; mi++) {
      const row: Record<string, number | string> = { month: monthLabel(mi) };
      RES_TYPES.forEach((t) => (row[t] = 0));
      monthly.push(row);
    }
    const grid: number[][] = AREAS.map(() => RES_TYPES.map(() => 0));
    const watchByRes = new Map<number, number[]>();

    for (const e of d.resEvents) {
      if (!s.resourceOk[e.resourceId] || !s.learnerOk[e.learnerId] || !s.inRange(e.day)) continue;
      const r = d.resources[e.resourceId];
      const ti = RES_TYPES.indexOf(r.type);
      if (s.mode === 'proposed') {
        learnerSet.add(e.learnerId);
        deviceCount[e.device] = (deviceCount[e.device] ?? 0) + 1;
        monthly[monthIndexOfDay(e.day) - m0][r.type] = (monthly[monthIndexOfDay(e.day) - m0][r.type] as number) + 1;
        grid[r.areaId][ti]++;
        if (e.kind === 'play') {
          plays++;
          if (e.watched >= 1) finished++;
          const arr = watchByRes.get(r.id) ?? [];
          arr.push(e.watched);
          watchByRes.set(r.id, arr);
        }
      } else if (e.kind === 'download') {
        monthly[monthIndexOfDay(e.day) - m0][r.type] = (monthly[monthIndexOfDay(e.day) - m0][r.type] as number) + 1;
        grid[r.areaId][ti]++;
      }
    }
    if (s.mode === 'today') {
      for (const a of d.anon) {
        if (!s.resourceOk[a.resourceId]) continue;
        const f = monthOverlap(a.month, s.start, s.end);
        if (f <= 0) continue;
        const r = d.resources[a.resourceId];
        const ti = RES_TYPES.indexOf(r.type);
        const v = a.views * f + (s.segmentActive ? 0 : a.visitorDownloads * f);
        const row = monthly[a.month - m0];
        if (row) row[r.type] = Math.round((row[r.type] as number) + v);
        grid[r.areaId][ti] += v;
      }
    }
    const learnerDownloads = ru.reduce((a, b) => a + b.learnerDownloads, 0);
    const visitorDownloads = ru.reduce((a, b) => a + b.visitorDownloads, 0);

    const top = [...ru]
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 40)
      .map((r) => ({ ...r, res: d.resources[r.resourceId] }));

    // videos: started / past halfway / finished
    const videos = [...watchByRes.entries()]
      .map(([rid, arr]) => ({
        id: rid,
        name: d.resources[rid].title,
        type: d.resources[rid].type,
        plays: arr.length,
        finished: ratio(arr.filter((w) => w >= 1).length, arr.length),
        half: ratio(arr.filter((w) => w >= 0.5 && w < 1).length, arr.length),
        under: ratio(arr.filter((w) => w < 0.5).length, arr.length),
        curve: Array.from({ length: 11 }, (_, i) => ratio(arr.filter((w) => w >= i / 10 - 1e-9).length, arr.length)),
      }))
      .filter((v) => v.type !== 'Podcast')
      .sort((a, b) => b.plays - a.plays);
    const avgCurve = Array.from({ length: 11 }, (_, i) => {
      const all = [...watchByRes.entries()].filter(([rid]) => d.resources[rid].type !== 'Podcast').flatMap(([, arr]) => arr);
      return ratio(all.filter((w) => w >= i / 10 - 1e-9).length, all.length);
    });

    const gridMax = Math.max(1, ...grid.flat());
    return {
      uses,
      learners: learnerSet.size,
      downloads: learnerDownloads + visitorDownloads,
      learnerDownloads,
      visitorDownloads,
      videoFinish: ratio(finished, plays),
      monthly,
      grid,
      gridMax,
      top,
      byId,
      devices: DEVICES.map((dv, i) => ({ label: dv, value: deviceCount[dv] ?? 0, color: SERIES[i] })),
      videos,
      avgCurve,
    };
  }, [s, d]);

  const selVideo = m.videos.find((v) => v.id === videoId) ?? m.videos[0];
  const curveData = selVideo
    ? selVideo.curve.map((v, i) => ({ point: `${i * 10}%`, video: v, average: m.avgCurve[i] }))
    : [];
  const areasShown = AREAS.filter((a) => s.filters.area === null || a.id === s.filters.area);
  const typesShown = RES_TYPES;
  const lockCell = (
    <AntTooltip title="Needs new tracking">
      <LockOutlined style={{ color: INK.muted }} />
    </AntTooltip>
  );

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar segmentNote="In today's data, view counts are anonymous: learner filters (occupation, age and others) cannot be applied to them. Downloads by logged-in learners do follow the filters." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="mt-uses" value={fmtInt(m.uses)} sub={s.mode === 'today' ? undefined : 'opens, views, plays and downloads by logged-in learners'} />
        <Kpi id="mt-learners" value={fmtInt(m.learners)} sub="logged-in learners" />
        <Kpi id="mt-downloads" value={fmtInt(m.downloads)} sub={`${fmtInt(m.learnerDownloads)} by learners${s.segmentActive ? '' : `, ${fmtInt(m.visitorDownloads)} by visitors`}`} />
        <Kpi id="mt-videofinish" value={fmtPct(m.videoFinish)} sub="of video plays reach the end" />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            id="mt-bytype"
            table={{ columns: [{ key: 'month', title: 'Month' }, ...typesShown.map((t) => ({ key: t, title: t, align: 'right' as const }))], rows: m.monthly }}
          >
            <Legend items={typesShown.map((t, i) => ({ label: t, color: typeColor(i) }))} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={m.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {typesShown.map((t, i) => (
                  <Bar key={t} dataKey={t} stackId="a" fill={typeColor(i)} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={i === typesShown.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard id="mt-top">
            <Table
              size="small"
              rowKey="resourceId"
              dataSource={m.top}
              pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
              scroll={{ x: 960 }}
              columns={[
                {
                  title: 'Material',
                  dataIndex: 'res',
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: INK.secondary }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: typeColor(RES_TYPES.indexOf(r.type)), marginRight: 6 }} />
                        {r.type} · {AREAS[r.areaId].name} · {r.lang}
                      </div>
                    </div>
                  ),
                },
                { title: s.mode === 'today' ? 'Views + downloads' : 'Uses', dataIndex: 'uses', align: 'right', sorter: (a, b) => a.uses - b.uses, render: fmtInt },
                { title: 'Learners', dataIndex: 'uniqueLearners', align: 'right', render: (v: number) => (s.mode === 'today' ? lockCell : fmtInt(v)) },
                { title: 'Downloads', dataIndex: 'learnerDownloads', align: 'right', render: (v: number, r) => fmtInt(v + r.visitorDownloads) },
                {
                  title: 'Watched to the end',
                  dataIndex: 'finishedShare',
                  align: 'right',
                  render: (v: number) => (s.mode === 'today' ? lockCell : Number.isFinite(v) ? fmtPct(v) : '-'),
                },
                {
                  title: 'Reached from a recommendation',
                  dataIndex: 'recShare',
                  align: 'right',
                  render: (v: number) => (s.mode === 'today' ? lockCell : Number.isFinite(v) ? fmtPct(v) : '-'),
                },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard
            id="mt-grid"
            table={{
              columns: [{ key: 'area', title: 'Learning area' }, ...typesShown.map((t) => ({ key: t, title: t, align: 'right' as const }))],
              rows: areasShown.map((a) => Object.fromEntries([['area', a.name], ...typesShown.map((t, ti) => [t, Math.round(m.grid[a.id][ti])])])),
            }}
          >
            <table className="heat">
              <thead>
                <tr>
                  <th />
                  {typesShown.map((t) => (
                    <th className="col" key={t}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areasShown.map((a) => (
                  <tr key={a.id}>
                    <th>{a.name}</th>
                    {typesShown.map((t, ti) => {
                      const v = m.grid[a.id][ti];
                      const tt = v / m.gridMax;
                      return (
                        <td key={t} style={{ background: v > 0 ? rampColor(0.08 + tt * 0.92) : '#F7F8FA', color: v > 0 ? rampInk(0.08 + tt * 0.92) : INK.muted }}>
                          {Math.round(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="chart-note">Darker = more use. An empty cell means no use, often because nothing of that format exists in the area.</div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <ChartCard id="mt-visitors">
                <SegBar
                  parts={[
                    { label: 'Logged-in learners', value: m.learnerDownloads, color: SERIES[0] },
                    { label: 'Visitors (not logged in)', value: m.visitorDownloads, color: INK.neutralBar, ink: INK.primary },
                  ]}
                />
                {s.segmentActive ? <div className="chart-note">Visitors are hidden while a learner filter is set: they have no profile.</div> : null}
              </ChartCard>
            </Col>
            <Col xs={24}>
              <ChartCard id="mt-device">
                <SegBar parts={m.devices} />
              </ChartCard>
            </Col>
          </Row>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="mt-video"
            table={{
              columns: [
                { key: 'name', title: 'Video' },
                { key: 'plays', title: 'Plays', align: 'right' },
                { key: 'finished', title: 'Finished', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'half', title: 'Past halfway', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'under', title: 'Stopped before half', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.videos.slice(0, 10),
            }}
          >
            <Legend
              items={[
                { label: 'Finished', color: ORDINAL[3] },
                { label: 'Past halfway, not finished', color: ORDINAL[1] },
                { label: 'Stopped before half', color: INK.neutralBar },
              ]}
            />
            {m.videos.length ? (
              <ResponsiveContainer width="100%" height={Math.max(200, Math.min(8, m.videos.length) * 34)}>
                <BarChart data={m.videos.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 1]} {...axisProps} tickFormatter={pctTick} />
                  <YAxis type="category" dataKey="name" {...yAxisProps} width={210} tick={<TruncTick max={30} />} interval={0} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="finished" name="Finished" stackId="v" fill={ORDINAL[3]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={20} />
                  <Bar dataKey="half" name="Past halfway" stackId="v" fill={ORDINAL[1]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={20} />
                  <Bar dataKey="under" name="Stopped before half" stackId="v" fill={INK.neutralBar} stroke="#fcfcfb" strokeWidth={1} maxBarSize={20} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="mt-videocurve"
            extra={
              <Select
                style={{ width: '100%', marginBottom: 8 }}
                value={selVideo?.id}
                onChange={(v) => setVideoId(v)}
                options={m.videos.map((v) => ({ value: v.id, label: v.name }))}
                placeholder="Video"
              />
            }
            table={{
              columns: [
                { key: 'point', title: 'Point in the video' },
                { key: 'video', title: 'Still watching', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'average', title: 'All videos', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: curveData,
            }}
          >
            <Legend
              line
              items={[
                { label: 'This video', color: SERIES[0] },
                { label: 'All videos', color: INK.neutralBar },
              ]}
            />
            {curveData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={curveData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="point" {...axisProps} />
                  <YAxis {...yAxisProps} domain={[0, 1]} tickFormatter={pctTick} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v))} />
                  <Line type="monotone" dataKey="average" name="All videos" stroke={INK.neutralBar} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="video" name="This video" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4, stroke: '#fcfcfb', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
