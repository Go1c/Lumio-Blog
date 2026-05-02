import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { type SiteConfig, siteConfigSchema } from '@opennote/core';

export async function loadConfig(path: string): Promise<SiteConfig> {
  const raw = await readFile(path, 'utf-8');
  const data = parseYaml(raw);
  const parsed = siteConfigSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`config invalid: ${parsed.error.message}`);
  }
  return parsed.data as SiteConfig;
}
