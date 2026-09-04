import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import minimal from './templates/minimal.js';
import newspaper from './templates/newspaper.js';
import terminal from './templates/terminal.js';
import magazine from './templates/magazine.js';
import { buildOgCardSvg } from './card-svg.js';
import { encodeOgFallbackPng, isOgSizedPng, OG_HEIGHT, OG_WIDTH } from './png.js';

/**
 * OG renderer — satori + @resvg/resvg-js,纯 JS 输出 PNG。
 *
 * - 4 个模板 → 4 个文件,每个导出 default 函数 (data) => SatoriNode
 * - 字体:从 og/fonts/ 读 Inter/Inter-Bold(Buffer)
 * - satori / 字体缺失时改走 SVG 标题卡 + resvg;再不行则返回 1200×630 纯色 fallback
 *   (绝不能再吐 1x1 空白图,QQ/微信会拒卡)
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

function bundledFontPaths(): string[] {
  return ['Inter-Regular.ttf', 'Inter-Bold.ttf']
    .map((name) => resolve(FONTS_DIR, name))
    .filter((p) => existsSync(p));
}

export async function renderOg(template: OgTemplate, data: OgData): Promise<Buffer> {
  const tmpl = TEMPLATES[template] ?? TEMPLATES.minimal;
  const node = tmpl(data);

  const [satori, Resvg, fonts] = await Promise.all([loadSatori(), loadResvg(), loadFonts()]);

  if (satori && Resvg && fonts.length > 0) {
    try {
      const svg = await satori(node, {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: fonts.map((f) => ({ ...f })),
      });
      const png = Buffer.from(new Resvg(svg).render().asPng());
      if (isOgSizedPng(png)) return png;
    } catch (e) {
      console.warn('[og] satori render failed', (e as Error).message);
    }
  }

  if (Resvg) {
    try {
      const png = Buffer.from(
        new Resvg(buildOgCardSvg(data), {
          font: {
            fontFiles: bundledFontPaths(),
            loadSystemFonts: true,
          },
        }).render().asPng(),
      );
      if (isOgSizedPng(png)) return png;
    } catch (e) {
      console.warn('[og] svg card render failed', (e as Error).message);
    }
  }

  return encodeOgFallbackPng();
}

/** 测试用:模板列表 */
export const OG_TEMPLATES: OgTemplate[] = ['minimal', 'newspaper', 'terminal', 'magazine'];
