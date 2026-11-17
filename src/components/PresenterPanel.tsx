import { useEffect, useState } from 'react';
import { Drawer, Checkbox, Button, Tag, Divider } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chartsFor, page, STATUS_META, type PageKey, type Priced } from '../data/registry';
import { useStore } from '../lib/store';
import { INTERNAL } from '../data/internal';

const PRICED_LABEL: Record<Priced, string> = {
  yes: 'In the estimate',
  partly: 'Partly in the estimate',
  no: 'Beyond the estimate',
};

function readAsked(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem('kcidade-demo-asked') ?? '{}');
  } catch {
    return {};
  }
}

function writeAsked(v: Record<string, boolean>) {
  try {
    window.localStorage.setItem('kcidade-demo-asked', JSON.stringify(v));
  } catch {
    /* storage unavailable: ticks are kept for this session only */
  }
}

export default function PresenterPanel({ pageKey }: { pageKey: PageKey }) {
  const open = useStore((s) => s.notesOpen);
  const setOpen = useStore((s) => s.setNotesOpen);
  const mode = useStore((s) => s.mode);
  const navigate = useNavigate();
  const p = page(pageKey);
  const charts = chartsFor(pageKey);
  const [asked, setAsked] = useState<Record<string, boolean>>(readAsked);

  useEffect(() => writeAsked(asked), [asked]);

  const next = p.next ? page(p.next) : null;
  const watch = [...p.watch, ...(INTERNAL?.PAGE_ESTIMATE_WATCH[pageKey] ?? [])];

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      mask={false}
      width={440}
      title={
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B818A' }}>Presenter notes</div>
          <div>{p.title}</div>
        </div>
      }
      extra={<Tag color={mode === 'today' ? 'green' : 'blue'}>{mode === 'today' ? "Today's data" : 'With proposed additions'}</Tag>}
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="notes">
        <h4>Say this</h4>
        <ul>
          {p.talk.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h4>Ask the client</h4>
        {p.ask.map((q) => {
          const key = `${pageKey}:${q}`;
          return (
            <div key={key} style={{ margin: '6px 0' }}>
              <Checkbox checked={!!asked[key]} onChange={(e) => setAsked((a) => ({ ...a, [key]: e.target.checked }))}>
                <span style={{ fontSize: 13.5, textDecoration: asked[key] ? 'line-through' : undefined, color: asked[key] ? '#9aa0a8' : undefined }}>{q}</span>
              </Checkbox>
            </div>
          );
        })}

        {watch.length ? (
          <>
            <h4>Watch out</h4>
            <ul className="watch">
              {watch.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </>
        ) : null}

        {charts.length ? (
          <>
            <h4>Charts on this screen</h4>
            {charts.map((c) => (
              <div className="note-chart" key={c.id}>
                <div className="note-chart-title">
                  <span>{c.title}</span>
                  <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {c.badges.map((b) => (
                      <Tag key={b} color={STATUS_META[b].color} style={{ margin: 0, fontSize: 10.5, lineHeight: '16px', paddingInline: 6 }}>
                        {STATUS_META[b].short}
                      </Tag>
                    ))}
                  </span>
                </div>
                <div className="note-chart-meta">
                  <div>
                    <b>Source:</b> {c.source}
                  </div>
                  {INTERNAL?.CHART_ESTIMATE[c.id] ? (
                    <div>
                      <b>WBS rows:</b> {INTERNAL.CHART_ESTIMATE[c.id].rows} ·{' '}
                      <span className={`priced-${INTERNAL.CHART_ESTIMATE[c.id].priced}`}>{PRICED_LABEL[INTERNAL.CHART_ESTIMATE[c.id].priced]}</span>
                      {INTERNAL.CHART_ESTIMATE[c.id].pricedNote ? <span> - {INTERNAL.CHART_ESTIMATE[c.id].pricedNote}</span> : null}
                    </div>
                  ) : null}
                  {c.caveat ? (
                    <div>
                      <b>Caveat:</b> {c.caveat}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </>
        ) : null}

        <Divider style={{ margin: '16px 0 12px' }} />
        {next ? (
          <Button type="primary" block icon={<ArrowRightOutlined />} onClick={() => navigate(next.path)}>
            Next: {next.title}
          </Button>
        ) : null}
        <div style={{ fontSize: 12, color: '#7B818A', marginTop: 10 }}>
          All figures are invented demo data. Press <b>P</b> to hide or show these notes. Ticked questions are remembered in this browser.
        </div>
      </div>
    </Drawer>
  );
}
