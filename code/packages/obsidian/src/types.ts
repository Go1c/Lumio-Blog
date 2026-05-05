/**
 * Public types for @opennote/obsidian.
 *
 * 三种笔记原始形态(Obsidian vault 里实际存在的文件):
 * - markdown (.md)         — 主体,90% 以上的笔记
 * - canvas   (.canvas)     — JSONCanvas 节点图
 * - html     (.html)       — 第三方工具产出的预渲染报告(深度技术分析等)
 *
 * 每种都对应一个独立的渲染入口,但共享同一份 AssetIndex(图片 / 视频 / pdf)。
 */

export type NoteKind = 'markdown' | 'canvas' | 'html';

/** vault 内一个附件(非 .md/.canvas/.html 的资源文件)的元信息。 */
export interface VaultAsset {
  /** vault 根的相对路径,POSIX 分隔符 */
  source_path: string;
  /** basename(不含目录,含扩展名) */
  basename: string;
  /** basename 去掉扩展名 */
  stem: string;
  /** 扩展名(小写,带点),例如 ".png" */
  ext: string;
  /** 物理绝对路径 */
  abs_path: string;
  /** 文件大小,可选(walk 时统计) */
  bytes?: number;
}

/** vault 内一篇笔记的元信息——用于 wikilink 解析。 */
export interface VaultNoteRef {
  source_path: string;
  basename: string;
  stem: string;
  /** 渲染后的 slug;由调用方决定(一般 slugify(stem) 或 frontmatter.slug) */
  slug: string;
  kind: NoteKind;
}

/** 一次渲染所需的完整 vault 索引。读一次,渲染所有笔记复用。 */
export interface VaultIndex {
  /** 所有笔记(.md/.canvas/.html)按 stem 索引,大小写不敏感 */
  notesByStem: Map<string, VaultNoteRef>;
  /** notesByStem 的 case-sensitive 版本(同名时优先精确匹配) */
  notesByStemExact: Map<string, VaultNoteRef>;
  /** 所有附件按 basename(含扩展名) 索引;最常用的 lookup 方式 */
  assetsByBasename: Map<string, VaultAsset>;
  /** 同上,大小写不敏感后备 */
  assetsByBasenameLower: Map<string, VaultAsset>;
  /** 整 vault 文件按 source_path 找——用于 frontmatter 引用绝对路径时 */
  assetsByPath: Map<string, VaultAsset>;
  notesByPath: Map<string, VaultNoteRef>;
}

/**
 * Obsidian wikilink/embed 的解析结果。
 *
 * Obsidian 链接形态:
 *   [[target]]                — 内部链接,target = 笔记
 *   [[target|alias]]          — 带显示别名
 *   [[target#heading]]        — 跳到标题锚点
 *   [[target#^block-id]]      — 跳到块引用
 *   [[target.png]]            — 链接到附件(显示为下载链接)
 *   ![[target]]               — embed: 图片 / 音频 / 视频 / PDF / 笔记 transclusion
 */
export interface WikilinkParts {
  /** 原始 target 字段(去掉 #anchor 和 |alias 之前) */
  target: string;
  /** "#heading" 或 "#^blockid" 部分,不含 # */
  anchor?: string;
  /** "|alias" 后的展示文本 */
  alias?: string;
  /** 是否 embed(! 前缀) */
  embed: boolean;
}

/** wikilink 解析后,resolver 返回的最终目标。 */
export type ResolvedLink =
  | {
      kind: 'note';
      slug: string;
      title: string;
      anchor?: string;
      alias?: string;
      /**
       * 当 embed=true 时,可选附上「被嵌入笔记」已渲染好的 body_html 片段。
       * embeds.ts 拿到就直接渲染出嵌入卡片;没有就降级成「stub 链接」。
       *
       * sync pipeline 在主 render 之前做一遍 transclusion 预渲染(带 cycle 检测 + 深度上限),
       * 把结果注入这个字段。
       */
      transcludedHtml?: string;
    }
  | { kind: 'asset'; url: string; mime: string; filename: string; bytes?: number; alias?: string }
  | { kind: 'broken'; raw: string; alias?: string };

/**
 * 把 Obsidian wikilink 解析成实际目标的回调。
 * sync pipeline 用 VaultIndex + AssetPipeline 实现这个函数;
 * @opennote/obsidian 本身只 own 渲染逻辑。
 */
export type LinkResolver = (parts: WikilinkParts) => ResolvedLink;

/** 渲染后产出的所有外链/内链/媒体引用,供 db / media_refs 表写库。 */
export interface RenderedLink {
  raw: string;
  /** 'note' / 'asset' / 'broken' / 'external'(外部 http URL) */
  kind: 'note' | 'asset' | 'broken' | 'external';
  /** note 时是 slug;asset 时是 media basename(用于 media_refs);broken/external 时是 raw */
  resolved: string;
  /** embed = ![[...]],否则是 [[...]] */
  embed: boolean;
}

export interface RenderResult {
  /** 渲染好的 HTML 片段(放到 .hf-prose 容器里就行) */
  html: string;
  /** 用于全文索引 / 摘要的纯文本 */
  text: string;
  /** 提取出的所有 wikilink/embed 引用,供入库 */
  links: RenderedLink[];
  /** 提取出的所有 heading,供大纲 */
  headings: { level: number; id: string; text: string }[];
  /** 提取出的所有 ^block-id */
  blockIds: string[];
  /** 提取出的所有内联 #tag */
  inlineTags: string[];
}

export interface RenderMarkdownOptions {
  /** 已经去掉 frontmatter 的 markdown 正文 */
  body: string;
  /** wikilink/embed 解析回调 */
  resolveLink: LinkResolver;
  /** 对外部 http(s) URL 收尾用(可选;默认就当做普通链接) */
  classifyExternal?: (url: string) => 'external' | 'internal';
  /** 双主题代码高亮 */
  shikiThemes?: { light: string; dark: string };
}

export interface RenderCanvasOptions {
  /** 原始 .canvas JSON 字符串 */
  json: string;
  /** wikilink resolver(canvas 文本节点里仍可能写 [[link]]) */
  resolveLink: LinkResolver;
  /** 节点正文 markdown 渲染器(注入,避免循环依赖) */
  renderInlineMarkdown: (md: string) => Promise<string>;
}

export interface RenderHtmlOptions {
  /** 原始 HTML 文档 */
  html: string;
  /** 该 HTML 自身在 vault 里的相对路径,用于解析其内部 src/href 相对引用 */
  source_path: string;
  /** vault 索引,用于把 HTML 内的 <img src="附件/x.png"> 改写成已发布的 asset URL */
  index: VaultIndex;
  /** 把 vault 资源转成最终对外 URL */
  toAssetUrl: (asset: VaultAsset) => string;
}
