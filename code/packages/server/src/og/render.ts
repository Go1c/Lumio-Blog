import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import minimal from './templates/minimal.js';
import newspaper from './templates/newspaper.js';
import terminal from './templates/terminal.js';
import magazine from './templates/magazine.js';

/**
 * OG renderer — satori + @resvg/resvg-js,纯 JS 输出 PNG。
 *
 * - 4 个模板 → 4 个 .tsx 文件,每个导出 default 函数 (data) => SatoriNode
 * - 字体:从 og/fonts/ 读 Inter/Inter-Bold(Buffer)
 *   - 没字体时用 satori 报错,降级:返回 1x1 transparent PNG(避免阻塞 build)
 * - satori 也是动态 import,没装时返回 fallback
 */

export type OgTemplate = 'minimal' | 'newspaper' | 'terminal' | 'magazine';

export interface OgData {
  title: string;
  description?: string;
  tag?: string;
  date?: string;
  reading?: string;
  site?: string;
  author?: string;
}

const TEMPLATES: Record<OgTemplate, (d: OgData) => unknown> = {
  minimal,
  newspaper,
  terminal,
  magazine,
};

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(HERE, 'fonts');

let fontsCache: { data: Buffer; weight: 400 | 700; name: string; style: 'normal' }[] | null = null;

async function loadFonts(): Promise<{ data: Buffer; weight: 400 | 700; name: string; style: 'normal' }[]> {
  if (fontsCache) return fontsCache;
  const out: { data: Buffer; weight: 400 | 700; name: string; style: 'normal' }[] = [];
  const candidates: Array<[string, 400 | 700]> = [
    ['Inter-Regular.ttf', 400],
    ['Inter-Bold.ttf', 700],
  ];
  for (const [name, weight] of candidates) {
    const p = resolve(FONTS_DIR, name);
    if (existsSync(p)) {
      out.push({ data: await readFile(p), weight, name: 'Inter', style: 'normal' });
    }
  }
  fontsCache = out;
  return out;
}

interface SatoriOpts {
  width: number;
  height: number;
  fonts: Array<{ data: Buffer; weight: number; name: string; style: string }>;
}

type SatoriFn = (node: unknown, opts: SatoriOpts) => Promise<string>;
type ResvgCtor = new (svg: string, opts?: unknown) => { render(): { asPng(): Uint8Array } };

async function loadSatori(): Promise<SatoriFn | null> {
  try {
    const m = (await import('satori' as string)) as { default: SatoriFn };
    return m.default;
  } catch {
    return null;
  }
}

async function loadResvg(): Promise<ResvgCtor | null> {
  try {
    const m = (await import('@resvg/resvg-js' as string)) as { Resvg: ResvgCtor };
    return m.Resvg;
  } catch {
    return null;
  }
}

/** 1x1 transparent PNG (88 bytes) — fallback when satori / resvg / fonts 不可用 */
const FALLBACK_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d49444154789c63000100000005000100' +
    '0d0a2db40000000049454e44ae426082',
  'hex',
);

export async function renderOg(template: OgTemplate, data: OgData): Promise<Buffer> {
  const tmpl = TEMPLATES[template] ?? TEMPLATES.minimal;
  const node = tmpl(data);

  const [satori, Resvg, fonts] = await Promise.all([loadSatori(), loadResvg(), loadFonts()]);
  if (!satori || !Resvg || fonts.length === 0) {
    // 降级:不报错,但调用方应记录 warn
    return FALLBACK_PNG;
  }

  try {
    const svg = await satori(node, {
      width: 1200,
      height: 630,
      fonts: fonts.map((f) => ({ ...f })),
    });
    const r = new Resvg(svg);
    const png = r.render().asPng();
    return Buffer.from(png);
  } catch (e) {
    // satori 失败时打印一次警告,但继续返回 fallback —— 不挂主流程
    console.warn('[og] render failed', (e as Error).message);
    return FALLBACK_PNG;
  }
}

/** 测试用:模板列表 */
export const OG_TEMPLATES: OgTemplate[] = ['minimal', 'newspaper', 'terminal', 'magazine'];
