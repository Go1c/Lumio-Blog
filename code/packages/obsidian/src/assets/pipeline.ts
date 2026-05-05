import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { VaultAsset } from '../types.js';
import { mimeOfAsset } from './resolver.js';

/**
 * AssetPipeline — 把 vault 内被引用到的附件复制到 out/_attachments/。
 *
 * 内容寻址(content-addressed):
 *   <stem>.<sha256-12>.<ext>  例如  "Pasted image 20260326.f0c1b3a8.png"
 *
 * 同 sha 的不同来源 → 复用一份;不同 sha 的同名 → 各自一份(hash 不同)。
 * 这避免:
 *   1. 用户一改图就要 cache-bust(URL 变了);
 *   2. 同名附件覆盖踩坑;
 *   3. URL 暴露 vault 内部目录。
 */

export interface AssetPipelineOptions {
  /** out 根目录,例如 vault/.opennote/out */
  outRoot: string;
  /** 资源相对 outRoot 的子目录,默认 _attachments */
  subdir?: string;
  /** 对外 URL 前缀,默认 /_attachments */
  urlPrefix?: string;
}

export interface PublishedAsset {
  /** 原始 vault 资源 */
  asset: VaultAsset;
  /** out 内的相对路径(用于 disk 写入) */
  out_path: string;
  /** 对外 URL */
  url: string;
  /** 内容 sha256 前 12 位 */
  hash: string;
  bytes: number;
  mime: string;
  /** 用户友好的展示名(原 basename,保留中文等字符) */
  filename: string;
}

export class AssetPipeline {
  private outRoot: string;
  private subdir: string;
  private urlPrefix: string;
  /** sha → published(避免重复 copy) */
  private bySha = new Map<string, PublishedAsset>();
  /** vault source_path → published(不同 source 但 sha 相同会指向同一 published) */
  private byPath = new Map<string, PublishedAsset>();

  constructor(opts: AssetPipelineOptions) {
    this.outRoot = opts.outRoot;
    this.subdir = (opts.subdir ?? '_attachments').replace(/^\/+|\/+$/g, '');
    this.urlPrefix = (opts.urlPrefix ?? '/_attachments').replace(/\/+$/, '');
  }

  /**
   * 注册并复制一个 vault 资源到 out/。返回最终发布信息。
   * 同一 source_path 调多次只 copy 一次。
   */
  async publish(asset: VaultAsset): Promise<PublishedAsset> {
    const cached = this.byPath.get(asset.source_path);
    if (cached) return cached;

    const hash = await sha256File(asset.abs_path);
    const short = hash.slice(0, 12);

    const cachedBySha = this.bySha.get(hash);
    if (cachedBySha) {
      this.byPath.set(asset.source_path, cachedBySha);
      return cachedBySha;
    }

    const stem = sanitizeStem(asset.stem);
    const ext = asset.ext.toLowerCase();
    const outName = `${stem}.${short}${ext}`;
    const outPath = join(this.subdir, outName);
    const url = `${this.urlPrefix}/${encodeURIComponent(outName)}`;

    const dst = join(this.outRoot, outPath);
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(asset.abs_path, dst);
    const s = await stat(dst);

    const published: PublishedAsset = {
      asset,
      out_path: outPath,
      url,
      hash: short,
      bytes: s.size,
      mime: mimeOfAsset(asset),
      filename: asset.basename,
    };
    this.bySha.set(hash, published);
    this.byPath.set(asset.source_path, published);
    return published;
  }

  /** 不复制,仅查 cache。给 inline 渲染时用(走过一次 publish 后) */
  lookup(asset: VaultAsset): PublishedAsset | null {
    return this.byPath.get(asset.source_path) ?? null;
  }

  /** 全部已发布资源(供日志 / 清理) */
  all(): PublishedAsset[] {
    return Array.from(new Set(this.byPath.values()));
  }
}

/** filename 安全化:保留中文 / 字母 / 数字 / `-_`,其它字符替换为 `_` */
function sanitizeStem(stem: string): string {
  // 防御:某些 OS 上别让 stem 含 `/` `\`
  const safe = stem
    .replace(/[\/\\:*?"<>|]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return safe || 'asset';
}

async function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export { extname as _ext, basename as _base }; // 给上层 helper 用
