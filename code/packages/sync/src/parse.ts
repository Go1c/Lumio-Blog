import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import {
  type Frontmatter,
  type ParsedNote,
  frontmatterSchema,
  hashContent,
} from '@opennote/core';

export interface ParseError {
  source_path: string;
  message: string;
}

/**
 * 读单个 .md 文件 → ParsedNote。
 * 不抛错——返回 { note?, error? }，让上层决定怎么处理。
 */
export async function parseFile(
  absPath: string,
  sourcePath: string,
): Promise<{ note?: ParsedNote; error?: ParseError }> {
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

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (e) {
    return {
      error: {
        source_path: sourcePath,
        message: `yaml parse failed: ${(e as Error).message}`,
      },
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
      source_path: sourcePath,
      frontmatter: fmCheck.data as Frontmatter,
      body: parsed.content,
      hash: hashContent(raw),
    },
  };
}
