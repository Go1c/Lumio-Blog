/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard,
   TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakRadio,
   HFHome, HFArticle, HFDashboard, HFNoteDetail,
   HFHomeMobile, HFArticleMobile, HFAdminMobile,
   HFArticleComments, HFNewsletter, HFSearchResults, HFTagDetail,
   HFNotFound, HFMediaLibrary, HFApiTokens, HFGraph, HFBlogCli,
   HFSettings, HFAbout, HFRssPage, HFOgGenerator, HFSettingsMobile,
   HFArticleAnalytics, HFConfigDocs */

const { useEffect, useState } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "auto"
}/*EDITMODE-END*/;

function useResolvedTheme(pref) {
  const [system, setSystem] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = (e) => setSystem(e.matches ? 'dark' : 'light');
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return pref === 'auto' ? system : pref;
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = useResolvedTheme(tweaks.theme);
  const onTheme = () => {
    const cycle = { light: 'dark', dark: 'auto', auto: 'light' };
    setTweak('theme', cycle[tweaks.theme] || 'light');
  };

  return (
    <React.Fragment>
      <DesignCanvas
        title="LumioGames — Hi-Fi"
        subtitle="高保真：白底 + 蓝 accent · 黑体 + JetBrains Mono · 浅 / 深 / 跟随系统"
      >
        <DCSection id="frontend" title="🌐 前台">
          <DCArtboard id="hifi-home" label="首页 — Hero 动画 + 三栏目录站" width={1280} height={820}>
            <HFHome theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="hifi-article" label="文章详情 — 进度条 / 代码块 / Mermaid / KaTeX / 反向链接图" width={1280} height={820}>
            <HFArticle theme={theme} onTheme={onTheme} />
          </DCArtboard>
        </DCSection>

        <DCSection id="admin" title="⚙️ 后台">
          <DCArtboard id="hifi-dashboard" label="仪表盘 — KPI / 趋势图 / Top 5 / 实时活动" width={1280} height={820}>
            <HFDashboard theme={theme} />
          </DCArtboard>
          <DCArtboard id="hifi-note" label="单笔记详情 — 可见性 4 档 / 可搜索 / 短链 / 定时发布" width={1280} height={820}>
            <HFNoteDetail theme={theme} />
          </DCArtboard>
        </DCSection>

        <DCSection id="extras" title="📑 更多页面">
          <DCArtboard id="comments" label="文章评论 — Giscus 风格" width={1280} height={820}>
            <HFArticleComments theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="newsletter" label="Newsletter 订阅页" width={1280} height={820}>
            <HFNewsletter theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="search" label="搜索结果 — 高亮 / 类型筛选 / 标签" width={1280} height={820}>
            <HFSearchResults theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="tag" label="标签详情 — #游戏 AI" width={1280} height={820}>
            <HFTagDetail theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="404" label="404 / 私有拦截 — 诊断面板" width={1280} height={820}>
            <HFNotFound theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="graph" label="知识关系图 — 全屏 + 集群" width={1280} height={820}>
            <HFGraph theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="media" label="后台 · 媒体库" width={1280} height={820}>
            <HFMediaLibrary theme={theme} />
          </DCArtboard>
          <DCArtboard id="tokens" label="后台 · API tokens / Webhook" width={1280} height={820}>
            <HFApiTokens theme={theme} />
          </DCArtboard>
          <DCArtboard id="cli" label="Blog CLI — Agent 友好的命令行 + MCP" width={1280} height={820}>
            <HFBlogCli theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="settings" label="后台 · 设置 (站点/作者/外观/SEO/社交)" width={1280} height={820}>
            <HFSettings theme={theme} />
          </DCArtboard>
          <DCArtboard id="about" label="前台 · 关于 / Now / Contact" width={1280} height={820}>
            <HFAbout theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="rss" label="前台 · RSS / Atom / JSON Feed 美化预览" width={1280} height={820}>
            <HFRssPage theme={theme} onTheme={onTheme} />
          </DCArtboard>
          <DCArtboard id="og" label="后台 · OG 图生成器 (4 模板 + 社交预览)" width={1280} height={820}>
            <HFOgGenerator theme={theme} />
          </DCArtboard>
          <DCArtboard id="analytics" label="后台 · 单篇文章 Analytics 钻取" width={1280} height={820}>
            <HFArticleAnalytics theme={theme} />
          </DCArtboard>
          <DCArtboard id="config" label="📦 开源用户：配置文件参考 (config.yaml / features.yaml / .env / frontmatter)" width={1280} height={820}>
            <HFConfigDocs theme={theme} onTheme={onTheme} />
          </DCArtboard>
        </DCSection>

        <DCSection id="mobile" title="📱 移动端">
          <DCArtboard id="m-home" label="首页 — Hero / 分类 chips / Feed / 底部 tab bar" width={460} height={920}>
            <HFHomeMobile theme={theme} />
          </DCArtboard>
          <DCArtboard id="m-article" label="文章 — 进度条 / 代码块 / 浮动操作 pill" width={460} height={920}>
            <HFArticleMobile theme={theme} />
          </DCArtboard>
          <DCArtboard id="m-admin" label="后台 — 单笔记可见性 / 短链编辑" width={460} height={920}>
            <HFAdminMobile theme={theme} />
          </DCArtboard>
          <DCArtboard id="m-settings" label="后台 — 设置 (iOS list 风)" width={460} height={920}>
            <HFSettingsMobile theme={theme} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="主题">
          <TweakRadio
            label="模式"
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'auto', label: '跟随系统' },
            ]}
            value={tweaks.theme}
            onChange={v => setTweak('theme', v)}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3, #888)', marginTop: 6, fontFamily: 'var(--mono, monospace)' }}>
            当前生效: {theme}
          </div>
        </TweakSection>
        <TweakSection title="对比">
          <div style={{ fontSize: 12, color: 'var(--ink-3, #888)', lineHeight: 1.6 }}>
            线框版 → <a href="wireframes.html" style={{ color: '#0066ff' }}>wireframes.html</a>
          </div>
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
