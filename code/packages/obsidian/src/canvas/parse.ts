import type { CanvasDoc, CanvasNode, CanvasEdge } from './types.js';

export class CanvasParseError extends Error {}

/**
 * 严格 + 容错的 .canvas 解析。
 * - 缺 nodes/edges 当空数组
 * - id 缺失/重复 → 自动生成
 * - 不识别的 type 按 'text' 处理
 */
export function parseCanvas(json: string): CanvasDoc {
  let doc: unknown;
  try {
    doc = JSON.parse(json);
  } catch (e) {
    throw new CanvasParseError(`canvas json parse failed: ${(e as Error).message}`);
  }
  if (typeof doc !== 'object' || doc === null) {
    throw new CanvasParseError('canvas json: top-level must be object');
  }
  const obj = doc as Record<string, unknown>;
  const nodesRaw = Array.isArray(obj.nodes) ? (obj.nodes as unknown[]) : [];
  const edgesRaw = Array.isArray(obj.edges) ? (obj.edges as unknown[]) : [];

  const nodes: CanvasNode[] = [];
  const seenIds = new Set<string>();
  let counter = 0;

  for (const raw of nodesRaw) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    let id = typeof r.id === 'string' && r.id ? r.id : `n${counter++}`;
    while (seenIds.has(id)) id = `${id}_${counter++}`;
    seenIds.add(id);
    const type = (r.type as string) ?? 'text';

    const baseRequired = {
      id,
      x: numeric(r.x),
      y: numeric(r.y),
      width: numeric(r.width, 200),
      height: numeric(r.height, 100),
    };
    const colorOpt: { color?: string } = typeof r.color === 'string' ? { color: r.color } : {};

    if (type === 'file' && typeof r.file === 'string') {
      const subOpt: { subpath?: string } = typeof r.subpath === 'string' ? { subpath: r.subpath } : {};
      nodes.push({
        ...baseRequired,
        ...colorOpt,
        type: 'file',
        file: r.file,
        ...subOpt,
      });
      continue;
    }
    if (type === 'link' && typeof r.url === 'string') {
      nodes.push({
        ...baseRequired,
        ...colorOpt,
        type: 'link',
        url: r.url,
      });
      continue;
    }
    if (type === 'group') {
      const labelOpt: { label?: string } = typeof r.label === 'string' ? { label: r.label } : {};
      const bgOpt: { background?: string } = typeof r.background === 'string' ? { background: r.background } : {};
      const bgStyleOpt: { backgroundStyle?: 'cover' | 'ratio' | 'repeat' } =
        r.backgroundStyle === 'cover' || r.backgroundStyle === 'ratio' || r.backgroundStyle === 'repeat'
          ? { backgroundStyle: r.backgroundStyle }
          : {};
      nodes.push({
        ...baseRequired,
        ...colorOpt,
        type: 'group',
        ...labelOpt,
        ...bgOpt,
        ...bgStyleOpt,
      });
      continue;
    }
    // 默认 text
    nodes.push({
      ...baseRequired,
      ...colorOpt,
      type: 'text',
      text: typeof r.text === 'string' ? r.text : '',
    });
  }

  const edges: CanvasEdge[] = [];
  const eSeen = new Set<string>();
  for (const raw of edgesRaw) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.fromNode !== 'string' || typeof r.toNode !== 'string') continue;
    let id = typeof r.id === 'string' && r.id ? r.id : `e${counter++}`;
    while (eSeen.has(id)) id = `${id}_${counter++}`;
    eSeen.add(id);
    const e: CanvasEdge = {
      id,
      fromNode: r.fromNode,
      toNode: r.toNode,
    };
    if (r.fromSide === 'top' || r.fromSide === 'right' || r.fromSide === 'bottom' || r.fromSide === 'left') {
      e.fromSide = r.fromSide;
    }
    if (r.toSide === 'top' || r.toSide === 'right' || r.toSide === 'bottom' || r.toSide === 'left') {
      e.toSide = r.toSide;
    }
    if (r.fromEnd === 'none' || r.fromEnd === 'arrow') e.fromEnd = r.fromEnd;
    if (r.toEnd === 'none' || r.toEnd === 'arrow') e.toEnd = r.toEnd;
    if (typeof r.color === 'string') e.color = r.color;
    if (typeof r.label === 'string') e.label = r.label;
    edges.push(e);
  }

  return { nodes, edges };
}

function numeric(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
