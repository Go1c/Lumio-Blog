import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import {
  type Frontmatter,
  type ParsedNote,
  type NoteKind,
  frontmatterSchema,
  hashContent,
} from '@opennote/core';

export interface ParseError {
  source_path: string;
  message: string;
}

/**
 * 读单个 .md / .canvas / .html 文件 → ParsedNote。
 *
 * - .md      gray-matter 抽 frontmatter
 * - .canvas  纯 JSON;无 frontmatter,title 用文件名
 * - .html    支持 <!-- frontmatter --> HTML 注释 yaml,或纯文档当 body
 *
 * 不抛错——返回 { note?, error? },让上层决定怎么处理。
 */
export async function parseFile(
  absPath: string,
  sourcePath: string,
): Promise<{ note?: ParsedNote & { kind: NoteKind }; error?: ParseError }> {
  let raw: string;
  try {
    raw = await readFile(absPath, 'utf-8');
  } catch (e) {
    return {
      error: {
        source_path: sourcePath,
        message: `read failed: ${(e as Error).message}`,
      },
    };
  }

  const lower = sourcePath.toLowerCase();
  let kind: NoteKind = 'markdown';
  if (lower.endsWith('.canvas')) kind = 'canvas';
  else if (lower.endsWith('.html') || lower.endsWith('.htm')) kind = 'html';

  if (kind === 'markdown') {
    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(raw);
    } catch (e) {
      return {
        error: { source_path: sourcePath, message: `yaml parse failed: ${(e as Error).message}` },
      };
    }

    const fmCheck = frontmatterSchema.safeParse(parsed.data);
    if (!fmCheck.success) {
      return {
        error: {
          source_path: sourcePath,
          message: `frontmatter schema invalid: ${fmCheck.error.message}`,
        },
      };
    }

    return {
      note: {
        kind,
        source_path: sourcePath,
        frontmatter: fmCheck.data as Frontmatter,
        body: parsed.content,
        hash: hashContent(raw),
      },
    };
  }

  if (kind === 'canvas') {
    // canvas 没有 frontmatter,直接验证是合法 JSON
    try { JSON.parse(raw); }
    catch (e) {
      return { error: { source_path: sourcePath, message: `canvas json invalid: ${(e as Error).message}` } };
    }
    return {
      note: {
        kind,
        source_path: sourcePath,
        frontmatter: {} as Frontmatter,
        body: raw,
        hash: hashContent(raw),
      },
    };
  }

  // html: 找 <!-- opennote: yaml ---\n...---\n -->? 简化:不支持;直接走 body
  return {
    note: {
      kind,
      source_path: sourcePath,
      frontmatter: {} as Frontmatter,
      body: raw,
      hash: hashContent(raw),
    },
  };
}
