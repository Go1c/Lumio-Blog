/**
 * JSONCanvas spec: https://jsoncanvas.org/spec/1.0/
 *
 * Obsidian Canvas 是其超集——节点 + 边 + group 容器。
 * 我们解析全部 4 种 node type 和 edge sides。
 */

export type CanvasColor = string; // "1"-"6" 预设 / 任意 CSS 颜色("#abc" / "rgb(..)")

export interface BaseCanvasNode {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
}

export interface TextCanvasNode extends BaseCanvasNode {
  type: 'text';
  text: string; // markdown
}

export interface FileCanvasNode extends BaseCanvasNode {
  type: 'file';
  /** vault 内的 source_path,例如 "AI-Creater/foo.md" */
  file: string;
  /** 子区段引用,例如 "#heading" / "#^block-id" */
  subpath?: string;
}

export interface LinkCanvasNode extends BaseCanvasNode {
  type: 'link';
  url: string;
}

export interface GroupCanvasNode extends BaseCanvasNode {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'ratio' | 'repeat';
}

export type CanvasNode =
  | TextCanvasNode
  | FileCanvasNode
  | LinkCanvasNode
  | GroupCanvasNode;

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: EdgeSide;
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: EdgeSide;
  toEnd?: 'none' | 'arrow';
  color?: CanvasColor;
  label?: string;
}

export interface CanvasDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/** Canvas 1-6 预设颜色 → CSS hsl(对齐 Obsidian 默认) */
export const CANVAS_PRESET_COLORS: Record<string, string> = {
  '1': '#e93147', // red
  '2': '#ec7500', // orange
  '3': '#e0ac00', // yellow
  '4': '#08b94e', // green
  '5': '#00b0ed', // cyan
  '6': '#7852ee', // purple
};
