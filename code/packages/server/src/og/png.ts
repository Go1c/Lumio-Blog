import { deflateSync } from 'node:zlib';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * 无依赖的 1200×630 站点 fallback 题图(左色条 + 浅底)。
 * satori / resvg 不可用时仍保证社交爬虫拿到合规尺寸。
 */
export function encodeOgFallbackPng(): Buffer {
  const w = OG_WIDTH;
  const h = OG_HEIGHT;
  const bar = 16;
  const bg = [0xf7, 0xfa, 0xff] as const;
  const accent = [0x7c, 0x8c, 0xff] as const;
  const stride = 1 + w * 3;
  const raw = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const c = x < bar ? accent : bg;
      const i = row + 1 + x * 3;
      raw[i] = c[0];
      raw[i + 1] = c[1];
      raw[i + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 读取 PNG IHDR 宽高;不是合法 PNG 时返回 null。 */
export function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (!buf.subarray(0, 8).equals(PNG_SIG)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function isOgSizedPng(buf: Buffer): boolean {
  const size = pngDimensions(buf);
  return !!size && size.width >= OG_WIDTH && size.height >= OG_HEIGHT;
}
