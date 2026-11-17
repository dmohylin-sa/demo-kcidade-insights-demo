import { useMemo } from 'react';
import { Row, Col } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, LineChart, Line, Cell } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, Legend, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, intTooltip, makeTooltip, BAR_RADIUS, HBAR_RADIUS } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean, median } from '../lib/scope';
import { monthIndexOfDay, monthLabel, MONTH_COUNT } from '../lib/time';
import { COMMUNITIES } from '../data/taxonomy';
import { COP_LAUNCH_MONTH, AI_MODERATION_MONTH } from '../data/generate';
import { page } from '../data/registry';
import { SERIES, INK } from '../lib/palette';

export default function Communities() {
  const s = useScope();
  const p = page('communities');
  const { d } = s;

  const m = useMemo(() => {
    const m0 = Math.max(COP_LAUNCH_MONTH, monthIndexOfDay(s.start));
    const m1 = monthIndexOfDay(s.end);
    const inMonths = (mi: number) => mi >= m0 && mi <= m1;
    const communities = COMMUNITIES.filter((c) => s.filters.area === null || c.areaId === s.filters.area);
    const cids = new Set<number>(communities.map((c) => c.id));
    const members = d.learners.filter((l) => s.learnerOk[l.id] && l.communities.some((c) => cids.has(c)) && l.copJoinMonth <= m1);
    const mm = d.copMemberMonths.filter((x) => s.learnerOk[x.learnerId] && cids.has(x.communityId) && inMonths(x.month));
    const cm = d.copCommunityMonths.filter((x) => cids.has(x.communityId) && inMonths(x.month));
    const active = new Set(mm.map((x) => x.learnerId));
    const posts = mm.reduce((a, b) => a + b.posts, 0);
    const replies = mm.reduce((a, b) => a + b.replies, 0);

    const perCommunity = communities.map((c) => {
      const mem = members.filter((l) => l.communities.includes(c.id)).length;
      const act = new Set(mm.filter((x) => x.communityId === c.id).map((x) => x.learnerId)).size;
      const memberReplies = mm.filter((x) => x.communityId === c.id).reduce((a, b) => a + b.replies, 0);
      const modReplies = cm.filter((x) => x.communityId === c.id).reduce((a, b) => a + b.moderatorReplies, 0);
      const sv = d.copSurveys.filter((x) => x.communityId === c.id && s.learnerOk[x.learnerId]);
      return {
        name: c.name,
        members: mem,
        active: act,
        peerShare: ratio(memberReplies, memberReplies + modReplies),
        belonging: mean(sv.map((x) => x.belonging)),
        peerSupport: mean(sv.map((x) => x.peerSupport)),
        surveyN: sv.length,
      };
    });

    const monthly = [];
    const moderation = [];
    for (let mi = m0; mi <= m1 && mi < MONTH_COUNT; mi++) {
      const rows = mm.filter((x) => x.month === mi);
      monthly.push({ month: monthLabel(mi), Posts: rows.reduce((a, b) => a + b.posts, 0), Replies: rows.reduce((a, b) => a + b.replies, 0) });
      const c = cm.filter((x) => x.month === mi);
      moderation.push({ month: monthLabel(mi), 'By a person': c.reduce((a, b) => a + b.modPerson, 0), 'By the AI assistant': c.reduce((a, b) => a + b.modAi, 0) });
    }

    const memberIds = new Set(d.learners.filter((l) => l.communities.length).map((l) => l.id));
    const es = d.enrolments.filter((e) => s.learnerOk[e.learnerId] && s.courseOk[e.courseId] && s.inRange(e.day));
    const done = (arr: typeof es) => ratio(arr.filter((e) => e.completedDay !== null).length, arr.length);
    const completion = [
      { group: 'Community members', rate: done(es.filter((e) => memberIds.has(e.learnerId))), n: es.filter((e) => memberIds.has(e.learnerId)).length },
      { group: 'Other learners', rate: done(es.filter((e) => !memberIds.has(e.learnerId))), n: es.filter((e) => !memberIds.has(e.learnerId)).length },
    ];

    return {
      members: members.length,
      active: active.size,
      posts,
      replies,
      firstReply: median(cm.map((x) => x.firstReplyHours)),
      perCommunity,
      monthly,
      moderation,
      completion,
    };
  }, [s, d]);

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="cp-members" value={fmtInt(m.members)} sub="learners in at least one community" />
        <Kpi id="cp-active" value={fmtInt(m.active)} sub={`${fmtPct(ratio(m.active, m.members))} posted or replied in the period`} />
        <Kpi id="cp-posts" value={fmtInt(m.posts + m.replies)} sub={`${fmtInt(m.posts)} posts, ${fmtInt(m.replies)} replies`} />
        <Kpi id="cp-firstreply" value={Number.isFinite(m.firstReply) ? `${Math.round(m.firstReply)} h` : '-'} sub="median, per community and month" />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ChartCard
            id="cp-communities"
            table={{ columns: [{ key: 'name', title: 'Community' }, { key: 'members', title: 'Members', align: 'right' }, { key: 'active', title: 'Active in the period', align: 'right' }], rows: m.perCommunity }}
          >
            <Legend
              items={[
                { label: 'Members', color: SERIES[0] },
                { label: 'Active in the period', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={m.perCommunity} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barGap={2}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={200} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="members" name="Members" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={14}>
                  <LabelList dataKey="members" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="active" name="Active" fill={SERIES[1]} radius={HBAR_RADIUS} maxBarSize={14}>
                  <LabelList dataKey="active" position="right" style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard id="cp-monthly" table={{ columns: [{ key: 'month', title: 'Month' }, { key: 'Posts', title: 'Posts', align: 'right' }, { key: 'Replies', title: 'Replies', align: 'right' }], rows: m.monthly }}>
            <Legend
              line
              items={[
                { label: 'Posts', color: SERIES[0] },
                { label: 'Replies', color: SERIES[1] },
              ]}
            />
            {m.monthly.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={m.monthly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...yAxisProps} allowDecimals={false} />
                  <Tooltip content={intTooltip} />
                  <Line type="monotone" dataKey="Posts" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Replies" stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <NoData text="The communities start in January 2026 in the demo data." />
            )}
          </ChartCard>
        </Col>

        <Col xs={24} lg={10}>
          <ChartCard
            id="cp-peer"
            table={{ columns: [{ key: 'name', title: 'Community' }, { key: 'peerShare', title: 'Replies by members', align: 'right', render: (v: number) => fmtPct(v) }], rows: m.perCommunity }}
            note="Share of replies written by members rather than moderators."
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={m.perCommunity} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 1]} />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={200} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="peerShare" name="Replies by members" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={18}>
                  <LabelList dataKey="peerShare" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <ChartCard
            id="cp-moderation"
            table={{ columns: [{ key: 'month', title: 'Month' }, { key: 'By a person', title: 'By a person', align: 'right' }, { key: 'By the AI assistant', title: 'By the AI assistant', align: 'right' }], rows: m.moderation }}
            note={`In the demo data, AI moderation starts in ${monthLabel(AI_MODERATION_MONTH)}.`}
          >
            <Legend
              items={[
                { label: 'By a person', color: SERIES[0] },
                { label: 'By the AI assistant', color: SERIES[6] },
              ]}
            />
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={m.moderation} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} />
                <Tooltip content={intTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="By a person" stackId="m" fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} />
                <Bar dataKey="By the AI assistant" stackId="m" fill={SERIES[6]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard
            id="cp-belonging"
            table={{
              columns: [
                { key: 'name', title: 'Community' },
                { key: 'surveyN', title: 'Answers', align: 'right' },
                { key: 'belonging', title: 'Belonging', align: 'right', render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-') },
                { key: 'peerSupport', title: 'Peer support', align: 'right', render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-') },
              ],
              rows: m.perCommunity,
            }}
            note="Member survey, average score from 1 to 5."
          >
            <Legend
              items={[
                { label: 'I feel I belong to this community', color: SERIES[0] },
                { label: 'I get support from other members', color: SERIES[1] },
              ]}
            />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.perCommunity} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: INK.muted, fontSize: 10.5 }} tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
                <YAxis {...yAxisProps} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                <Tooltip content={makeTooltip((v) => v.toFixed(1))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="belonging" name="Belonging" fill={SERIES[0]} radius={BAR_RADIUS} maxBarSize={22}>
                  <LabelList dataKey="belonging" position="top" formatter={(v: number) => (Number.isFinite(v) ? v.toFixed(1) : '')} style={{ fill: INK.secondary, fontSize: 10.5 }} />
                </Bar>
                <Bar dataKey="peerSupport" name="Peer support" fill={SERIES[1]} radius={BAR_RADIUS} maxBarSize={22}>
                  <LabelList dataKey="peerSupport" position="top" formatter={(v: number) => (Number.isFinite(v) ? v.toFixed(1) : '')} style={{ fill: INK.secondary, fontSize: 10.5 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            id="cp-completion"
            table={{ columns: [{ key: 'group', title: 'Learners' }, { key: 'n', title: 'Enrolments', align: 'right' }, { key: 'rate', title: 'Completion rate', align: 'right', render: (v: number) => fmtPct(v) }], rows: m.completion }}
            note="Association, not cause: motivated learners are more likely to join a community."
          >
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={m.completion} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 1]} />
                <YAxis type="category" dataKey="group" {...yAxisProps} width={150} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="rate" name="Completion rate" radius={HBAR_RADIUS} maxBarSize={24}>
                  {m.completion.map((c, i) => (
                    <Cell key={c.group} fill={i === 0 ? SERIES[0] : INK.neutralBar} />
                  ))}
                  <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.primary, fontSize: 13, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}

