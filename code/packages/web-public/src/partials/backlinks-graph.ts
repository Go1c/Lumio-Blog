import { esc } from '../templates/layout.js';

/**
 * Inline backlinks mini-graph (PR-F / design gap A-2).
 *
 * 渲染当前笔记 + 1-hop 邻居(backlinks ∪ outlinks)的紧凑 SVG 图。
 * 与 /graph 全图视图不同 — 这里是文章页左栏的上下文小图(~220×220px)。
 *
 * 纯 server-side SVG,无 D3 依赖,布局为简单径向(圆周等分)。
 */

export interface NeighborNode {
  slug: string;
  title: string;
  /** 'in' = 入链(backlink),'out' = 出链(outlink),'both' = 双向 */
  direction: 'in' | 'out' | 'both';
}

export interface Neighborhood {
  /** 中心节点 slug */
  slug: string;
  /** 中心节点标题 */
  title: string;
  /** 1-hop 邻居 */
  neighbors: NeighborNode[];
}

export interface LaidOutNode {
  slug: string;
  title: string;
  x: number;
  y: number;
  isCenter: boolean;
  direction?: 'in' | 'out' | 'both';
}

export interface LayoutOptions {
  /** SVG 总宽高(默认 220) */
  size?: number;
  /** 邻居环半径(默认 80) */
  radius?: number;
  /** 起始角度(弧度,默认 -π/2 即正上方) */
  startAngle?: number;
}

/**
 * 径向布局:中心节点放正中,邻居在半径 r 的圆周上等分。
 *
 * 输出顺序:[center, neighbor0, neighbor1, ...] —— 给定相同输入返回相同坐标(确定性)。
 */
export function layoutNeighborhood(
  n: Neighborhood,
  opts: LayoutOptions = {},
): LaidOutNode[] {
  const size = opts.size ?? 220;
  const radius = opts.radius ?? 80;
  const startAngle = opts.startAngle ?? -Math.PI / 2;
  const cx = size / 2;
  const cy = size / 2;

  const out: LaidOutNode[] = [
    { slug: n.slug, title: n.title, x: cx, y: cy, isCenter: true },
  ];

  const count = n.neighbors.length;
  if (count === 0) return out;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const nb = n.neighbors[i]!;
    out.push({
      slug: nb.slug,
      title: nb.title,
      x,
      y,
      isCenter: false,
      direction: nb.direction,
    });
  }

  return out;
}

/**
 * 合并 backlinks(入)和 outlinks(出)为去重的 1-hop 邻居列表。
 * 同时双向连接的节点 direction 标记为 'both'。
 *
 * @param backlinks 形如 { src_slug, title }(指向当前笔记)
 * @param outlinks  形如 { dst_slug, title }(从当前笔记指出)
 */
export function buildNeighborhood(args: {
  slug: string;
  title: string;
  backlinks: { src_slug: string; title: string }[];
  outlinks: { dst_slug: string | null; title: string }[];
}): Neighborhood {
  const map = new Map<string, NeighborNode>();

  for (const b of args.backlinks) {
    if (!b.src_slug || b.src_slug === args.slug) continue;
    map.set(b.src_slug, {
      slug: b.src_slug,
      title: b.title || b.src_slug,
      direction: 'in',
    });
  }

  for (const o of args.outlinks) {
    if (!o.dst_slug || o.dst_slug === args.slug) continue;
    const existing = map.get(o.dst_slug);
    if (existing) {
      existing.direction = 'both';
    } else {
      map.set(o.dst_slug, {
        slug: o.dst_slug,
        title: o.title || o.dst_slug,
        direction: 'out',
      });
    }
  }

  // 去重 + 稳定排序(slug 字母序)— 渲染确定性
  const neighbors = [...map.values()].sort((a, b) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
  );

  return { slug: args.slug, title: args.title, neighbors };
}

/** 截断标签到 ~12 字符,加省略号 */
function truncate(s: string, max = 12): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/**
 * 渲染 SVG 字符串。无邻居时返回空串(由 caller 决定是否整段隐藏)。
 */
export function renderBacklinksGraph(
  neighborhood: Neighborhood,
  opts: LayoutOptions = {},
): string {
  if (neighborhood.neighbors.length === 0) return '';

  const size = opts.size ?? 220;
  const laid = layoutNeighborhood(neighborhood, opts);
  const center = laid[0]!;
  const neighbors = laid.slice(1);

  const edges = neighbors
    .map(
      (nb) =>
        `<line class="wsa-minigraph__edge" x1="${center.x}" y1="${center.y}" x2="${nb.x}" y2="${nb.y}" />`,
    )
    .join('');

  const neighborMarkup = neighbors
    .map((nb) => {
      const label = truncate(nb.title || nb.slug);
      // 标签放在节点正下方;靠近 SVG 底/顶时小幅调整 dy 避免溢出
      const labelY = nb.y + (nb.y > size / 2 ? 18 : -10);
      return `<a class="wsa-minigraph__nodelink" xlink:href="/posts/${esc(nb.slug)}.html" href="/posts/${esc(nb.slug)}.html" aria-label="${esc(nb.title)}">
        <circle class="wsa-minigraph__node wsa-minigraph__node--neighbor" cx="${nb.x}" cy="${nb.y}" r="6" />
        <text class="wsa-minigraph__label" x="${nb.x}" y="${labelY}" text-anchor="middle">${esc(label)}</text>
      </a>`;
    })
    .join('');

  const centerMarkup = `<g class="wsa-minigraph__center-group">
    <circle class="wsa-minigraph__node wsa-minigraph__node--center" cx="${center.x}" cy="${center.y}" r="8" />
  </g>`;

  return `<svg class="wsa-minigraph__svg" viewBox="0 0 ${size} ${size}" width="100%" height="${size}" role="img" aria-label="文章关联图(${esc(neighborhood.title)})" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g class="wsa-minigraph__edges">${edges}</g>
    <g class="wsa-minigraph__nodes">${neighborMarkup}${centerMarkup}</g>
  </svg>`;
}

/**
 * 完整 wrapper —— 含标题 + svg。无邻居时返回空串。
 */
export function renderBacklinksGraphSection(
  neighborhood: Neighborhood,
  opts: LayoutOptions = {},
): string {
  if (neighborhood.neighbors.length === 0) return '';
  const svg = renderBacklinksGraph(neighborhood, opts);
  if (!svg) return '';
  return `<div class="wsa-side__h hf-mono hf-tiny">▸ 关联</div>
    <div class="wsa-minigraph" aria-label="${neighborhood.neighbors.length} 个相关笔记">
      ${svg}
    </div>`;
}
