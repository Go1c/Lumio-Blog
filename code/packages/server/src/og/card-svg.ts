export interface OgCardInput {
  title: string;
  description?: string;
  tag?: string;
  date?: string;
  reading?: string;
  site?: string;
  author?: string;
}

const FONT =
  "'Noto Sans SC', 'Noto Sans CJK SC', 'PingFang SC', 'Hiragino Sans GB', Inter, sans-serif";

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function charWidth(ch: string): number {
  return /[\u0000-\u00ff]/.test(ch) ? 0.62 : 1;
}

function wrapTitle(title: string, maxEm: number, maxLines: number): string[] {
  const chars = [...title];
  const lines: string[] = [];
  let current = '';
  let width = 0;
  for (const ch of chars) {
    const w = charWidth(ch);
    if (current && width + w > maxEm) {
      lines.push(current);
      if (lines.length === maxLines) break;
      current = ch;
      width = w;
    } else {
      current += ch;
      width += w;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  const consumed = lines.reduce((n, line) => n + [...line].length, 0);
  if (consumed < chars.length && lines.length) {
    const last = [...lines[lines.length - 1]!];
    last[Math.max(0, last.length - 1)] = '…';
    lines[lines.length - 1] = last.join('');
  }
  return lines;
}

/** 1200×630 标题卡 SVG,交给 resvg 栅格化。 */
export function buildOgCardSvg(data: OgCardInput): string {
  const site = escXml(data.site ?? 'lumio.games');
  const author = escXml(data.author ?? 'Lumio');
  const date = escXml(data.date ?? '');
  const reading = escXml(data.reading ?? '');
  const titleLines = wrapTitle((data.title || 'Untitled').trim(), 18, 3).map(escXml);
  const titleTspans = titleLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 68}">${line}</tspan>`)
    .join('');
  const meta = [author, date, reading].filter(Boolean).join('  ·  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F7FAFF"/>
  <rect width="16" height="630" fill="#7C8CFF"/>
  <text x="80" y="92" font-size="22" font-weight="600" fill="#6B7894" font-family="${FONT}" letter-spacing="0.12em">LUMIO.GAMES</text>
  <text x="80" y="128" font-size="18" fill="#9AA6BE" font-family="${FONT}">${site}</text>
  <text x="80" y="280" font-size="56" font-weight="700" fill="#1E2A3A" font-family="${FONT}">${titleTspans}</text>
  <rect x="80" y="470" width="72" height="6" rx="3" fill="#7C8CFF"/>
  <text x="80" y="530" font-size="24" fill="#6B7894" font-family="${FONT}">${escXml(meta)}</text>
</svg>`;
}
