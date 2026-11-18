import { useMemo, useState } from 'react';
import { Row, Col, Select } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell, CartesianGrid } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, PageHead, Legend, NoData } from '../components/ui';
import { yAxisProps, axisProps, gridProps, makeTooltip, HBAR_RADIUS, BAR_RADIUS, pctTick } from '../components/viz';
import { useScope, fmtPct, fmtInt, ratio, mean, suppress } from '../lib/scope';
import { AREAS, USE_LEVELS, BARRIERS, FOLLOWUP_WAVES, OUTCOMES, OCCUPATIONS, INST_TYPES, DISTRICTS, NOT_ANSWERED } from '../data/taxonomy';
import { MIN_GROUP } from '../data/audiences';
import { page } from '../data/registry';
import { SERIES, INK, ORDINAL } from '../lib/palette';
import type { FollowUp, Learner } from '../data/generate';

const USE_COLORS = [SERIES[2], '#7fd1ae', '#eda100', INK.neutralBar];

function Dumbbell({ rows }: { rows: { group: string; a: number; b: number; n: number }[] }) {
  if (!rows.length) return <NoData text="Not enough answers for these filters." />;
  const x = (v: number) => `${((v - 1) / 4) * 100}%`;
  return (
    <div>
      <Legend
        items={[
          { label: 'Before the course', color: ORDINAL[0] },
          { label: 'Now', color: ORDINAL[3] },
        ]}
      />
      {rows.map((r) => (
        <div className="dumbbell-row" key={r.group} title={`${r.n} answers`}>
          <span className="funnel-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.group}
          </span>
          <div className="dumbbell-track">
            <div className="dumbbell-axis" />
            <div className="dumbbell-link" style={{ left: x(Math.min(r.a, r.b)), width: `${(Math.abs(r.b - r.a) / 4) * 100}%` }} />
            <div className="dumbbell-dot" style={{ left: x(r.a), background: ORDINAL[0] }} />
            <div className="dumbbell-dot" style={{ left: x(r.b), background: ORDINAL[3] }} />
          </div>
          <span className="funnel-val">
            {r.a.toFixed(1)} → {r.b.toFixed(1)} <small>({r.n})</small>
          </span>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 110px', gap: 10, fontSize: 11, color: INK.muted }}>
        <span />
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </span>
      </div>
    </div>
  );
}

type SegDim = 'instType' | 'occupation' | 'district';
const SEG: { key: SegDim; label: string; values: string[] }[] = [
  { key: 'instType', label: 'Institution type', values: [...INST_TYPES] },
  { key: 'occupation', label: 'Role', values: [...OCCUPATIONS, NOT_ANSWERED] },
  { key: 'district', label: 'District', values: [...DISTRICTS] },
];

export default function Impact() {
  const s = useScope();
  const p = page('impact');
  const { d } = s;
  const [segDim, setSegDim] = useState<SegDim>('instType');

  const m = useMemo(() => {
    const fu = d.followUps.filter((f) => s.learnerOk[f.learnerId] && s.courseOk[f.courseId] && s.inRange(f.sentDay));
    const ans = fu.filter((f) => f.answered);
    const byWave = (w: number) => fu.filter((f) => f.wave === w);

    const coverage = FOLLOWUP_WAVES.map((label, w) => {
      const all = byWave(w);
      return {
        wave: label,
        eligible: all.length,
        consented: all.filter((f) => f.consented).length,
        contacted: all.filter((f) => f.contacted).length,
        responded: all.filter((f) => f.answered).length,
        rate: ratio(all.filter((f) => f.answered).length, all.filter((f) => f.contacted).length),
      };
    });

    const use = FOLLOWUP_WAVES.map((label, w) => {
      const a = ans.filter((f) => f.wave === w);
      const row: Record<string, number | string> = { wave: label, n: a.length };
      USE_LEVELS.forEach((u, k) => (row[u] = ratio(a.filter((f) => f.use === k).length, a.length)));
      return row;
    });

    const outcomes: { label: string; share: number; n: number; wave: string }[] = [];
    for (const o of OUTCOMES) {
      for (const w of o.waves) {
        const a = ans.filter((f) => f.wave === w && f.outcomes[o.key] !== undefined);
        outcomes.push({ label: `${o.label} (${FOLLOWUP_WAVES[w]})`, share: ratio(a.filter((f) => f.outcomes[o.key]).length, a.length), n: a.length, wave: FOLLOWUP_WAVES[w] });
      }
    }

    const conf = AREAS.map((a) => {
      const rows = ans.filter((f) => d.courses[f.courseId].areaId === a.id);
      return { group: a.name, a: mean(rows.map((f) => f.confBefore)), b: mean(rows.map((f) => f.confNow)), n: rows.length };
    }).filter((r) => r.n >= 3);

    const six = ans.filter((f) => f.wave === 0);
    const barriers = BARRIERS.map((b, i) => ({ name: b, share: ratio(six.filter((f) => f.barriers.includes(i)).length, six.length) })).sort((x, y) => y.share - x.share);

    // respondents vs everyone eligible, by role
    const eligibleL = fu.map((f) => d.learners[f.learnerId]);
    const respL = ans.map((f) => d.learners[f.learnerId]);
    const respondents = [...OCCUPATIONS, NOT_ANSWERED].map((r) => ({
      group: r,
      eligible: ratio(eligibleL.filter((l) => l.occupation === r).length, eligibleL.length),
      respondents: ratio(respL.filter((l) => l.occupation === r).length, respL.length),
    }));
    const motE = mean(eligibleL.map((l) => l.motivation));

    const segDef = SEG.find((x) => x.key === segDim)!;
    const seg = suppress(
      segDef.values.map((v) => {
        const rows = ans.filter((f) => (d.learners[f.learnerId][segDim as keyof Learner] as string) === v);
        return { group: v, n: rows.length, use: ratio(rows.filter((f) => f.use <= 1).length, rows.length) };
      }),
      (r) => r.n,
    );

    const orgRows = suppress(
      INST_TYPES.map((t) => {
        const rows = ans.filter((f) => d.learners[f.learnerId].instType === t);
        const twelve = rows.filter((f) => f.wave === 1);
        return {
          group: t,
          n: rows.length,
          shared: ratio(rows.filter((f) => f.outcomes.shared).length, rows.length),
          orgChange: ratio(twelve.filter((f) => f.outcomes.orgChange).length, twelve.length),
          n12: twelve.length,
        };
      }),
      (r) => r.n,
    );

    const quotes = ans
      .filter((f) => f.wave === 0)
      .map((f) => {
        const sv = d.surveys.find((x) => x.enrolmentId === f.enrolmentId);
        return { f, plan: sv?.plan ?? null };
      })
      .filter((x) => x.plan)
      .sort((a, b) => b.f.sentDay - a.f.sentDay)
      .slice(0, 4);
    const changes = ans
      .filter((f) => f.changeText)
      .sort((a, b) => b.sentDay - a.sentDay)
      .slice(0, 4);

    return { coverage, use, outcomes, conf, barriers, respondents, motBias: mean(respL.map((l) => l.motivation)) - motE, seg, segLabel: segDef.label, orgRows, quotes, changes, total: ans.length };
  }, [s, d, segDim]);

  const course = (f: FollowUp) => d.courses[f.courseId].title;

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            id="im-coverage"
            table={{
              columns: [
                { key: 'wave', title: 'Follow-up' },
                { key: 'eligible', title: 'Eligible', align: 'right' },
                { key: 'consented', title: 'Agreed to be contacted', align: 'right' },
                { key: 'contacted', title: 'Contacted', align: 'right' },
                { key: 'responded', title: 'Responded', align: 'right' },
                { key: 'rate', title: 'Response rate', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.coverage,
            }}
            note="Eligible: completed a course the D&I team selected for this follow-up. Sent by e-mail with a one-time link and shown at the next login, with one reminder. These counts belong next to every Level 4 result."
          >
            <div className="coverage">
              {m.coverage.map((c) => (
                <div className="coverage-wave" key={c.wave}>
                  <div className="coverage-title">{c.wave}</div>
                  {[
                    ['Eligible', c.eligible],
                    ['Agreed to be contacted', c.consented],
                    ['Contacted', c.contacted],
                    ['Responded', c.responded],
                  ].map(([label, v], i) => (
                    <div className="funnel-row" key={label as string} style={{ gridTemplateColumns: '160px 1fr 70px' }}>
                      <span className="funnel-label">{label}</span>
                      <div className="funnel-track">
                        <div className="funnel-fill" style={{ width: `${ratio(v as number, c.eligible) * 100 || 0}%`, background: ORDINAL[i + 1] }} />
                      </div>
                      <span className="funnel-val">{fmtInt(v as number)}</span>
                    </div>
                  ))}
                  <div className="chart-note" style={{ marginTop: 2 }}>
                    Response rate <b>{fmtPct(c.rate)}</b> of those contacted
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="im-use"
            table={{
              columns: [{ key: 'wave', title: 'Follow-up' }, { key: 'n', title: 'Answers', align: 'right' }, ...USE_LEVELS.map((u) => ({ key: u, title: u, align: 'right' as const, render: (v: number) => fmtPct(v) }))],
              rows: m.use,
            }}
            note='"Have you used anything from this course or these resources in your work?"'
          >
            <Legend items={USE_LEVELS.map((u, i) => ({ label: u, color: USE_COLORS[i] }))} />
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={m.use} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis type="category" dataKey="wave" {...yAxisProps} width={90} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'wave')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {USE_LEVELS.map((u, i) => (
                  <Bar key={u} dataKey={u} stackId="u" fill={USE_COLORS[i]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={28} radius={i === USE_LEVELS.length - 1 ? [0, 4, 4, 0] : 0}>
                    <LabelList dataKey={u} position="center" formatter={(v: number) => (v >= 0.08 ? fmtPct(v) : '')} style={{ fill: i === 0 ? '#fff' : INK.primary, fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="im-outcomes"
            table={{
              columns: [
                { key: 'label', title: 'Question' },
                { key: 'n', title: 'Answers', align: 'right' },
                { key: 'share', title: 'Yes', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.outcomes,
            }}
            note="Practice, organisational capacity and services to communities: the impact indicators of the early framework."
          >
            <Legend
              items={[
                { label: FOLLOWUP_WAVES[0], color: SERIES[1] },
                { label: FOLLOWUP_WAVES[1], color: SERIES[0] },
              ]}
            />
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={m.outcomes} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis type="category" dataKey="label" {...yAxisProps} width={300} interval={0} tick={{ fill: INK.secondary, fontSize: 11.5 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'label')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="share" name="Yes" radius={HBAR_RADIUS} maxBarSize={16}>
                  {m.outcomes.map((o) => (
                    <Cell key={o.label} fill={o.wave === FOLLOWUP_WAVES[0] ? SERIES[1] : SERIES[0]} />
                  ))}
                  <LabelList dataKey="share" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={13}>
          <ChartCard
            id="im-confidence"
            table={{
              columns: [
                { key: 'group', title: 'Learning area' },
                { key: 'n', title: 'Answers', align: 'right' },
                { key: 'a', title: 'Before', align: 'right', render: (v: number) => v.toFixed(1) },
                { key: 'b', title: 'Now', align: 'right', render: (v: number) => v.toFixed(1) },
              ],
              rows: m.conf,
            }}
            note='"Before the course, how confident were you in [area]? And now?" (1-5, asked together). It measures change even where no starting point was recorded at registration.'
          >
            <Dumbbell rows={m.conf} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={11}>
          <ChartCard id="im-barriers" table={{ columns: [{ key: 'name', title: 'Barrier' }, { key: 'share', title: 'Share of answers', align: 'right', render: (v: number) => fmtPct(v) }], rows: m.barriers }} note="6-month follow-up, more than one answer possible.">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.barriers} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis type="category" dataKey="name" {...yAxisProps} width={150} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'name')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="share" name="Share" fill={SERIES[3]} radius={HBAR_RADIUS} maxBarSize={18}>
                  <LabelList dataKey="share" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            id="im-respondents"
            table={{
              columns: [
                { key: 'group', title: 'Role' },
                { key: 'eligible', title: 'Eligible', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'respondents', title: 'Respondents', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.respondents,
            }}
            note={`The Level 1 profile of respondents against everyone eligible. In the demo data, respondents are ${m.motBias > 0.03 ? 'more engaged learners than average: results lean positive' : 'close to everyone eligible'}.`}
          >
            <Legend
              items={[
                { label: 'All eligible learners', color: INK.neutralBar },
                { label: 'Respondents', color: SERIES[0] },
              ]}
            />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={m.respondents} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barGap={1}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="group" {...yAxisProps} width={200} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="eligible" name="Eligible" fill={INK.neutralBar} radius={HBAR_RADIUS} maxBarSize={10} />
                <Bar dataKey="respondents" name="Respondents" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            id="im-segment"
            extra={<Select size="small" style={{ width: 170, marginBottom: 8 }} value={segDim} onChange={setSegDim} options={SEG.map((x) => ({ value: x.key, label: x.label }))} />}
            table={{
              columns: [
                { key: 'group', title: m.segLabel },
                { key: 'n', title: 'Answers', align: 'right' },
                { key: 'use', title: 'Use it in their work', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.seg.shown,
            }}
            note={`Often or sometimes, both follow-ups together. ${m.seg.hidden ? `${m.seg.hidden} groups with fewer than ${MIN_GROUP} answers hidden.` : ''}`}
          >
            {m.seg.shown.length ? (
              <ResponsiveContainer width="100%" height={Math.max(150, m.seg.shown.length * 34)}>
                <BarChart data={m.seg.shown} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="group" {...yAxisProps} width={200} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="use" name="Use it in their work" fill={SERIES[2]} radius={HBAR_RADIUS} maxBarSize={18}>
                    <LabelList dataKey="use" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData text={`No group has ${MIN_GROUP} or more answers for these filters.`} />
            )}
          </ChartCard>
        </Col>

        <Col xs={24} lg={10}>
          <ChartCard
            id="im-org"
            table={{
              columns: [
                { key: 'group', title: 'Institution type' },
                { key: 'n', title: 'Answers', align: 'right' },
                { key: 'shared', title: 'Shared with colleagues', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'orgChange', title: 'Organisation changed (12 m)', align: 'right', render: (v: number) => fmtPct(v) },
              ],
              rows: m.orgRows.shown,
            }}
            note={`By the learner's institution type. ${m.orgRows.hidden ? `${m.orgRows.hidden} types with fewer than ${MIN_GROUP} answers hidden.` : ''}`}
          >
            <Legend
              items={[
                { label: 'Shared it with colleagues or team', color: SERIES[1] },
                { label: 'Organisation changed a practice (+12 months)', color: SERIES[0] },
              ]}
            />
            {m.orgRows.shown.length ? (
              <ResponsiveContainer width="100%" height={Math.max(150, m.orgRows.shown.length * 46)}>
                <BarChart data={m.orgRows.shown} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barGap={1}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="group" {...yAxisProps} width={110} interval={0} tick={{ fill: INK.secondary, fontSize: 12 }} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'group')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="shared" name="Shared" fill={SERIES[1]} radius={HBAR_RADIUS} maxBarSize={14}>
                    <LabelList dataKey="shared" position="right" formatter={(v: number) => fmtPct(v)} style={{ fill: INK.secondary, fontSize: 11 }} />
                  </Bar>
                  <Bar dataKey="orgChange" name="Organisation changed" fill={SERIES[0]} radius={HBAR_RADIUS} maxBarSize={14}>
                    <LabelList dataKey="orgChange" position="right" formatter={(v: number) => (Number.isFinite(v) ? fmtPct(v) : '')} style={{ fill: INK.secondary, fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData text={`No institution type has ${MIN_GROUP} or more answers.`} />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <ChartCard id="im-quotes" note="The plan comes from the end-of-course survey and is quoted back in the 6-month follow-up. The last question recruits volunteers for Layer 5 interviews.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 24px' }}>
              <div>
                <div className="more-head">You said you would try... Did you?</div>
                {m.quotes.length ? (
                  m.quotes.map(({ f, plan }) => (
                    <div className="comment" key={f.enrolmentId}>
                      <div className="comment-text">"{plan}"</div>
                      <div className="comment-meta">
                        <b style={{ color: f.outcomes.tried ? SERIES[2] : INK.secondary }}>{f.outcomes.tried ? 'Yes, tried it' : 'Not yet'}</b> · {course(f)}
                      </div>
                    </div>
                  ))
                ) : (
                  <NoData />
                )}
              </div>
              <div>
                <div className="more-head">One thing I now do differently</div>
                {m.changes.length ? (
                  m.changes.map((f) => (
                    <div className="comment" key={`${f.enrolmentId}-${f.wave}`}>
                      <div className="comment-text">"{f.changeText}"</div>
                      <div className="comment-meta">
                        {FOLLOWUP_WAVES[f.wave]} · {course(f)}
                      </div>
                    </div>
                  ))
                ) : (
                  <NoData />
                )}
              </div>
            </div>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}

