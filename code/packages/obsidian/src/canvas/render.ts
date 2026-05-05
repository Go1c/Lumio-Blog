import { parseCanvas } from './parse.js';
import {
  type CanvasDoc,
  type CanvasNode,
  type CanvasEdge,
  type EdgeSide,
  CANVAS_PRESET_COLORS,
} from './types.js';
import type { RenderCanvasOptions } from '../types.js';

/**
 * 渲染 .canvas → 完整 HTML 片段:
 *
 *   <div class="ob-canvas" data-w="..." data-h="...">
 *     <svg class="ob-canvas__edges">…</svg>
 *     <div class="ob-canvas__node ob-canvas__node--text" style="..."> …rendered md… </div>
 *     ...
 *     <div class="ob-canvas__group" style="...">…label…</div>
 *   </div>
 *
 * 我们做的事:
 *   - 计算 viewport(全部节点的 bbox + padding)
 *   - 把节点的 (x,y,w,h) 转成相对 viewport 的 left/top
 *   - groups 排在最底层、其他节点 z-index 高一档
 *   - text 节点的 markdown 走传入的 renderInlineMarkdown(避免 obsidian 包知道 markdown pipeline)
 *   - file / link 节点用清晰的卡片
 *   - edges 画 SVG 路径,带可选箭头 + 标签
 *   - 最外层 wrapper 自带 panzoom 行为(纯 CSS + 一段 JS,后端 SSR 出 HTML 即可,前端 hydrate)
 */
export async function renderCanvas(opts: RenderCanvasOptions): Promise<string> {
  const doc = parseCanvas(opts.json);
  const { minX, minY, maxX, maxY } = bbox(doc.nodes);
  const padding = 80;
  const viewW = Math.max(800, maxX - minX + padding * 2);
  const viewH = Math.max(600, maxY - minY + padding * 2);
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // group 在底,其他节点在上
  const groups = doc.nodes.filter((n): n is Extract<CanvasNode, { type: 'group' }> => n.type === 'group');
  const others = doc.nodes.filter((n) => n.type !== 'group');

  const groupHtml = (await Promise.all(groups.map((g) => renderGroup(g, offsetX, offsetY)))).join('\n');
  const nodeHtml = (await Promise.all(others.map((n) => renderNode(n, offsetX, offsetY, opts)))).join('\n');
  const edgeHtml = renderEdges(doc, offsetX, offsetY);

  return `<div class="ob-canvas" data-w="${viewW}" data-h="${viewH}" tabindex="0">
  <div class="ob-canvas__viewport" style="width:${viewW}px;height:${viewH}px;">
    ${groupHtml}
    ${edgeHtml}
    ${nodeHtml}
  </div>
  <div class="ob-canvas__controls" aria-label="画布控件">
    <button type="button" class="ob-canvas__btn" data-act="zoom-in" aria-label="放大">+</button>
    <button type="button" class="ob-canvas__btn" data-act="zoom-out" aria-label="缩小">−</button>
    <button type="button" class="ob-canvas__btn" data-act="fit" aria-label="适应窗口">⤢</button>
    <button type="button" class="ob-canvas__btn" data-act="reset" aria-label="重置">↺</button>
  </div>
</div>`;
}

function bbox(nodes: CanvasNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { minX, minY, maxX, maxY };
}

function colorOf(c: string | undefined): string {
  if (!c) return 'var(--ob-canvas-default)';
  return CANVAS_PRESET_COLORS[c] ?? c;
}

function styleOf(n: CanvasNode, ox: number, oy: number, extra = ''): string {
  return `left:${n.x + ox}px;top:${n.y + oy}px;width:${n.width}px;height:${n.height}px;${extra}`;
}

async function renderGroup(
  g: Extract<CanvasNode, { type: 'group' }>,
  ox: number,
  oy: number,
): Promise<string> {
  const color = colorOf(g.color);
  const labelHtml = g.label
    ? `<div class="ob-canvas__group-label" style="color:${color}">${esc(g.label)}</div>`
    : '';
  return `<div class="ob-canvas__group" data-id="${esc(g.id)}" style="${styleOf(g, ox, oy, `--ob-color:${color};`)}">
    ${labelHtml}
  </div>`;
}

async function renderNode(
  n: CanvasNode,
  ox: number,
  oy: number,
  opts: RenderCanvasOptions,
): Promise<string> {
  if (n.type === 'group') return ''; // already done
  const color = colorOf(n.color);
  if (n.type === 'text') {
    const html = await opts.renderInlineMarkdown(n.text);
    return `<div class="ob-canvas__node ob-canvas__node--text" data-id="${esc(n.id)}" style="${styleOf(n, ox, oy, `--ob-color:${color};`)}">
      <div class="ob-canvas__node-body hf-prose">${html}</div>
    </div>`;
  }
  if (n.type === 'file') {
    // 解析为内部链接
    const linkParts = {
      target: n.file,
      embed: false,
      ...(n.subpath ? { anchor: n.subpath.replace(/^#/, '') } : {}),
    };
    const resolved = opts.resolveLink(linkParts);
    const href =
      resolved.kind === 'note'
        ? `/posts/${resolved.slug}.html${resolved.anchor ? '#' + slugAnchor(resolved.anchor) : ''}`
        : resolved.kind === 'asset'
        ? resolved.url
        : '#';
    const title =
      resolved.kind === 'note'
        ? resolved.title
        : resolved.kind === 'asset'
        ? resolved.filename
        : n.file;
    const isImg = resolved.kind === 'asset' && resolved.mime.startsWith('image/');
    const inner = isImg
      ? `<img src="${esc((resolved as { url: string }).url)}" alt="${esc(title)}" loading="lazy">`
      : `<div class="ob-canvas__node-title">${esc(title)}</div>
         <div class="ob-canvas__node-meta">${esc(n.file)}</div>`;
    return `<a class="ob-canvas__node ob-canvas__node--file" data-id="${esc(n.id)}" href="${esc(href)}" style="${styleOf(n, ox, oy, `--ob-color:${color};`)}">
      ${inner}
    </a>`;
  }
  if (n.type === 'link') {
    return `<a class="ob-canvas__node ob-canvas__node--link" data-id="${esc(n.id)}" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer" style="${styleOf(n, ox, oy, `--ob-color:${color};`)}">
      <div class="ob-canvas__node-title">${esc(prettyUrl(n.url))}</div>
      <div class="ob-canvas__node-meta">${esc(n.url)}</div>
    </a>`;
  }
  return '';
}

function renderEdges(doc: CanvasDoc, ox: number, oy: number): string {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const paths: string[] = [];
  for (const e of doc.edges) {
    const a = byId.get(e.fromNode);
    const b = byId.get(e.toNode);
    if (!a || !b) continue;
    const p1 = sideAnchor(a, e.fromSide ?? autoSide(a, b));
    const p2 = sideAnchor(b, e.toSide ?? autoSide(b, a));
    p1.x += ox; p1.y += oy;
    p2.x += ox; p2.y += oy;
    const path = bezierPath(p1, p2, e.fromSide ?? autoSide(a, b), e.toSide ?? autoSide(b, a));
    const color = colorOf(e.color);
    const arrowEnd = (e.toEnd ?? 'arrow') === 'arrow' ? 'url(#ob-canvas-arrow)' : 'none';
    const arrowStart = e.fromEnd === 'arrow' ? 'url(#ob-canvas-arrow)' : 'none';
    paths.push(
      `<path d="${path}" stroke="${color}" stroke-width="2" fill="none" marker-end="${arrowEnd}" marker-start="${arrowStart}" />`,
    );
    if (e.label) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      paths.push(
        `<g class="ob-canvas__edge-label" transform="translate(${mx} ${my})">
          <rect x="${-(e.label.length * 4)}" y="-10" width="${e.label.length * 8}" height="20" rx="4" />
          <text text-anchor="middle" dy="4" fill="currentColor">${esc(e.label)}</text>
        </g>`,
      );
    }
  }
  return `<svg class="ob-canvas__edges" preserveAspectRatio="none">
    <defs>
      <marker id="ob-canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor"></path>
      </marker>
    </defs>
    ${paths.join('\n')}
  </svg>`;
}

function autoSide(a: CanvasNode, b: CanvasNode): EdgeSide {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function sideAnchor(n: CanvasNode, side: EdgeSide): { x: number; y: number } {
  const cx = n.x + n.width / 2;
  const cy = n.y + n.height / 2;
  if (side === 'top') return { x: cx, y: n.y };
  if (side === 'bottom') return { x: cx, y: n.y + n.height };
  if (side === 'left') return { x: n.x, y: cy };
  return { x: n.x + n.width, y: cy };
}

function bezierPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  s1: EdgeSide,
  s2: EdgeSide,
): string {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const off = Math.max(40, Math.min(160, (dx + dy) / 4));
  const c1 = controlPoint(p1, s1, off);
  const c2 = controlPoint(p2, s2, off);
  return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
}

function controlPoint(p: { x: number; y: number }, s: EdgeSide, off: number): { x: number; y: number } {
  if (s === 'top') return { x: p.x, y: p.y - off };
  if (s === 'bottom') return { x: p.x, y: p.y + off };
  if (s === 'left') return { x: p.x - off, y: p.y };
  return { x: p.x + off, y: p.y };
}

function slugAnchor(a: string): string {
  if (a.startsWith('^')) return `block-${a.slice(1).replace(/[^A-Za-z0-9_-]/g, '')}`;
  return a.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\-_]+/gu, '');
}

function prettyUrl(u: string): string {
  try {
    const parsed = new URL(u);
    return parsed.host + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return u;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 客户端 panzoom + 折叠/展开逻辑(SSR 出 HTML 后,前端跑这段做交互)
 * 不依赖任何运行时库,完全 vanilla。
 */
export const CANVAS_RUNTIME_JS = `(function(){
  const canvases = document.querySelectorAll('.ob-canvas');
  for (const root of canvases) initCanvas(root);

  function initCanvas(root){
    const vp = root.querySelector('.ob-canvas__viewport');
    if (!vp) return;
    let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0;
    const apply = () => { vp.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; };
    function fit(){
      const rect = root.getBoundingClientRect();
      const vw = parseFloat(root.dataset.w || '800');
      const vh = parseFloat(root.dataset.h || '600');
      const s = Math.min(rect.width / vw, rect.height / vh);
      scale = isFinite(s) && s > 0 ? Math.min(1, s) : 1;
      tx = (rect.width - vw * scale) / 2;
      ty = (rect.height - vh * scale) / 2;
      apply();
    }
    fit();
    window.addEventListener('resize', fit);
    root.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      const ns = Math.max(0.15, Math.min(4, scale * (1 + delta)));
      const rect = root.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // 让光标位置在缩放前后映射不变
      const wx = (px - tx) / scale;
      const wy = (py - ty) / scale;
      scale = ns;
      tx = px - wx * scale;
      ty = py - wy * scale;
      apply();
    }, { passive: false });
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a,button')) return;
      dragging = true; sx = e.clientX - tx; sy = e.clientY - ty;
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      tx = e.clientX - sx; ty = e.clientY - sy; apply();
    });
    root.addEventListener('pointerup', (e) => {
      dragging = false;
      try { root.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.ob-canvas__btn');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'zoom-in') { scale = Math.min(4, scale * 1.2); apply(); }
      else if (act === 'zoom-out') { scale = Math.max(0.15, scale / 1.2); apply(); }
      else if (act === 'fit' || act === 'reset') { fit(); }
    });
  }
})();`;
