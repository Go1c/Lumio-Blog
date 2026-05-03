import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button, Tag } from '@opennote/ui';
import { api, type NoteSummary, type OgTemplate } from '../api.js';

interface TemplateMeta {
  id: OgTemplate;
  name: string;
  hint: string;
}

const TEMPLATES: TemplateMeta[] = [
  { id: 'minimal', name: '极简 · minimal', hint: '杂志风,大字号副标题。默认' },
  { id: 'newspaper', name: '报纸 · newspaper', hint: '衬线字 + 双栏分割线' },
  { id: 'terminal', name: '终端 · terminal', hint: '深色等宽 / 极客风' },
  { id: 'magazine', name: '画刊 · magazine', hint: '渐变 + 大封面' },
];

interface Overrides {
  title?: string;
  description?: string;
  author?: string;
  date?: string;
  reading?: string;
}

export function OgPage(): JSX.Element {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [slug, setSlug] = useState<string>('');
  const [tmpl, setTmpl] = useState<OgTemplate>('minimal');
  const [ovr, setOvr] = useState<Overrides>({});
  const [bumper, setBumper] = useState(0); // 用于强刷预览
  const [batch, setBatch] = useState<{ running: boolean; total: number; done: number; failed: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  useEffect(() => {
    api
      .listNotes()
      .then((r) => {
        setNotes(r.notes);
        const first = r.notes[0];
        if (!slug && first) setSlug(first.slug);
      })
      .catch((e: Error) => setToast({ msg: e.message, err: true }));
  }, []);

  const publicNotes = useMemo(() => (notes ?? []).filter((n) => n.visibility === 'public'), [notes]);

  const previewUrl = useMemo(() => {
    if (!slug) return '';
    const overrides: Record<string, string> = {};
    if (ovr.title) overrides.title = ovr.title;
    if (ovr.description) overrides.description = ovr.description;
    if (ovr.author) overrides.author = ovr.author;
    if (ovr.date) overrides.date = ovr.date;
    if (ovr.reading) overrides.reading = ovr.reading;
    const params = Object.keys(overrides).length
      ? { slug, template: tmpl, overrides }
      : { slug, template: tmpl };
    const url = api.og.previewUrl(params);
    return `${url}&_=${bumper}`;
  }, [slug, tmpl, ovr, bumper]);

  const note = useMemo(() => (notes ?? []).find((n) => n.slug === slug) ?? null, [notes, slug]);

  const onChangeOverride = (key: keyof Overrides) => (e: Event) => {
    const v = (e.target as HTMLInputElement).value;
    setOvr((prev) => ({ ...prev, [key]: v }));
  };

  const refreshPreview = () => setBumper((b) => b + 1);

  const startBatch = async () => {
    if (publicNotes.length === 0) return;
    setBatch({ running: true, total: publicNotes.length, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;
    for (const n of publicNotes) {
      try {
        // 用公开端点触发渲染缓存
        const url = `/og/${encodeURIComponent(n.slug)}.png?template=${tmpl}&_=${Date.now()}`;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) failed++;
        else done++;
      } catch {
        failed++;
      }
      setBatch({ running: true, total: publicNotes.length, done: done + failed, failed });
    }
    setBatch({ running: false, total: publicNotes.length, done: done + failed, failed });
    setToast({ msg: `批量生成完成:${done} 成功 / ${failed} 失败`, err: failed > 0 });
  };

  if (notes === null) return <p role="status" aria-live="polite">loading…</p>;

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>OG 图生成器</h2>
        <Tag>1200 × 630</Tag>
        <Tag tone="accent">每篇文章自动生成</Tag>
        <div class="hf-grow" />
        <Button size="sm" onClick={refreshPreview}>↻ 重新渲染</Button>
        {slug && (
          <a class="ui-btn ui-btn--sm" href={api.og.publicUrl(slug, tmpl)} download={`${slug}.png`}>
            下载 PNG
          </a>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18 }}>
        {/* main preview */}
        <section aria-label="OG 预览" style={{ minWidth: 0 }}>
          {/* 文章选择 */}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="og-slug" class="hf-tiny" style={{ color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>选择文章 (slug)</label>
            <select
              id="og-slug"
              value={slug}
              onChange={(e) => setSlug((e.target as HTMLSelectElement).value)}
              style={{ width: '100%', maxWidth: 480 }}
            >
              {(notes ?? []).map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.title} {n.visibility !== 'public' && `· ${n.visibility}`}
                </option>
              ))}
            </select>
          </div>

          {/* 主预览框 1200x630 */}
          <figure style={{ margin: 0 }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '1200 / 630',
                background: 'var(--bg-sunk)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-2)',
              }}
            >
              {slug ? (
                <iframe
                  src={previewUrl}
                  title={`OG 预览 — ${note?.title ?? slug} / ${tmpl}`}
                  style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                  请选择一篇文章。
                </div>
              )}
            </div>
            <figcaption class="hf-mono hf-tiny hf-muted" style={{ marginTop: 6 }}>
              {previewUrl || '/api/admin/og/preview?…'}
            </figcaption>
          </figure>

          {/* 社交平台预览 */}
          <h3 class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '24px 0 8px' }}>
            ▸ 社交平台预览
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SocialCard label="Twitter / X" platform="twitter" previewUrl={previewUrl} note={note} />
            <SocialCard label="微信 / WeChat" platform="wechat" previewUrl={previewUrl} note={note} />
            <SocialCard label="Telegram" platform="telegram" previewUrl={previewUrl} note={note} />
          </div>

          {/* 批量生成 */}
          <section aria-labelledby="og-batch-h" style={{ marginTop: 24, padding: 16, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h3 id="og-batch-h" style={{ margin: 0, fontSize: 14 }}>批量生成</h3>
              <Tag tone="accent">{publicNotes.length} 篇公开文章</Tag>
              <div class="hf-grow" />
              <button
                type="button"
                class="ui-btn ui-btn--sm ui-btn--primary"
                onClick={startBatch}
                disabled={!!batch?.running || publicNotes.length === 0}
                aria-describedby="og-batch-help"
              >
                {batch?.running ? '生成中…' : '为所有公开文章生成 OG'}
              </button>
            </div>
            <p id="og-batch-help" class="hf-tiny hf-muted" style={{ margin: 0 }}>
              触发服务端渲染并缓存。不可见 / 私有文章会跳过。
            </p>
            {batch && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${batch.total ? Math.round((batch.done / batch.total) * 100) : 0}%`,
                      background: batch.failed > 0 ? 'var(--warn)' : 'var(--accent)',
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <p class="hf-mono hf-tiny" style={{ margin: '4px 0 0 0', color: 'var(--ink-3)' }}>
                  {batch.done} / {batch.total} {batch.failed > 0 && `(失败 ${batch.failed})`}
                </p>
              </div>
            )}
          </section>
        </section>

        {/* sidebar — template + 变量 */}
        <aside aria-label="OG 设置">
          {/* 模板选择 */}
          <h3 class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '.05em' }}>
            ▸ 模板
          </h3>
          <ul role="radiogroup" aria-label="选择 OG 模板" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={tmpl === t.id}
                  onClick={() => setTmpl(t.id)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: '100%',
                    border: tmpl === t.id ? '2px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 8,
                    background: tmpl === t.id ? 'var(--accent-soft)' : 'var(--bg)',
                    display: 'block',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1200 / 630',
                      borderRadius: 4,
                      background: 'var(--bg-sunk)',
                      overflow: 'hidden',
                      marginBottom: 6,
                      border: '1px solid var(--line)',
                    }}
                  >
                    {slug && (
                      <iframe
                        title={`${t.name} 缩略图`}
                        src={api.og.previewUrl({ slug, template: t.id })}
                        style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div style={{ fontWeight: tmpl === t.id ? 600 : 500, fontSize: 12 }}>{t.name}</div>
                  <div class="hf-tiny hf-muted">{t.hint}</div>
                </button>
              </li>
            ))}
          </ul>

          {/* 变量编辑 */}
          <h3 class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '.05em' }}>
            ▸ 变量(覆盖文章默认)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <Field label="标题" placeholder={note?.title ?? ''} value={ovr.title ?? ''} onInput={onChangeOverride('title')} />
            <Field label="描述" placeholder="(空则用 frontmatter)" value={ovr.description ?? ''} onInput={onChangeOverride('description')} multiline />
            <Field label="作者" placeholder="(空则用站点作者)" value={ovr.author ?? ''} onInput={onChangeOverride('author')} />
            <Field label="日期" placeholder="(空则用 updated_at)" value={ovr.date ?? ''} onInput={onChangeOverride('date')} />
            <Field label="阅读时长" placeholder="例如 5 min" value={ovr.reading ?? ''} onInput={onChangeOverride('reading')} />
          </div>

          <Button size="sm" variant="primary" onClick={refreshPreview} style={{ width: '100%' }} aria-label="应用变量并刷新预览">
            应用并刷新预览
          </Button>

          <div style={{ marginTop: 14, padding: 10, background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <div class="hf-mono hf-tiny" style={{ color: 'var(--ink-3)', marginBottom: 4 }}>测试链接</div>
            <code style={{ fontFamily: 'var(--mono)', fontSize: 10, wordBreak: 'break-all', color: 'var(--accent)' }}>
              {slug ? api.og.publicUrl(slug, tmpl) : '/og/<slug>.png'}
            </code>
          </div>
        </aside>
      </div>

      {toast && (
        <div
          class={`toast${toast.err ? ' error' : ''}`}
          role={toast.err ? 'alert' : 'status'}
          aria-live={toast.err ? 'assertive' : 'polite'}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onInput,
  multiline,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onInput: (e: Event) => void;
  multiline?: boolean;
}): JSX.Element {
  const id = `og-field-${label.replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} class="hf-tiny" style={{ color: 'var(--ink-3)', display: 'block', marginBottom: 2 }}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          onInput={onInput}
          style={{ width: '100%', minHeight: 56, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical' }}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onInput={onInput}
          style={{ width: '100%', minHeight: 30, padding: '6px 8px', fontSize: 12 }}
        />
      )}
    </div>
  );
}

function SocialCard({
  label,
  platform,
  previewUrl,
  note,
}: {
  label: string;
  platform: 'twitter' | 'wechat' | 'telegram';
  previewUrl: string;
  note: NoteSummary | null;
}): JSX.Element {
  const title = note?.title ?? '(选择文章)';
  return (
    <article aria-label={`${label} 卡片预览`} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
      <header class="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>{label}</header>
      {platform === 'twitter' && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {previewUrl ? (
            <iframe src={previewUrl} title={`${label} 预览图`} style={{ width: '100%', aspectRatio: '1200 / 630', border: 0, display: 'block' }} />
          ) : (
            <div style={{ aspectRatio: '1200 / 630', background: 'var(--bg-sunk)' }} />
          )}
          <div style={{ padding: '8px 12px' }}>
            <div class="hf-mono hf-tiny hf-muted">lumiogames.dev</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, lineHeight: 1.3 }}>{title}</div>
          </div>
        </div>
      )}
      {platform === 'wechat' && (
        <div style={{ background: '#f4f5f7', borderRadius: 8, padding: 10, color: '#191919' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, color: '#191919' }}>{title}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#888' }}>lumiogames.dev</div>
            </div>
            <div style={{ width: 80, height: 80, background: 'var(--bg-sunk)', borderRadius: 4, overflow: 'hidden' }}>
              {previewUrl && (
                <iframe src={previewUrl} title={`${label} 预览图`} style={{ width: 152, height: 80, border: 0, transform: 'scale(0.527)', transformOrigin: 'top left' }} />
              )}
            </div>
          </div>
        </div>
      )}
      {platform === 'telegram' && (
        <div style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-sunk)', padding: '10px 12px', borderRadius: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>lumiogames.dev</div>
          {previewUrl && (
            <div style={{ aspectRatio: '1200 / 630', borderRadius: 4, overflow: 'hidden', background: 'var(--bg)' }}>
              <iframe src={previewUrl} title={`${label} 预览图`} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
