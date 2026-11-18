import { useMemo, useState } from 'react';
import { Row, Col, Rate, Segmented, Tabs } from 'antd';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from 'recharts';
import FilterBar from '../components/FilterBar';
import { ChartCard, Kpi, PageHead, Legend, NoData } from '../components/ui';
import { axisProps, yAxisProps, gridProps, makeTooltip } from '../components/viz';
import { TruncTick } from '../components/viz';
import { useScope, fmtInt, fmtPct, ratio, mean } from '../lib/scope';
import { monthIndexOfDay, formatDay, monthLabel } from '../lib/time';
import { ASPECTS, PLATFORM_ITEMS } from '../data/taxonomy';
import { PLATFORM_SURVEY_MONTHS } from '../data/generate';
import { page } from '../data/registry';
import { SERIES, INK, ORDINAL, STATUS_COLORS } from '../lib/palette';

function scoreColor(v: number): { bg: string; ink: string } {
  if (!Number.isFinite(v)) return { bg: '#F7F8FA', ink: INK.muted };
  if (v < 3.6) return { bg: '#FECACA', ink: '#7f1d1d' };
  if (v < 3.9) return { bg: '#FDE7C2', ink: '#7a4b00' };
  if (v < 4.2) return { bg: '#cde2fb', ink: INK.primary };
  return { bg: '#86b6ef', ink: INK.primary };
}

function Quotes({ rows }: { rows: { text: string; course: string; day: string; avg: number }[] }) {
  if (!rows.length) return <NoData />;
  return (
    <>
      {rows.map((c, i) => (
        <div className="comment" key={i}>
          <div className="comment-text">"{c.text}"</div>
          <div className="comment-meta">
            <span style={{ color: c.avg < 3.6 ? STATUS_COLORS.critical : INK.secondary, fontWeight: 600 }}>{c.avg.toFixed(1)} / 5</span> · {c.course} · {c.day}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Feedback() {
  const s = useScope();
  const p = page('feedback');
  const { d } = s;
  const [wave, setWave] = useState(1);

  const m = useMemo(() => {
    const sent = d.surveys.filter((x) => s.learnerOk[x.learnerId] && s.courseOk[x.courseId] && s.inRange(x.sentDay));
    const answered = sent.filter((x) => x.answered);
    const reminded = sent.filter((x) => x.reminded);
    const answeredAfterReminder = sent.filter((x) => x.reminded && x.answered);
    const grid = d.courses
      .filter((c) => s.courseOk[c.id])
      .map((c) => {
        const sv = answered.filter((x) => x.courseId === c.id);
        return { course: c.title, n: sv.length, scores: ASPECTS.map((_, k) => mean(sv.map((x) => x.scores[k]))) };
      })
      .filter((r) => r.n > 0)
      .sort((a, b) => mean(a.scores) - mean(b.scores));

    const m0 = monthIndexOfDay(s.start);
    const m1 = monthIndexOfDay(s.end);
    const quarterOf = (mi: number) => Math.floor((mi + 4) / 3); // calendar quarters, month 0 = May 2025
    const qLabel = (q: number) => {
      const total = q * 3;
      return `Q${(total % 12) / 3 + 1} ${String(2025 + Math.floor(total / 12)).slice(2)}`;
    };
    const trend = [];
    for (let q = quarterOf(m0); q <= quarterOf(m1); q++) {
      const sv = answered.filter((x) => quarterOf(monthIndexOfDay(x.answerDay)) === q);
      const row: Record<string, number | string | null> = { quarter: qLabel(q), n: sv.length };
      ASPECTS.forEach((a, k) => (row[a] = sv.length >= 3 ? Math.round(mean(sv.map((x) => x.scores[k])) * 100) / 100 : null));
      trend.push(row);
    }
    const recent = [...answered].sort((a, b) => b.answerDay - a.answerDay);
    const comments = recent
      .filter((x) => x.comment)
      .slice(0, 6)
      .map((x) => ({ text: x.comment as string, course: d.courses[x.courseId].title, day: formatDay(x.answerDay), avg: mean(x.scores) }));
    const plans = recent
      .filter((x) => x.plan)
      .slice(0, 6)
      .map((x) => ({ text: x.plan as string, course: d.courses[x.courseId].title, day: formatDay(x.answerDay), avg: mean(x.scores) }));

    // platform survey, one wave
    const ps = d.platformSurveys.filter((x) => x.wave === wave && s.learnerOk[x.learnerId]);
    const psAns = ps.filter((x) => x.answered);
    const platform = PLATFORM_ITEMS.map((it) => {
      const vals = psAns.map((x) => x.items[it.key]).filter((v): v is number => v !== undefined);
      return {
        item: it.short,
        text: it.text,
        group: it.group,
        n: vals.length,
        disagree: ratio(vals.filter((v) => v <= 2).length, vals.length),
        neutral: ratio(vals.filter((v) => v === 3).length, vals.length),
        agree: ratio(vals.filter((v) => v >= 4).length, vals.length),
        avg: mean(vals),
      };
    }).filter((r) => r.n > 0);
    const allPs = d.platformSurveys.filter((x) => x.answered && s.learnerOk[x.learnerId]);
    const lastWave = Math.max(-1, ...allPs.map((x) => x.wave));
    const npsRows = allPs.filter((x) => x.wave === lastWave);
    const nps = ratio(npsRows.filter((x) => x.nps >= 9).length - npsRows.filter((x) => x.nps <= 6).length, npsRows.length) * 100;

    const reviews = d.courses
      .filter((c) => s.courseOk[c.id])
      .map((c) => {
        const rv = d.reviews.filter((r) => r.courseId === c.id && s.learnerOk[r.learnerId] && s.inRange(r.day));
        return { course: c.title, n: rv.length, stars: mean(rv.map((r) => r.stars)) };
      })
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n);

    return {
      sent: sent.length,
      answered: answered.length,
      reminded: reminded.length,
      afterReminder: answeredAfterReminder.length,
      avg: mean(answered.map((x) => x.scores[0])),
      learning: mean(answered.map((x) => x.scores[2])),
      intent: ratio(answered.filter((x) => x.plan).length, answered.length),
      nps,
      npsN: npsRows.length,
      grid,
      trend,
      comments,
      plans,
      reviews,
      platform,
      psSent: ps.length,
      psAnswered: psAns.length,
    };
  }, [s, d, wave]);

  const funnel = [
    { label: 'Sent at completion', value: m.sent },
    { label: 'Answered without reminder', value: m.answered - m.afterReminder },
    { label: 'Reminded', value: m.reminded },
    { label: 'Answered after reminder', value: m.afterReminder },
  ];

  return (
    <>
      <PageHead title={p.title} intro={p.intro} />
      <FilterBar />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi id="fb-avg" value={Number.isFinite(m.avg) ? `${m.avg.toFixed(1)} / 5` : '-'} sub="the quality of this course is good" />
        <Kpi id="fb-learning" value={Number.isFinite(m.learning) ? `${m.learning.toFixed(1)} / 5` : '-'} sub="this course increased my understanding" />
        <Kpi id="fb-intent" value={fmtPct(m.intent)} sub="wrote what they will try to apply" />
        <Kpi id="fb-nps" value={Number.isFinite(m.nps) ? `${m.nps > 0 ? '+' : ''}${Math.round(m.nps)}` : '-'} sub={`net promoter score, latest platform survey (${fmtInt(m.npsN)})`} />
        <Kpi id="fb-rate" value={fmtPct(ratio(m.answered, m.sent))} sub={`${fmtInt(m.answered)} answers to ${fmtInt(m.sent)} end-of-course surveys`} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <ChartCard
            id="fb-grid"
            table={{
              columns: [{ key: 'course', title: 'Course' }, { key: 'n', title: 'Answers', align: 'right' }, ...ASPECTS.map((a) => ({ key: a, title: a, align: 'right' as const }))],
              rows: m.grid.map((r) => Object.fromEntries([['course', r.course], ['n', r.n], ...ASPECTS.map((a, k) => [a, r.scores[k].toFixed(1)])])),
            }}
            note="Average score from 1 to 5: quality, fit with the reality of my work, increased my understanding. Red below 3.6, amber below 3.9. Weakest course first."
          >
            {m.grid.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="heat">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th className="col">Answers</th>
                      {ASPECTS.map((a) => (
                        <th className="col" key={a}>
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.grid.map((r) => (
                      <tr key={r.course}>
                        <th style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.course}>
                          {r.course}
                        </th>
                        <td style={{ background: '#F7F8FA', color: INK.secondary }}>{r.n}</td>
                        {r.scores.map((v, k) => {
                          const c = scoreColor(v);
                          return (
                            <td key={k} style={{ background: c.bg, color: c.ink }}>
                              {Number.isFinite(v) ? v.toFixed(1) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={9}>
          <ChartCard id="fb-funnel" table={{ columns: [{ key: 'label', title: 'Step' }, { key: 'value', title: 'Surveys', align: 'right' }], rows: funnel }}>
            {funnel.map((f, i) => {
              const w = ratio(f.value, m.sent);
              return (
                <div className="funnel-row" key={f.label} style={{ gridTemplateColumns: '150px 1fr 80px' }}>
                  <span className="funnel-label">{f.label}</span>
                  <div className="funnel-track">
                    <div className="funnel-fill" style={{ width: `${(w || 0) * 100}%`, background: ORDINAL[Math.min(i + 1, 4)] }} />
                  </div>
                  <span className="funnel-val">{fmtInt(f.value)}</span>
                </div>
              );
            })}
            <div className="chart-note">The reminder adds {fmtPct(ratio(m.afterReminder, m.sent))} to the response rate.</div>
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <ChartCard
            id="fb-trend"
            table={{ columns: [{ key: 'quarter', title: 'Quarter' }, { key: 'n', title: 'Answers', align: 'right' }, ...ASPECTS.map((a) => ({ key: a, title: a, align: 'right' as const }))], rows: m.trend }}
            note="By calendar quarter. Quarters with fewer than 3 answers are left out."
          >
            <Legend line items={ASPECTS.map((a, i) => ({ label: a, color: SERIES[i] }))} />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={m.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="quarter" {...axisProps} padding={{ left: 20, right: 20 }} />
                <YAxis {...yAxisProps} domain={[3, 5]} ticks={[3, 3.5, 4, 4.5, 5]} />
                <Tooltip content={makeTooltip((v) => v.toFixed(1))} />
                {ASPECTS.map((a, i) => (
                  <Line key={a} type="linear" dataKey={a} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4, stroke: '#fcfcfb', strokeWidth: 2, fill: SERIES[i] }} connectNulls activeDot={{ r: 5, stroke: '#fcfcfb', strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard id="fb-comments" note="The plan is stored and quoted back to the learner in the 6-month follow-up.">
            <Tabs
              size="small"
              items={[
                { key: 'plan', label: 'What will you try to apply?', children: <Quotes rows={m.plans} /> },
                { key: 'missing', label: 'What is missing?', children: <Quotes rows={m.comments} /> },
              ]}
            />
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard
            id="fb-platform"
            extra={
              <Segmented
                size="small"
                style={{ marginBottom: 8 }}
                value={wave}
                onChange={(v) => setWave(v as number)}
                options={PLATFORM_SURVEY_MONTHS.map((mi, i) => ({ value: i, label: monthLabel(mi) }))}
              />
            }
            table={{
              columns: [
                { key: 'text', title: 'Statement' },
                { key: 'n', title: 'Answers', align: 'right' },
                { key: 'agree', title: 'Agree (4-5)', align: 'right', render: (v: number) => fmtPct(v) },
                { key: 'avg', title: 'Average', align: 'right', render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-') },
              ],
              rows: m.platform,
            }}
            note={`Sent to the ${fmtInt(m.psSent)} learners active in the six months before; ${fmtInt(m.psAnswered)} answered. Tutor items only for tutor users, community items only for members.`}
          >
            <Legend
              items={[
                { label: 'Disagree (1-2)', color: '#e34948' },
                { label: 'Neutral (3)', color: INK.neutralBar },
                { label: 'Agree (4-5)', color: SERIES[0] },
              ]}
            />
            {m.platform.length ? (
              <ResponsiveContainer width="100%" height={Math.max(220, m.platform.length * 32)}>
                <BarChart data={m.platform} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 1]} hide />
                  <YAxis type="category" dataKey="item" {...yAxisProps} width={220} interval={0} tick={<TruncTick max={32} />} />
                  <Tooltip content={makeTooltip((v) => fmtPct(v), 'text')} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="disagree" name="Disagree" stackId="p" fill="#e34948" stroke="#fcfcfb" strokeWidth={1} maxBarSize={18} />
                  <Bar dataKey="neutral" name="Neutral" stackId="p" fill={INK.neutralBar} stroke="#fcfcfb" strokeWidth={1} maxBarSize={18} />
                  <Bar dataKey="agree" name="Agree" stackId="p" fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={1} maxBarSize={18} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="avg" position="right" formatter={(v: number) => (Number.isFinite(v) ? v.toFixed(1) : '')} style={{ fill: INK.secondary, fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard id="fb-reviews" note="LearnDash Course Reviews show star ratings on course pages. Only available where the client switches them on, and with no response rate.">
            {m.reviews.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px 24px' }}>
                {m.reviews.map((r) => (
                  <div key={r.course} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F1F2F4' }}>
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.course}>
                      {r.course}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', fontSize: 12, color: INK.secondary }}>
                      <Rate disabled allowHalf value={Math.round(r.stars * 2) / 2} style={{ fontSize: 12 }} /> {r.stars.toFixed(1)} ({r.n})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
