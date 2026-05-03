import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AdminSettings, Features } from '@opennote/core';
import { api } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

/**
 * Settings — 6 个 sub-section
 * 视觉对齐 hf-extras2 §13 HFSettings
 */

export const SETTINGS_SECTIONS = ['site', 'author', 'theme', 'seo', 'home', 'features'] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

const SECTION_META: Record<SettingsSectionId, { icon: string; label: string; hint: string }> = {
  site:     { icon: '🌐', label: '站点信息', hint: '会出现在 meta、RSS、OG、页脚' },
  author:   { icon: '👤', label: '作者资料', hint: '页脚 / about / 文章 byline' },
  theme:    { icon: '🎨', label: '外观主题', hint: 'accent 色、字体、暗模式默认' },
  seo:      { icon: '🔍', label: 'SEO', hint: 'sitemap / robots / og / twitter' },
  home:     { icon: '🏠', label: 'Home', hint: 'hero / 推荐文章数' },
  features: { icon: '🧩', label: 'Features', hint: '开关功能 — 关掉对应 UI 隐藏' },
};

type ToastTone = 'success' | 'error';
interface Toast { id: number; msg: string; tone: ToastTone }

// ----------------------------- 校验 -----------------------------

interface ErrMap { [field: string]: string }

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function nonEmpty(v: string | undefined): boolean { return !!(v && v.trim().length > 0); }

function validateSection(section: SettingsSectionId, draft: AdminSettings): ErrMap {
  const errs: ErrMap = {};
  if (section === 'site') {
    const s = draft.site ?? { title: '', url: '' };
    if (!nonEmpty(s.title)) errs['site.title'] = '站点名必填';
    if (!nonEmpty(s.url)) errs['site.url'] = '站点 URL 必填';
    else if (!URL_RE.test(s.url)) errs['site.url'] = '必须是 http(s):// 开头的合法 URL';
  }
  if (section === 'author') {
    const a = draft.author ?? { name: '' };
    if (!nonEmpty(a.name)) errs['author.name'] = '作者名必填';
    if (a.email && !EMAIL_RE.test(a.email)) errs['author.email'] = '邮箱格式不对';
    (a.social ?? []).forEach((s, i) => {
      if (!s.platform) errs[`author.social.${i}.platform`] = 'platform 必填';
      if (!s.url) errs[`author.social.${i}.url`] = 'url 必填';
      else if (!URL_RE.test(s.url)) errs[`author.social.${i}.url`] = '不是合法 URL';
    });
  }
  if (section === 'theme') {
    const t = draft.theme ?? {};
    if (t.accent && !HEX_RE.test(t.accent)) errs['theme.accent'] = 'accent 必须是 hex (#RRGGBB)';
  }
  if (section === 'home') {
    const h = draft.home ?? {};
    if (h.show_recent_posts !== undefined && h.show_recent_posts !== null) {
      if (!Number.isInteger(h.show_recent_posts) || h.show_recent_posts < 0) {
        errs['home.show_recent_posts'] = '必须是非负整数';
      }
    }
  }
  // seo / features: 无强制校验
  return errs;
}

// ----------------------------- patch 提取 -----------------------------

/** 取出指定 section 的当前 draft 值,组装成 PATCH payload */
function pickPatch(section: SettingsSectionId, draft: AdminSettings): Partial<AdminSettings> {
  const patch: Partial<AdminSettings> = {};
  if (section === 'site') patch.site = draft.site;
  if (section === 'author') patch.author = draft.author;
  if (section === 'theme') patch.theme = draft.theme;
  if (section === 'seo') patch.seo = draft.seo;
  if (section === 'home') patch.home = draft.home;
  if (section === 'features') patch.features = draft.features;
  return patch;
}

// ----------------------------- 顶层组件 -----------------------------

export function SettingsPage({ section }: { section: SettingsSectionId }) {
  const [original, setOriginal] = useState<AdminSettings | null>(null);
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<ErrMap>({});
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    api.settings.get()
      .then((s) => { setOriginal(s); setDraft(s); })
      .catch((e) => setLoadErr((e as Error).message));
  }, []);

  const dirty = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(pickPatch(section, draft)) !== JSON.stringify(pickPatch(section, original));
  }, [original, draft, section]);

  const pushToast = (msg: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const update = (next: AdminSettings) => {
    setDraft(next);
    setSaveErr(null);
    setErrs(validateSection(section, next));
  };

  const reset = () => {
    if (!original) return;
    setDraft(original);
    setErrs({});
    setSaveErr(null);
  };

  const save = async () => {
    if (!draft) return;
    const v = validateSection(section, draft);
    setErrs(v);
    if (Object.keys(v).length > 0) {
      setSaveErr('请先修复表单中的错误');
      return;
    }
    setBusy(true);
    setSaveErr(null);
    try {
      const patch = pickPatch(section, draft);
      await api.settings.patch(patch);
      // 重新拉取 — 服务端可能写回归一化值
      const fresh = await api.settings.get();
      setOriginal(fresh);
      setDraft(fresh);
      pushToast('已保存', 'success');
    } catch (e) {
      const err = e as Error & { field?: string };
      setSaveErr(err.message);
      if (err.field) {
        setErrs((cur) => ({ ...cur, [err.field as string]: err.message }));
      }
      pushToast('保存失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loadErr) return <p role="alert" class="error">载入失败:{loadErr}</p>;
  if (!draft) return <p role="status" aria-live="polite">loading…</p>;

  const meta = SECTION_META[section];

  return (
    <div class="ws-e ws-e--settings">
      <WsEStyles />
      <div class="ws-e__settings-grid">
        {/* sub-nav */}
        <aside class="ws-e__settings-nav" aria-label="设置子导航">
          <div class="ws-e__settings-nav-h">▸ 设置</div>
          <ul>
            {SETTINGS_SECTIONS.map((id) => {
              const m = SECTION_META[id];
              const active = id === section;
              return (
                <li key={id}>
                  <a
                    href={`#/settings/${id}`}
                    class={`ws-e__settings-nav-item ${active ? 'is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span aria-hidden="true">{m.icon}</span>
                    <span>{m.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* main */}
        <div class="ws-e__settings-main">
          <h1 class="ws-e__h1">
            <span aria-hidden="true">{meta.icon} </span>{meta.label}
          </h1>
          <p class="ws-e__lead">{meta.hint}</p>

          {section === 'site' && <SiteForm draft={draft} update={update} errs={errs} />}
          {section === 'author' && <AuthorForm draft={draft} update={update} errs={errs} />}
          {section === 'theme' && <ThemeForm draft={draft} update={update} errs={errs} />}
          {section === 'seo' && <SeoForm draft={draft} update={update} errs={errs} />}
          {section === 'home' && <HomeForm draft={draft} update={update} errs={errs} />}
          {section === 'features' && <FeaturesForm draft={draft} update={update} />}

          {/* save bar */}
          <div class="ws-e__save-bar" role="region" aria-label="保存操作">
            {dirty ? (
              <span class="hf-mono hf-tiny ws-e__dirty">● 有未保存的更改</span>
            ) : (
              <span class="hf-mono hf-tiny hf-faint">● 无更改</span>
            )}
            <div class="hf-grow" />
            {saveErr && <span class="error" role="alert">{saveErr}</span>}
            <button type="button" disabled={!dirty || busy} onClick={reset}>放弃</button>
            <button type="button" class="primary" disabled={!dirty || busy} onClick={save}>
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* toasts */}
      <div class="ws-e__toasts" role="region" aria-live="polite" aria-label="保存状态">
        {toasts.map((t) => (
          <div key={t.id} class={`ws-e__toast ws-e__toast--${t.tone}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------- 表单字段组件 -----------------------------

interface FormProps {
  draft: AdminSettings;
  update: (next: AdminSettings) => void;
  errs: ErrMap;
}

function FieldErr({ field, errs }: { field: string; errs: ErrMap }) {
  const msg = errs[field];
  if (!msg) return null;
  return <p class="error ws-e__field-err" role="alert" id={`${field}-err`}>{msg}</p>;
}

/**
 * 合并 base + patch,**忽略 patch 里值为 undefined 的 key**
 * (从结果里删除该 key,而不是赋值 undefined —— 与 exactOptionalPropertyTypes 兼容)
 */
function mergeSkipUndef<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete out[k];
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function SiteForm({ draft, update, errs }: FormProps) {
  const s = draft.site ?? { title: '', url: '' };
  const set = (patch: Record<string, unknown>) => update({ ...draft, site: mergeSkipUndef(s, patch) });
  return (
    <section class="ws-e__panel">
      <header class="ws-e__panel-head"><h2>▸ 基础</h2></header>
      <div class="ws-e__form ws-e__form--col">
        <div class="ws-e__field">
          <label htmlFor="s-title">站点名称</label>
          <input
            id="s-title" type="text" value={s.title}
            aria-invalid={errs['site.title'] ? 'true' : 'false'}
            aria-describedby={errs['site.title'] ? 'site.title-err' : undefined}
            onInput={(e) => set({ title: (e.target as HTMLInputElement).value })}
          />
          <FieldErr field="site.title" errs={errs} />
        </div>
        <div class="ws-e__field">
          <label htmlFor="s-url">站点 URL</label>
          <input
            id="s-url" type="url" value={s.url}
            aria-invalid={errs['site.url'] ? 'true' : 'false'}
            aria-describedby={errs['site.url'] ? 'site.url-err' : undefined}
            onInput={(e) => set({ url: (e.target as HTMLInputElement).value })}
          />
          <FieldErr field="site.url" errs={errs} />
        </div>
        <div class="ws-e__field">
          <label htmlFor="s-desc">副标题 / 描述</label>
          <input
            id="s-desc" type="text" value={s.description ?? ''}
            onInput={(e) => set({ description: (e.target as HTMLInputElement).value || undefined })}
          />
        </div>
        <div class="ws-e__form-grid2">
          <div class="ws-e__field">
            <label htmlFor="s-lang">默认语言</label>
            <input
              id="s-lang" type="text" value={s.language ?? ''}
              placeholder="zh-CN"
              onInput={(e) => set({ language: (e.target as HTMLInputElement).value || undefined })}
            />
          </div>
          <div class="ws-e__field">
            <label htmlFor="s-tz">时区</label>
            <input
              id="s-tz" type="text" value={s.timezone ?? ''}
              placeholder="Asia/Shanghai"
              onInput={(e) => set({ timezone: (e.target as HTMLInputElement).value || undefined })}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthorForm({ draft, update, errs }: FormProps) {
  const a = draft.author ?? { name: '' };
  const set = (patch: Record<string, unknown>) => update({ ...draft, author: mergeSkipUndef(a, patch) });
  const social = a.social ?? [];
  const setSocial = (next: typeof social) => set({ social: next });
  return (
    <>
      <section class="ws-e__panel">
        <header class="ws-e__panel-head"><h2>▸ 资料</h2></header>
        <div class="ws-e__form ws-e__form--col">
          <div class="ws-e__field">
            <label htmlFor="a-name">昵称</label>
            <input
              id="a-name" type="text" value={a.name}
              aria-invalid={errs['author.name'] ? 'true' : 'false'}
              onInput={(e) => set({ name: (e.target as HTMLInputElement).value })}
            />
            <FieldErr field="author.name" errs={errs} />
          </div>
          <div class="ws-e__field">
            <label htmlFor="a-email">邮箱</label>
            <input
              id="a-email" type="email" value={a.email ?? ''}
              aria-invalid={errs['author.email'] ? 'true' : 'false'}
              onInput={(e) => set({ email: (e.target as HTMLInputElement).value || undefined })}
            />
            <FieldErr field="author.email" errs={errs} />
          </div>
          <div class="ws-e__field">
            <label htmlFor="a-bio">一句话介绍</label>
            <textarea
              id="a-bio" rows={3} value={a.bio_md ?? a.bio ?? ''}
              onInput={(e) => set({ bio_md: (e.target as HTMLTextAreaElement).value || undefined })}
            />
          </div>
          <div class="ws-e__field">
            <label htmlFor="a-avatar">头像 URL</label>
            <input
              id="a-avatar" type="text" value={a.avatar ?? ''}
              onInput={(e) => set({ avatar: (e.target as HTMLInputElement).value || undefined })}
            />
          </div>
        </div>
      </section>

      <section class="ws-e__panel">
        <header class="ws-e__panel-head"><h2>▸ 社交链接(页脚)</h2></header>
        <div class="ws-e__form ws-e__form--col">
          {social.length === 0 && <p class="ws-e__empty">还没有社交链接。</p>}
          {social.map((s, i) => (
            <div key={i} class="ws-e__social-row">
              <div class="ws-e__field">
                <label htmlFor={`sp-${i}`}>平台</label>
                <input
                  id={`sp-${i}`} type="text" value={s.platform ?? ''} placeholder="github / twitter"
                  aria-invalid={errs[`author.social.${i}.platform`] ? 'true' : 'false'}
                  onInput={(e) => {
                    const next = [...social];
                    next[i] = { ...s, platform: (e.target as HTMLInputElement).value };
                    setSocial(next);
                  }}
                />
                <FieldErr field={`author.social.${i}.platform`} errs={errs} />
              </div>
              <div class="ws-e__field">
                <label htmlFor={`su-${i}`}>URL</label>
                <input
                  id={`su-${i}`} type="url" value={s.url ?? ''} placeholder="https://..."
                  aria-invalid={errs[`author.social.${i}.url`] ? 'true' : 'false'}
                  onInput={(e) => {
                    const next = [...social];
                    next[i] = { ...s, url: (e.target as HTMLInputElement).value };
                    setSocial(next);
                  }}
                />
                <FieldErr field={`author.social.${i}.url`} errs={errs} />
              </div>
              <button
                type="button"
                class="ws-e__row-btn ws-e__row-btn--danger"
                aria-label={`删除社交链接 ${s.platform ?? ''}`}
                onClick={() => setSocial(social.filter((_, j) => j !== i))}
              >×</button>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={() => setSocial([...social, { platform: '', url: '' }])}
            >+ 添加</button>
          </div>
        </div>
      </section>
    </>
  );
}

function ThemeForm({ draft, update, errs }: FormProps) {
  const t = draft.theme ?? {};
  const set = (patch: Record<string, unknown>) => update({ ...draft, theme: mergeSkipUndef(t, patch) });
  return (
    <section class="ws-e__panel">
      <header class="ws-e__panel-head"><h2>▸ 外观</h2></header>
      <div class="ws-e__form ws-e__form--col">
        <div class="ws-e__field">
          <label htmlFor="t-default">默认主题模式</label>
          <select
            id="t-default" value={t.default ?? 'auto'}
            onChange={(e) => set({ default: (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto' })}
          >
            <option value="auto">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
        <div class="ws-e__field">
          <label htmlFor="t-accent">Accent 颜色(hex)</label>
          <div class="ws-e__inline-group">
            <input
              id="t-accent" type="text" placeholder="#0066ff" value={t.accent ?? ''}
              aria-invalid={errs['theme.accent'] ? 'true' : 'false'}
              onInput={(e) => set({ accent: (e.target as HTMLInputElement).value || undefined })}
            />
            <input
              type="color"
              aria-label="选择颜色"
              value={HEX_RE.test(t.accent ?? '') ? (t.accent as string) : '#0066ff'}
              onInput={(e) => set({ accent: (e.target as HTMLInputElement).value })}
              style={{ width: 44, padding: 4 }}
            />
            {t.accent && HEX_RE.test(t.accent) && (
              <span aria-hidden="true" class="ws-e__color-swatch" style={{ background: t.accent }} />
            )}
          </div>
          <FieldErr field="theme.accent" errs={errs} />
        </div>
        <div class="ws-e__form-grid2">
          <div class="ws-e__field">
            <label htmlFor="t-fs">衬线字体</label>
            <select
              id="t-fs"
              value={t.font_serif ?? ''}
              onChange={(e) => set({ font_serif: (e.target as HTMLSelectElement).value || undefined })}
            >
              <option value="">默认</option>
              <option value="Noto Serif SC">Noto Serif SC</option>
              <option value="Source Serif 4">Source Serif 4</option>
              <option value="Charter">Charter</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
          <div class="ws-e__field">
            <label htmlFor="t-fm">等宽字体</label>
            <select
              id="t-fm"
              value={t.font_mono ?? ''}
              onChange={(e) => set({ font_mono: (e.target as HTMLSelectElement).value || undefined })}
            >
              <option value="">默认</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Fira Code">Fira Code</option>
              <option value="IBM Plex Mono">IBM Plex Mono</option>
              <option value="Cascadia Code">Cascadia Code</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

function SeoForm({ draft, update }: FormProps) {
  const s = draft.seo ?? {};
  const set = (patch: Record<string, unknown>) => update({ ...draft, seo: mergeSkipUndef(s, patch) });
  return (
    <section class="ws-e__panel">
      <header class="ws-e__panel-head"><h2>▸ SEO</h2></header>
      <div class="ws-e__form ws-e__form--col">
        <div class="ws-e__form-grid2">
          <div class="ws-e__field">
            <label htmlFor="seo-og">默认 OG 模板</label>
            <select
              id="seo-og" value={s.default_og_template ?? 'minimal'}
              onChange={(e) => set({ default_og_template: (e.target as HTMLSelectElement).value })}
            >
              <option value="minimal">minimal</option>
              <option value="newspaper">newspaper</option>
              <option value="terminal">terminal</option>
              <option value="magazine">magazine</option>
            </select>
          </div>
          <div class="ws-e__field">
            <label htmlFor="seo-tw">Twitter card</label>
            <select
              id="seo-tw" value={s.twitter_card ?? 'summary_large_image'}
              onChange={(e) => set({ twitter_card: (e.target as HTMLSelectElement).value })}
            >
              <option value="summary">summary</option>
              <option value="summary_large_image">summary_large_image</option>
            </select>
          </div>
        </div>
        <div class="ws-e__field">
          <label htmlFor="seo-robots">Robots</label>
          <input
            id="seo-robots" type="text" value={s.robots ?? ''}
            placeholder="index, follow"
            onInput={(e) => set({ robots: (e.target as HTMLInputElement).value || undefined })}
          />
        </div>
        <div class="ws-e__field">
          <label class="ws-e__check-label">
            <input
              type="checkbox" checked={s.sitemap ?? true}
              onChange={(e) => set({ sitemap: (e.target as HTMLInputElement).checked })}
            />
            <span>生成 sitemap.xml</span>
          </label>
        </div>
      </div>
    </section>
  );
}

function HomeForm({ draft, update, errs }: FormProps) {
  const h = draft.home ?? {};
  const set = (patch: Record<string, unknown>) => update({ ...draft, home: mergeSkipUndef(h, patch) });
  return (
    <section class="ws-e__panel">
      <header class="ws-e__panel-head"><h2>▸ Home</h2></header>
      <div class="ws-e__form ws-e__form--col">
        <div class="ws-e__field">
          <label htmlFor="h-title">Hero 标题(Markdown)</label>
          <input
            id="h-title" type="text" value={h.hero_title_md ?? ''}
            onInput={(e) => set({ hero_title_md: (e.target as HTMLInputElement).value || undefined })}
          />
        </div>
        <div class="ws-e__field">
          <label htmlFor="h-intro">Hero 介绍(Markdown)</label>
          <textarea
            id="h-intro" rows={4} value={h.hero_intro_md ?? ''}
            onInput={(e) => set({ hero_intro_md: (e.target as HTMLTextAreaElement).value || undefined })}
          />
        </div>
        <div class="ws-e__form-grid2">
          <div class="ws-e__field">
            <label htmlFor="h-cta1">CTA 主</label>
            <input
              id="h-cta1" type="text" value={h.hero_cta_primary ?? ''}
              onInput={(e) => set({ hero_cta_primary: (e.target as HTMLInputElement).value || undefined })}
            />
          </div>
          <div class="ws-e__field">
            <label htmlFor="h-cta2">CTA 次</label>
            <input
              id="h-cta2" type="text" value={h.hero_cta_secondary ?? ''}
              onInput={(e) => set({ hero_cta_secondary: (e.target as HTMLInputElement).value || undefined })}
            />
          </div>
        </div>
        <div class="ws-e__field ws-e__field--narrow">
          <label htmlFor="h-recent">最近文章数</label>
          <input
            id="h-recent" type="number" min={0} max={50}
            value={h.show_recent_posts ?? 5}
            aria-invalid={errs['home.show_recent_posts'] ? 'true' : 'false'}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              set({ show_recent_posts: Number.isFinite(v) ? v : undefined });
            }}
          />
          <FieldErr field="home.show_recent_posts" errs={errs} />
        </div>
        <div class="ws-e__field">
          <label class="ws-e__check-label">
            <input
              type="checkbox" checked={h.show_categories ?? false}
              onChange={(e) => set({ show_categories: (e.target as HTMLInputElement).checked })}
            />
            <span>显示分类块</span>
          </label>
        </div>
      </div>
    </section>
  );
}

function FeaturesForm({ draft, update }: { draft: AdminSettings; update: (n: AdminSettings) => void }) {
  const f = draft.features;
  const setGroup = <K extends keyof Features>(group: K, patch: Partial<Features[K]>) => {
    const groupValue = f[group];
    update({
      ...draft,
      features: {
        ...f,
        [group]: { ...(groupValue as object), ...patch },
      } as Features,
    });
  };

  const groups: { id: keyof Features; label: string; items: { key: string; label: string }[] }[] = [
    {
      id: 'content',
      label: '内容',
      items: [
        { key: 'comments', label: '评论' },
        { key: 'newsletter', label: 'Newsletter' },
        { key: 'rss', label: 'RSS / Atom / JSON Feed' },
        { key: 'graph', label: '知识图谱' },
        { key: 'search', label: '全文搜索' },
        { key: 'short_links', label: '短链(/n/xxxxx)' },
      ],
    },
    {
      id: 'admin',
      label: '后台',
      items: [
        { key: 'analytics', label: 'Analytics 仪表盘' },
        { key: 'media_library', label: '媒体库' },
        { key: 'api_tokens', label: 'API tokens' },
        { key: 'webhooks', label: 'Webhooks' },
        { key: 'og_generator', label: 'OG 图生成' },
      ],
    },
    {
      id: 'agent',
      label: 'Agent',
      items: [
        { key: 'cli_enabled', label: 'CLI 入口' },
        { key: 'mcp_enabled', label: 'MCP server' },
      ],
    },
  ];

  return (
    <>
      {groups.map((g) => (
        <section key={g.id} class="ws-e__panel">
          <header class="ws-e__panel-head"><h2>▸ {g.label}</h2></header>
          <div class="ws-e__feature-grid">
            {g.items.map((it) => {
              const groupValue = f[g.id] as Record<string, unknown>;
              const checked = !!groupValue[it.key];
              return (
                <label key={it.key} class="ws-e__feature-row">
                  <span class="ws-e__feature-name">{it.label}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={checked ? 'true' : 'false'}
                    checked={checked}
                    onChange={(e) => {
                      const next = (e.target as HTMLInputElement).checked;
                      setGroup(g.id, { [it.key]: next } as Partial<Features[typeof g.id]>);
                    }}
                  />
                </label>
              );
            })}
          </div>
        </section>
      ))}

      <section class="ws-e__panel">
        <header class="ws-e__panel-head"><h2>▸ Agent · MCP tools</h2></header>
        <p class="ws-e__sm hf-muted">逗号分隔。空 = 关闭所有 MCP 工具。</p>
        <div class="ws-e__field">
          <label htmlFor="mcp-tools">MCP tools</label>
          <input
            id="mcp-tools" type="text"
            value={f.agent.mcp_tools.join(', ')}
            onInput={(e) => {
              const list = (e.target as HTMLInputElement).value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              setGroup('agent', { mcp_tools: list });
            }}
          />
        </div>
      </section>
    </>
  );
}
