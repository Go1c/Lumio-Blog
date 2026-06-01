import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

/**
 * 知识图谱 — 全屏 SVG d3-force
 *
 * 设计稿:doc/prototype/hf-extras.jsx §12 HFGraph
 *
 * 无 JS fallback:渲染一个静态 <noscript> 提示 + 链接到全部文章列表。
 * d3 通过 esm.sh 加载,数据从 /api/graph 取。
 */
export function renderGraph(config: SiteConfig): string {
  const body = `
    <div class="wsb-graph" data-component="graph">
      <noscript>
        <div class="wsb-graph__noscript">
          <h1>知识图谱需要 JavaScript</h1>
          <p>请启用 JavaScript,或直接访问<a href="/">文章列表</a>、<a href="/tags/index.html">标签索引</a>。</p>
        </div>
      </noscript>

      <div class="wsb-graph__layout">
        <!-- canvas wrap -->
        <div class="wsb-graph__canvas" id="wsb-graph-canvas">
          <div class="wsb-graph__grid" aria-hidden="true"></div>
          <svg
            class="wsb-graph__svg"
            id="wsb-graph-svg"
            role="img"
            aria-label="知识图谱"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid meet"
          >
            <g class="wsb-graph__edges" id="wsb-graph-edges"></g>
            <g class="wsb-graph__nodes" id="wsb-graph-nodes"></g>
          </svg>

          <!-- legend / clusters -->
          <div class="wsb-graph__legend" id="wsb-graph-legend" role="group" aria-label="图例">
            <div class="hf-mono hf-tiny wsb-graph__legend-h">▸ 集群</div>
            <div class="wsb-graph__legend-list" data-list></div>
          </div>

          <!-- zoom controls -->
          <div class="wsb-graph__zoom" role="toolbar" aria-label="缩放控制">
            <button type="button" class="ui-btn ui-btn--icon" data-zoom="in" aria-label="放大">+</button>
            <button type="button" class="ui-btn ui-btn--icon" data-zoom="out" aria-label="缩小"><span aria-hidden="true">−</span></button>
            <button type="button" class="ui-btn ui-btn--icon" data-zoom="reset" aria-label="重置视图"><span aria-hidden="true">⌖</span></button>
          </div>

          <!-- empty / loading -->
          <div class="wsb-graph__overlay" id="wsb-graph-overlay" aria-live="polite">
            <span class="hf-mono hf-tiny hf-muted">加载图谱…</span>
          </div>
        </div>

        <!-- sidebar — selected node info -->
        <aside class="wsb-graph__side" id="wsb-graph-side" aria-label="节点详情">
          <div class="hf-mono hf-tiny wsb-graph__side-h">▸ 已选中</div>
          <div class="wsb-graph__side-empty" data-empty>
            <p class="hf-muted hf-sm">点击节点查看详情</p>
          </div>
          <div class="wsb-graph__side-detail" data-detail hidden>
            <div class="wsb-graph__side-title-row">
              <span class="wsb-graph__side-dot" data-dot aria-hidden="true"></span>
              <h2 class="wsb-graph__side-title" data-title></h2>
            </div>
            <div class="hf-mono hf-tiny hf-muted wsb-graph__side-meta" data-meta></div>
            <p class="hf-sm wsb-graph__side-desc" data-desc></p>
            <div class="wsb-graph__side-actions">
              <a class="ui-btn ui-btn--sm ui-btn--primary" data-open href="#">打开</a>
              <button type="button" class="ui-btn ui-btn--sm" data-focus>↗ 仅看相关</button>
            </div>
            <div class="hf-mono hf-tiny wsb-graph__side-h">▸ 直接关联 <span data-degree></span></div>
            <ol class="wsb-graph__neighbors" data-neighbors></ol>
          </div>
        </aside>
      </div>
    </div>
    <script type="module" src="/graph.js"></script>`;

  return layout({
    title: `知识图谱 · ${esc(config.site.title)}`,
    description: '全部笔记的知识图谱(力导向)',
    config,
    body,
    active: '',
    path: '/graph/index.html',
  });
}
