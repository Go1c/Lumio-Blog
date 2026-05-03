/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard, TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakRadio,
   FEHomeA, FEHomeB, FEHomeC, FEArticleA, FEArticleB,
   AdminA, AdminB, AdminC,
   ShareLinkOnly, SharePublicShell, ShareAdminPreview,
   StickyNote */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sketchy": true,
  "showAnnotations": true,
  "showAssumptions": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.body.classList.toggle('is-clean', !tweaks.sketchy);
  }, [tweaks.sketchy]);

  return (
    <React.Fragment>
      <DesignCanvas
        title="LumioGames — Wireframes"
        subtitle="Blog 前台 · 笔记后台 · 分享链接 · 低保真探索"
      >
        {tweaks.showAssumptions && (
          <DCSection id="brief" title="📝 设计假设 & 系统决策">
            <DCArtboard id="brief-card" label="给自己的 brief" width={1100} height={520}>
              <div style={{
                padding: 32, fontFamily: 'var(--hand)', height: '100%',
                background: 'var(--paper)', display: 'grid',
                gridTemplateColumns: '1.1fr 1fr', gap: 24,
              }}>
                <div>
                  <div className="h-scribble" style={{ fontSize: 32 }}>给自己的 brief</div>
                  <div className="sep" style={{ width: 60 }} />
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                    <p><b>谁：</b> LumioGames — 独立游戏 / 引擎渲染 / 游戏 AI 方向的技术博客。</p>
                    <p><b>读者：</b> 关心 MCTS、RL、Unity / Vulkan、shader 的同行；多数从搜索引擎或 X 跳进来。</p>
                    <p><b>三类内容：</b> <span className="tag" style={{fontSize:12}}>文章</span> 长文 ·
                      <span className="tag" style={{fontSize:12, marginLeft:4}}>笔记</span> 短想法 ·
                      <span className="tag" style={{fontSize:12, marginLeft:4}}>文档</span> 系列连载</p>
                    <p><b>后端：</b> <span className="mono">fast-note-sync-service</span> + Obsidian 写作；后台只做<u>可见性</u>、<u>分享链接</u>、<u>统计</u>。</p>
                    <p><b>权限模型：</b> 公开 / 仅链接 / 私有 × 是否被搜索索引（两个独立维度）。</p>
                    <p><b>分享链接：</b> 公开类 → 完整博客壳；仅链接类 → 孤立极简页。</p>
                  </div>
                </div>
                <div className="col gap-12">
                  <div className="sk sk--warm sk-shadow" style={{ padding: 14 }}>
                    <div className="h-arch b">▸ 风格关键词</div>
                    <div className="row gap-6 wrap" style={{ marginTop: 8, fontSize: 13 }}>
                      <span className="tag">手写感</span>
                      <span className="tag">纸卡片</span>
                      <span className="tag tag--hi">橙色点缀</span>
                      <span className="tag">技术克制</span>
                      <span className="tag tag--ghost">不卖萌</span>
                    </div>
                  </div>
                  <div className="sk sk--warm sk-shadow" style={{ padding: 14 }}>
                    <div className="h-arch b">▸ 三种可见性的视觉编码</div>
                    <div className="col gap-4 sm" style={{ marginTop: 6 }}>
                      <div><span className="tag tag--ok" style={{fontSize:12}}>● 公开</span> — 列表里出现，搜索可达，可被推荐</div>
                      <div><span className="tag tag--warn" style={{fontSize:12}}>◐ 仅链接</span> — 只能通过短链访问</div>
                      <div><span className="tag tag--danger" style={{fontSize:12}}>○ 私有</span> — 只在后台可见</div>
                    </div>
                  </div>
                  <StickyNote color="orange" rotate={-2}>
                    <b>下一步：</b> 你挑出最喜欢的 1 个首页方向 + 1 个后台方向，
                    我们再做高保真。
                  </StickyNote>
                </div>
              </div>
            </DCArtboard>
          </DCSection>
        )}

        <DCSection id="frontend" title="🌐 前台 · 首页 (3 variants)">
          <DCArtboard id="fe-a" label="A — 三栏目录站（左分类 / 中列表 / 右我是谁）" width={1280} height={800}>
            <FEHomeA />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 80, right: -180, width: 170 }}>
                <StickyNote color="yellow" rotate={3}>
                  按你「我自己定义目录」的需求：
                  左侧固定 3 类，分类自管。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
          <DCArtboard id="fe-b" label="B — 大标签云 + 双列 feed（推荐）" width={1280} height={800}>
            <FEHomeB />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 220, right: -180, width: 170 }}>
                <StickyNote color="orange" rotate={-3}>
                  hero 直白，标签字号 = 文章数；
                  最近笔记带可见性徽标。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
          <DCArtboard id="fe-c" label="C — 终端复古风（暗色等宽）" width={1280} height={800}>
            <FEHomeC />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 80, right: -180, width: 170 }}>
                <StickyNote color="blue" rotate={2}>
                  比较有性格但读起来累；
                  适合做"开发者档案"模式。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
        </DCSection>

        <DCSection id="article" title="📄 前台 · 文章详情 (2 variants)">
          <DCArtboard id="art-a" label="A — 经典文档站（左目录 / 右大纲 / 反向链接）" width={1280} height={800}>
            <FEArticleA />
          </DCArtboard>
          <DCArtboard id="art-b" label="B — 沉浸阅读（中央窄列 / 浮动操作）" width={1280} height={800}>
            <FEArticleB />
          </DCArtboard>
        </DCSection>

        <DCSection id="admin" title="⚙️ 后台 · 控制面板 (3 variants)">
          <DCArtboard id="adm-a" label="A — 双栏：左笔记树 / 右单条详情（聚焦单笔记的可见性）" width={1280} height={820}>
            <AdminA />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 240, right: -190, width: 180 }}>
                <StickyNote color="orange" rotate={2}>
                  核心三块：可见性 / 可搜索 / 短链
                  并排平铺，一眼定位。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
          <DCArtboard id="adm-b" label="B — 表格密集（批量操作笔记库）" width={1280} height={820}>
            <AdminB />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 100, right: -190, width: 180 }}>
                <StickyNote color="yellow" rotate={-2}>
                  一行一笔记，批量改可见性 /
                  生成短链 / 改分类 都很顺手。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
          <DCArtboard id="adm-c" label="C — 仪表盘（KPI + 待处理）" width={1280} height={820}>
            <AdminC />
            {tweaks.showAnnotations && (
              <div style={{ position: 'absolute', top: 100, right: -190, width: 180 }}>
                <StickyNote color="blue" rotate={-2}>
                  作为 admin 主页，进来先看
                  整体状态再下钻到具体笔记。
                </StickyNote>
              </div>
            )}
          </DCArtboard>
        </DCSection>

        <DCSection id="share" title="🔗 分享链接 · 两种权限态">
          <DCArtboard id="sh-a" label="仅链接 — 孤立页（无博客壳，不被索引）" width={1280} height={780}>
            <ShareLinkOnly />
          </DCArtboard>
          <DCArtboard id="sh-b" label="公开 — 嵌入完整博客壳" width={1280} height={780}>
            <SharePublicShell />
          </DCArtboard>
          <DCArtboard id="sh-c" label="后台短链管理（关联视图）" width={1280} height={780}>
            <ShareAdminPreview />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="呈现">
          <TweakToggle
            label="手绘感 (sketchy)"
            hint="关掉后切换到干净的几何线框"
            value={tweaks.sketchy}
            onChange={v => setTweak('sketchy', v)}
          />
          <TweakToggle
            label="显示便签注解"
            value={tweaks.showAnnotations}
            onChange={v => setTweak('showAnnotations', v)}
          />
          <TweakToggle
            label="显示「设计假设」section"
            value={tweaks.showAssumptions}
            onChange={v => setTweak('showAssumptions', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
