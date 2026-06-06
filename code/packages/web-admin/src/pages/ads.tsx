import type { HfAdSettings } from '@opennote/core';
import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon, Tag, Toggle } from '@opennote/ui';
import { api } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

type AdSlot = 'home' | 'article' | 'column';
type AdTone = NonNullable<HfAdSettings['tone']>;

const SLOTS: Record<AdSlot, { label: string; short: string; size: string; hint: string }> = {
  home: {
    label: '首页 · 信息流横幅',
    short: '首页',
    size: '728 × 90',
    hint: '同一位置多条开启广告会在首页自动轮播',
  },
  article: {
    label: '文章页 · 侧栏方图',
    short: '文章页',
    size: '300 × 250',
    hint: '用于文章详情右侧推广位',
  },
  column: {
    label: '专栏页 · 顶部 Banner',
    short: '专栏页',
    size: '970 × 120',
    hint: '用于专栏列表或专栏详情顶部',
  },
};

const TONES: Record<AdTone, { label: string; cls: string; sw: string }> = {
  blue: { label: 'Blue', cls: 't-blue', sw: 'linear-gradient(150deg,#DCE4FF,#B9C6FF)' },
  mint: { label: 'Mint', cls: 't-mint', sw: 'linear-gradient(150deg,#D6F7EE,#9BE9D5)' },
  amber: { label: 'Amber', cls: 't-amber', sw: 'linear-gradient(150deg,#FFE9CC,#FFCF9B)' },
  violet: { label: 'Violet', cls: 't-violet', sw: 'linear-gradient(150deg,#E7E0FF,#C7B6FF)' },
  sky: { label: 'Sky', cls: 't-sky', sw: 'linear-gradient(150deg,#DCF0FF,#A9D8FF)' },
  rose: { label: 'Rose', cls: 't-rose', sw: 'linear-gradient(150deg,#FFE0EC,#FFB8D0)' },
};

const TONE_KEYS = Object.keys(TONES) as AdTone[];

const DEFAULT_ADS: HfAdSettings[] = [
  {
    id: 'home-unity6',
    name: 'Unity 6 性能套件',
    enabled: true,
    variant: 'native',
    slot: 'home',
    tone: 'blue',
    title: 'Unity 6 性能套件',
    body: '一键剖析 Draw Call 与 Overdraw,渲染优化提速 40%',
    cta_label: '立即试用',
    cta_href: 'https://example.com/unity6',
    impressions: 18420,
    clicks: 728,
  },
  {
    id: 'home-renderx',
    name: '云渲染农场 RenderX',
    enabled: true,
    variant: 'native',
    slot: 'home',
    tone: 'violet',
    title: '云渲染农场 RenderX',
    body: '按帧计费的分布式渲染,出图速度快 10 倍',
    cta_label: '领取额度',
    cta_href: 'https://renderx.dev',
    impressions: 12600,
    clicks: 512,
  },
  {
    id: 'home-gameconf',
    name: 'GameConf 2026 大会',
    enabled: true,
    variant: 'native',
    slot: 'home',
    tone: 'mint',
    title: 'GameConf 2026',
    body: '年度游戏技术大会,早鸟票 6 折,限时开售',
    cta_label: '购票',
    cta_href: 'https://gameconf.io',
    impressions: 9800,
    clicks: 430,
  },
  {
    id: 'article-shader',
    name: '侧边栏方图',
    enabled: true,
    variant: 'native',
    slot: 'article',
    tone: 'amber',
    title: 'Shader 训练营',
    body: '4 周从入门到实战',
    cta_label: '报名',
    cta_href: 'https://partner.io/x',
    impressions: 9260,
    clicks: 214,
  },
  {
    id: 'article-hiring',
    name: '文末推广位',
    enabled: false,
    variant: 'native',
    slot: 'article',
    tone: 'rose',
    title: '招聘:图形工程师',
    body: '远程可选,期权丰厚',
    cta_label: '投递',
    impressions: 5140,
    clicks: 116,
  },
  {
    id: 'column-agent',
    name: '专栏页 Banner',
    enabled: true,
    variant: 'native',
    slot: 'column',
    tone: 'sky',
    title: 'AI Agent 开发平台',
    body: '托管你的多智能体工作流',
    cta_label: '免费开始',
    cta_href: 'https://sponsor.dev/ad',
    impressions: 7300,
    clicks: 181,
  },
];

export const ADS_PAGE_STYLE = `
.ads-page { min-width: 0; }
.ads-page__hero {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.ads-page__hero-main { flex: 1; min-width: 260px; }
.ads-page__hero-main h1 { margin: 0; font-size: 24px; line-height: 1.15; letter-spacing: 0; }
.ads-page__hero-main p { margin: 7px 0 0; color: var(--ink-3); font-size: 13px; line-height: 1.6; max-width: 700px; }
.ads-page__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ads-page__stat {
  min-width: 94px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--shadow-1);
}
.ads-page__stat strong { display: block; font-size: 18px; line-height: 1; }
.ads-page__stat span {
  display: block;
  margin-top: 4px;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
}
.ads-page__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.ads-page__slot { margin-bottom: 26px; }
.ads-page__slot-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.ads-page__slot-name {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}
.ads-page__slot-name::before {
  content: "";
  width: 3.5px;
  height: 15px;
  border-radius: 2px;
  background: var(--primary);
}
.ads-page__slot-meta { color: var(--ink-4); font-size: 12.5px; }
.ads-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.ads-page__card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
  box-shadow: var(--shadow-card);
  transition: transform .16s, box-shadow .16s;
}
.ads-page__card:hover { transform: translateY(-3px); box-shadow: var(--shadow-pop); }
.ads-page__card.is-off { opacity: .62; }
.ads-page__thumb {
  height: 96px;
  display: grid;
  place-items: center;
  position: relative;
}
.ads-page__thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
  background-size: 22px 22px;
  opacity: .55;
}
.ads-page__thumb svg { position: relative; color: rgba(255,255,255,.95); }
.ads-page__thumb.t-blue { background: linear-gradient(150deg, #DCE4FF, #B9C6FF); }
.ads-page__thumb.t-mint { background: linear-gradient(150deg, #D6F7EE, #9BE9D5); }
.ads-page__thumb.t-amber { background: linear-gradient(150deg, #FFE9CC, #FFCF9B); }
.ads-page__thumb.t-violet { background: linear-gradient(150deg, #E7E0FF, #C7B6FF); }
.ads-page__thumb.t-sky { background: linear-gradient(150deg, #DCF0FF, #A9D8FF); }
.ads-page__thumb.t-rose { background: linear-gradient(150deg, #FFE0EC, #FFB8D0); }
.ads-page__card-body { padding: 16px 18px 8px; flex: 1; }
.ads-page__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ads-page__name { font-size: 15.5px; font-weight: 800; color: var(--ink); }
.ads-page__copy { margin-top: 6px; color: var(--ink-3); font-size: 12.5px; line-height: 1.5; }
.ads-page__url {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 12px;
}
.ads-page__metrics { display: flex; gap: 22px; margin-top: 14px; }
.ads-page__metric { display: flex; flex-direction: column; }
.ads-page__metric b { font-family: var(--mono); font-size: 16px; color: var(--ink); }
.ads-page__metric span { margin-top: 1px; color: var(--ink-4); font-size: 11px; }
.ads-page__card-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
}
.ads-page__empty {
  grid-column: 1 / -1;
  padding: 24px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  color: var(--ink-4);
  text-align: center;
  background: var(--bg-soft);
}
.ads-page__scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(30,36,64,.36);
}
.ads-page__drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  width: min(460px, 100vw);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid var(--line);
  box-shadow: var(--shadow-3);
}
.ads-page__drawer-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-soft);
}
.ads-page__drawer-head h2 { margin: 0; font-size: 17px; }
.ads-page__drawer-head p { margin: 4px 0 0; color: var(--ink-4); font-size: 12.5px; }
.ads-page__drawer-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
}
.ads-page__drawer-foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}
.ads-page__preview {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 84px;
  padding: 16px 18px;
  border-radius: 14px;
  overflow: hidden;
}
.ads-page__preview-label {
  display: inline-block;
  margin-bottom: 6px;
  padding: 1px 7px;
  border-radius: 6px;
  color: rgba(30,42,58,.55);
  background: rgba(255,255,255,.6);
  font-size: 10px;
  font-weight: 700;
}
.ads-page__preview-title { font-size: 16px; font-weight: 800; color: #243056; }
.ads-page__preview-desc { margin-top: 3px; color: #46506e; font-size: 12.5px; }
.ads-page__preview-cta {
  flex-shrink: 0;
  padding: 9px 16px;
  border-radius: 10px;
  background: rgba(40,54,110,.85);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.ads-page__seg,
.ads-page__tones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ads-page__seg button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink-3);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
}
.ads-page__seg button.is-active {
  border-color: #C5CFF6;
  background: #ECEFFF;
  color: var(--primary-d);
  font-weight: 700;
}
.ads-page__tone {
  width: 28px;
  height: 28px;
  border: 2px solid #fff;
  border-radius: 9px;
  box-shadow: 0 0 0 1px var(--line);
  cursor: pointer;
}
.ads-page__tone.is-active { box-shadow: 0 0 0 2px var(--primary); }
.ads-page__toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 210;
}
@media (max-width: 900px) {
  .ads-page__grid { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .ads-page__hero { flex-direction: column; }
  .ads-page__stats, .ads-page__stat { width: 100%; }
  .ads-page__metrics { gap: 14px; flex-wrap: wrap; }
  .ads-page__preview { align-items: flex-start; flex-direction: column; }
}
`;

let adsStyleInjected = false;
function AdsStyles(): null {
  if (typeof document !== 'undefined' && !adsStyleInjected) {
    adsStyleInjected = true;
    const tag = document.createElement('style');
    tag.setAttribute('data-ads-page', '1');
    tag.textContent = ADS_PAGE_STYLE;
    document.head.appendChild(tag);
  }
  return null;
}

export function AdsPage(): JSX.Element {
  const [loadedHome, setLoadedHome] = useState<NonNullable<Awaited<ReturnType<typeof api.settings.get>>['home']> | null>(null);
  const [ads, setAds] = useState<HfAdSettings[] | null>(null);
  const [editing, setEditing] = useState<HfAdSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get()
      .then((settings) => {
        const home = settings.home ?? {};
        setLoadedHome(home);
        setAds(readAds(home));
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const summary = useMemo(() => {
    const list = ads ?? [];
    const active = list.filter((ad) => ad.enabled !== false).length;
    const homeActive = list.filter((ad) => (ad.slot ?? 'home') === 'home' && ad.enabled !== false).length;
    const clicks = list.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0);
    return { total: list.length, active, homeActive, clicks };
  }, [ads]);

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const updateAd = (id: string, patch: Partial<HfAdSettings>) => {
    setAds((cur) => (cur ?? []).map((ad) => (ad.id === id ? normalizeAd({ ...ad, ...patch }) : ad)));
  };

  const removeAd = (id: string) => {
    setAds((cur) => (cur ?? []).filter((ad) => ad.id !== id));
    pushToast('广告位已删除');
  };

  const openNew = (slot: AdSlot = 'home') => {
    setEditing(normalizeAd({
      id: makeId(),
      name: '',
      enabled: true,
      variant: 'native',
      slot,
      tone: 'blue',
      title: '',
      body: '',
      cta_label: '了解更多',
      cta_href: '',
      impressions: 0,
      clicks: 0,
    }));
  };

  const saveEditing = () => {
    if (!editing) return;
    const clean = normalizeAd(editing);
    if (!clean.name?.trim() && !clean.title.trim()) {
      setError('请填写后台名称或广告标题');
      return;
    }
    const nextAd = cleanAdForStorage({
      ...clean,
      name: clean.name?.trim() || clean.title.trim(),
      title: clean.title.trim() || clean.name?.trim() || '未命名广告',
    });
    setAds((cur) => {
      const list = cur ?? [];
      return list.some((ad) => ad.id === nextAd.id)
        ? list.map((ad) => (ad.id === nextAd.id ? nextAd : ad))
        : [...list, nextAd];
    });
    setEditing(null);
    setError(null);
    pushToast('广告已更新,记得保存配置');
  };

  const saveConfig = async () => {
    if (!loadedHome || !ads) return;
    setSaving(true);
    setError(null);
    try {
      const cleaned = ads.map((ad) => cleanAdForStorage(ad));
      await api.settings.patch({ home: { ...loadedHome, ads: cleaned } });
      const fresh = await api.settings.get();
      const home = fresh.home ?? {};
      setLoadedHome(home);
      setAds(readAds(home));
      pushToast('广告配置已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (error && !ads) return <p role="alert" class="error">载入失败:{error}</p>;
  if (!ads) return <p role="status" aria-live="polite">loading…</p>;

  return (
    <div class="ws-e ads-page">
      <WsEStyles />
      <AdsStyles />
      <section class="ads-page__hero">
        <div class="ads-page__hero-main">
          <h1>广告位</h1>
          <p>按投放位置管理推广内容。首页位置允许多条开启广告,前台会自动轮播同一数据源中的全部首页广告。</p>
        </div>
        <div class="ads-page__stats" aria-label="广告统计">
          <Stat value={summary.total} label="total" />
          <Stat value={summary.active} label="active" />
          <Stat value={summary.homeActive} label="home slides" />
          <Stat value={fmt(summary.clicks)} label="clicks / week" />
        </div>
      </section>

      <div class="ads-page__toolbar">
        <button type="button" class="ui-btn ui-btn--primary" onClick={() => openNew('home')}>
          <HfIcon name="plus" size={13} /> 新建广告
        </button>
        <button type="button" class="ui-btn" disabled={saving} onClick={() => void saveConfig()}>
          <HfIcon name="sync" size={13} /> {saving ? '保存中…' : '保存配置'}
        </button>
        <a class="ui-btn ui-btn--ghost" href="/" target="_blank" rel="noreferrer">
          <HfIcon name="eye" size={13} /> 查看首页
        </a>
        {error && <span role="alert" class="error">{error}</span>}
      </div>

      {(Object.keys(SLOTS) as AdSlot[]).map((slot) => {
        const slotAds = ads.filter((ad) => (ad.slot ?? 'home') === slot);
        const active = slotAds.filter((ad) => ad.enabled !== false).length;
        return (
          <section class="ads-page__slot" key={slot}>
            <div class="ads-page__slot-head">
              <span class="ads-page__slot-name">{SLOTS[slot].label}</span>
              <span class="ads-page__slot-meta">
                {SLOTS[slot].size} · {slotAds.length} 个广告{slot === 'home' && active > 1 ? ' · 首页轮播' : ''}
              </span>
              <span class="hf-grow" />
              <button type="button" class="ui-btn ui-btn--sm" onClick={() => openNew(slot)}>
                <HfIcon name="plus" size={12} /> 添加
              </button>
            </div>
            <div class="ads-page__grid">
              {slotAds.length === 0 ? (
                <div class="ads-page__empty">{SLOTS[slot].hint}</div>
              ) : slotAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onToggle={() => updateAd(ad.id!, { enabled: !(ad.enabled !== false) })}
                  onEdit={() => setEditing({ ...ad })}
                  onDelete={() => removeAd(ad.id!)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {editing && (
        <>
          <div class="ads-page__scrim" onClick={() => setEditing(null)} />
          <AdDrawer
            ad={editing}
            onChange={(next) => setEditing(normalizeAd(next))}
            onCancel={() => setEditing(null)}
            onSave={saveEditing}
          />
        </>
      )}

      {toast && (
        <div class="ui-toast ui-toast--success ads-page__toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }): JSX.Element {
  return (
    <div class="ads-page__stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function AdCard({
  ad,
  onToggle,
  onEdit,
  onDelete,
}: {
  ad: HfAdSettings;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  const on = ad.enabled !== false;
  const tone = ad.tone ?? 'blue';
  const impressions = ad.impressions ?? 0;
  const clicks = ad.clicks ?? 0;
  const ctr = impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : '0.0%';
  return (
    <article class={`ads-page__card ${on ? '' : 'is-off'}`}>
      <div class={`ads-page__thumb ${TONES[tone].cls}`}>
        <HfIcon name="image" size={26} strokeWidth={1.7} />
      </div>
      <div class="ads-page__card-body">
        <div class="ads-page__card-top">
          <div class="ads-page__name">{ad.name || ad.title || '未命名广告'}</div>
          <Toggle checked={on} aria-label={`切换 ${ad.name || ad.title} 状态`} onChange={onToggle} />
        </div>
        <div class="ads-page__copy">{ad.title || '未填写标题'} — {ad.body || '未填写文案'}</div>
        <div class="ads-page__url">
          <HfIcon name="link" size={13} /> {ad.cta_href || '未设置链接'}
        </div>
        <div class="ads-page__metrics">
          <Metric value={fmt(impressions)} label="曝光 / 周" />
          <Metric value={fmt(clicks)} label="点击 / 周" />
          <Metric value={ctr} label="CTR" />
        </div>
      </div>
      <footer class="ads-page__card-foot">
        <Tag tone={on ? 'ok' : 'default'}>{on ? '开启' : '暂停'}</Tag>
        <span class="hf-grow" />
        <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" onClick={onEdit}>
          <HfIcon name="edit" size={12} /> 编辑
        </button>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--danger" onClick={onDelete}>
          删除
        </button>
      </footer>
    </article>
  );
}

function Metric({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <span class="ads-page__metric">
      <b>{value}</b>
      <span>{label}</span>
    </span>
  );
}

function AdDrawer({
  ad,
  onChange,
  onCancel,
  onSave,
}: {
  ad: HfAdSettings;
  onChange: (ad: HfAdSettings) => void;
  onCancel: () => void;
  onSave: () => void;
}): JSX.Element {
  const tone = ad.tone ?? 'blue';
  const slot = (ad.slot ?? 'home') as AdSlot;
  const set = (patch: Partial<HfAdSettings>) => onChange({ ...ad, ...patch });
  return (
    <aside class="ads-page__drawer" role="dialog" aria-modal="true" aria-labelledby="ad-drawer-title">
      <header class="ads-page__drawer-head">
        <div>
          <h2 id="ad-drawer-title">{ad.name || ad.title ? '编辑广告' : '新建广告'}</h2>
          <p>{SLOTS[slot].label}</p>
        </div>
        <span class="hf-grow" />
        <button type="button" class="ui-btn ui-btn--icon ui-btn--ghost" onClick={onCancel} aria-label="关闭">
          ×
        </button>
      </header>
      <div class="ads-page__drawer-body">
        <div class={`ads-page__preview ads-page__thumb ${TONES[tone].cls}`}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span class="ads-page__preview-label">Sponsored</span>
            <div class="ads-page__preview-title">{ad.title || '广告标题'}</div>
            <div class="ads-page__preview-desc">{ad.body || '广告文案会显示在这里'}</div>
          </div>
          <span class="ads-page__preview-cta">{ad.cta_label || '了解更多'}</span>
        </div>

        <Field label="后台名称" id="ad-name">
          <input id="ad-name" value={ad.name ?? ''} onInput={(e) => set({ name: (e.currentTarget as HTMLInputElement).value })} />
        </Field>
        <Field label="投放位置" id="ad-slot">
          <div class="ads-page__seg" id="ad-slot">
            {(Object.keys(SLOTS) as AdSlot[]).map((s) => (
              <button
                type="button"
                key={s}
                class={s === slot ? 'is-active' : ''}
                onClick={() => set({ slot: s })}
              >
                {SLOTS[s].short}
              </button>
            ))}
          </div>
        </Field>
        <Field label="标题" id="ad-title">
          <input id="ad-title" value={ad.title} onInput={(e) => set({ title: (e.currentTarget as HTMLInputElement).value })} />
        </Field>
        <Field label="文案" id="ad-body">
          <textarea id="ad-body" rows={3} value={ad.body ?? ''} onInput={(e) => set({ body: (e.currentTarget as HTMLTextAreaElement).value })} />
        </Field>
        <div class="ws-e__form-grid2">
          <Field label="按钮文字" id="ad-cta">
            <input id="ad-cta" value={ad.cta_label ?? ''} onInput={(e) => set({ cta_label: (e.currentTarget as HTMLInputElement).value })} />
          </Field>
          <Field label="跳转链接" id="ad-url">
            <input id="ad-url" value={ad.cta_href ?? ''} placeholder="https://example.com" onInput={(e) => set({ cta_href: (e.currentTarget as HTMLInputElement).value })} />
          </Field>
        </div>
        <Field label="主题色" id="ad-tone">
          <div class="ads-page__tones" id="ad-tone">
            {TONE_KEYS.map((t) => (
              <button
                type="button"
                key={t}
                class={`ads-page__tone ${t === tone ? 'is-active' : ''}`}
                style={{ background: TONES[t].sw }}
                title={TONES[t].label}
                aria-label={TONES[t].label}
                onClick={() => set({ tone: t })}
              />
            ))}
          </div>
        </Field>
        <label class="ws-e__check-label">
          <Toggle checked={ad.enabled !== false} aria-label="广告状态" onChange={() => set({ enabled: !(ad.enabled !== false) })} />
          <span>{ad.enabled !== false ? '已开启' : '已暂停'}</span>
        </label>
      </div>
      <footer class="ads-page__drawer-foot">
        <button type="button" class="ui-btn ui-btn--ghost" onClick={onCancel}>取消</button>
        <button type="button" class="ui-btn ui-btn--primary" onClick={onSave}>保存广告</button>
      </footer>
    </aside>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: JSX.Element }): JSX.Element {
  return (
    <div class="ws-e__field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function readAds(home: NonNullable<Awaited<ReturnType<typeof api.settings.get>>['home']>): HfAdSettings[] {
  if (Array.isArray(home.ads) && home.ads.length > 0) return home.ads.map(normalizeAd);
  if (home.ad?.enabled) return [normalizeAd({ ...home.ad, id: 'legacy-home-ad', slot: 'home', tone: home.ad.tone ?? 'blue' })];
  return DEFAULT_ADS.map(normalizeAd);
}

function normalizeAd(ad: HfAdSettings): HfAdSettings {
  return {
    ...ad,
    id: ad.id || makeId(),
    enabled: ad.enabled !== false,
    variant: ad.variant ?? 'native',
    slot: ad.slot ?? 'home',
    tone: ad.tone ?? 'blue',
    title: ad.title ?? '',
    body: ad.body ?? '',
    cta_label: ad.cta_label ?? '了解更多',
    cta_href: ad.cta_href ?? '',
    impressions: ad.impressions ?? 0,
    clicks: ad.clicks ?? 0,
  };
}

function cleanAdForStorage(ad: HfAdSettings): HfAdSettings {
  const source = { ...ad };
  const href = normalizeHref(ad.cta_href);
  if (href) source.cta_href = href;
  else delete source.cta_href;
  const normalized = normalizeAd(source);
  const out: HfAdSettings = {
    enabled: normalized.enabled,
    variant: normalized.variant,
    title: normalized.title.trim() || normalized.name?.trim() || '未命名广告',
  };
  if (normalized.id) out.id = normalized.id;
  if (normalized.name?.trim()) out.name = normalized.name.trim();
  if (normalized.slot) out.slot = normalized.slot;
  if (normalized.tone) out.tone = normalized.tone;
  if (normalized.body?.trim()) out.body = normalized.body.trim();
  if (normalized.cta_label?.trim()) out.cta_label = normalized.cta_label.trim();
  if (normalized.cta_href?.trim()) out.cta_href = normalized.cta_href.trim();
  if (normalized.impressions !== undefined) out.impressions = normalized.impressions;
  if (normalized.clicks !== undefined) out.clicks = normalized.clicks;
  return out;
}

function normalizeHref(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return `https://${raw}`;
  return undefined;
}

function makeId(): string {
  return `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}
