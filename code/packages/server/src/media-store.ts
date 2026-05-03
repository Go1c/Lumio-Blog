import { mkdir, writeFile, readFile, unlink, stat } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * MediaStore — 抽象 media 物理存储。
 *
 * - LocalMediaStore: 写到磁盘 ./data/media/
 * - S3MediaStore   : 写到 S3 / R2,通过 env S3_BUCKET 触发
 *
 * 上层(MediaRepo + routes)只看接口,不关心后端是谁。
 */

export interface MediaStorePutInput {
  /** 已经分配好的稳定 id(sha256 + ext) */
  id: string;
  /** 原始文件名(用于 Content-Disposition) */
  filename: string;
  mime: string;
  body: Buffer;
}

export interface MediaStorePutResult {
  /** 可访问 URL(可以是相对的 /static/media/xxx 或 https://...) */
  url: string;
  bytes: number;
  sha256: string;
}

export interface MediaStore {
  put(input: MediaStorePutInput): Promise<MediaStorePutResult>;
  /** 物理删除。即使源不存在也应静默完成。 */
  delete(id: string): Promise<void>;
  /** 读出原始 bytes(测试 / re-export 用)。如果不存在返回 null。 */
  get(id: string): Promise<Buffer | null>;
  /** URL 拼装:供 routes 在没有 metadata 时也能算出 URL */
  urlFor(id: string): string;
}

// -----------------------------------------------------------------------
// LocalMediaStore — 文件系统
// -----------------------------------------------------------------------

export interface LocalMediaStoreOptions {
  /** 物理目录,绝对路径 */
  rootDir: string;
  /** URL prefix(例如 /static/media) */
  urlPrefix?: string;
}

export class LocalMediaStore implements MediaStore {
  readonly rootDir: string;
  readonly urlPrefix: string;

  constructor(opts: LocalMediaStoreOptions) {
    this.rootDir = resolve(opts.rootDir);
    this.urlPrefix = opts.urlPrefix ?? '/static/media';
  }

  async put(input: MediaStorePutInput): Promise<MediaStorePutResult> {
    const path = this.pathFor(input.id);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);
    const sha256 = createHash('sha256').update(input.body).digest('hex');
    return {
      url: this.urlFor(input.id),
      bytes: input.body.byteLength,
      sha256,
    };
  }

  async delete(id: string): Promise<void> {
    const path = this.pathFor(id);
    if (!existsSync(path)) return;
    try {
      await unlink(path);
    } catch {
      // ignore
    }
  }

  async get(id: string): Promise<Buffer | null> {
    const path = this.pathFor(id);
    if (!existsSync(path)) return null;
    return readFile(path);
  }

  urlFor(id: string): string {
    return `${this.urlPrefix}/${encodeURIComponent(id)}`;
  }

  /** 给 routes / static handler 用,内部不用 */
  pathFor(id: string): string {
    // shard by first 2 hex chars to avoid one giant directory
    const safe = id.replace(/[^A-Za-z0-9._-]/g, '_');
    const shard = safe.slice(0, 2) || '__';
    return join(this.rootDir, shard, safe);
  }

  /** 创建只读 stream,用于备份打包 */
  createReadStream(id: string): NodeJS.ReadableStream | null {
    const path = this.pathFor(id);
    if (!existsSync(path)) return null;
    return createReadStream(path);
  }

  async statBytes(id: string): Promise<number | null> {
    const path = this.pathFor(id);
    if (!existsSync(path)) return null;
    const s = await stat(path);
    return s.size;
  }
}

// -----------------------------------------------------------------------
// S3MediaStore — 走 @aws-sdk/client-s3。仅在 S3_BUCKET env 存在时被实例化。
// 这里用动态 import,避免在没装 sdk 的开发环境强依赖。
// -----------------------------------------------------------------------

export interface S3MediaStoreOptions {
  bucket: string;
  region?: string;
  endpoint?: string;
  /** 公开 URL 前缀(R2 / CloudFront / 自家 CDN)。缺省时拼 path-style 的 endpoint。 */
  publicBaseUrl?: string;
  prefix?: string;
}

interface S3Client {
  send(cmd: unknown): Promise<unknown>;
}

interface S3Module {
  S3Client: new (cfg: Record<string, unknown>) => S3Client;
  PutObjectCommand: new (cfg: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (cfg: Record<string, unknown>) => unknown;
  GetObjectCommand: new (cfg: Record<string, unknown>) => unknown;
}

export class S3MediaStore implements MediaStore {
  readonly bucket: string;
  readonly prefix: string;
  readonly publicBaseUrl: string;
  private clientPromise: Promise<{ client: S3Client; mod: S3Module }> | null = null;
  private opts: S3MediaStoreOptions;

  constructor(opts: S3MediaStoreOptions) {
    this.bucket = opts.bucket;
    this.prefix = opts.prefix ?? 'media/';
    this.publicBaseUrl =
      opts.publicBaseUrl ??
      (opts.endpoint
        ? `${opts.endpoint.replace(/\/$/, '')}/${opts.bucket}`
        : `https://${opts.bucket}.s3.amazonaws.com`);
    this.opts = opts;
  }

  private async client(): Promise<{ client: S3Client; mod: S3Module }> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        // 动态 import,避免在没装 sdk 时导致 server 启动失败
        const mod = (await import('@aws-sdk/client-s3' as string)) as unknown as S3Module;
        const cfg: Record<string, unknown> = {};
        if (this.opts.region) cfg.region = this.opts.region;
        if (this.opts.endpoint) {
          cfg.endpoint = this.opts.endpoint;
          cfg.forcePathStyle = true;
        }
        const client = new mod.S3Client(cfg);
        return { client, mod };
      })();
    }
    return this.clientPromise;
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  async put(input: MediaStorePutInput): Promise<MediaStorePutResult> {
    const { client, mod } = await this.client();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(input.id),
        Body: input.body,
        ContentType: input.mime,
        ContentDisposition: `inline; filename="${encodeURIComponent(input.filename)}"`,
      }),
    );
    const sha256 = createHash('sha256').update(input.body).digest('hex');
    return {
      url: this.urlFor(input.id),
      bytes: input.body.byteLength,
      sha256,
    };
  }

  async delete(id: string): Promise<void> {
    const { client, mod } = await this.client();
    try {
      await client.send(
        new mod.DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(id) }),
      );
    } catch {
      // ignore
    }
  }

  async get(id: string): Promise<Buffer | null> {
    const { client, mod } = await this.client();
    try {
      const r = (await client.send(
        new mod.GetObjectCommand({ Bucket: this.bucket, Key: this.key(id) }),
      )) as { Body?: { transformToByteArray?: () => Promise<Uint8Array> } };
      const body = r.Body;
      if (!body || typeof body.transformToByteArray !== 'function') return null;
      const arr = await body.transformToByteArray();
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }

  urlFor(id: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${this.key(id)}`;
  }
}

// -----------------------------------------------------------------------
// Factory:env 决定具体实现
// -----------------------------------------------------------------------

export interface MediaStoreFactoryOptions {
  /** 默认 ./data/media,被 env OPENNOTE_MEDIA_DIR 覆盖 */
  localRoot: string;
  urlPrefix?: string;
}

export function createMediaStoreFromEnv(opts: MediaStoreFactoryOptions): MediaStore {
  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    const s3Opts: S3MediaStoreOptions = { bucket };
    if (process.env.S3_REGION) s3Opts.region = process.env.S3_REGION;
    if (process.env.S3_ENDPOINT) s3Opts.endpoint = process.env.S3_ENDPOINT;
    if (process.env.S3_PUBLIC_BASE_URL) s3Opts.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
    if (process.env.S3_PREFIX) s3Opts.prefix = process.env.S3_PREFIX;
    return new S3MediaStore(s3Opts);
  }
  const localOpts: LocalMediaStoreOptions = {
    rootDir: process.env.OPENNOTE_MEDIA_DIR ?? opts.localRoot,
  };
  if (opts.urlPrefix) localOpts.urlPrefix = opts.urlPrefix;
  return new LocalMediaStore(localOpts);
}
