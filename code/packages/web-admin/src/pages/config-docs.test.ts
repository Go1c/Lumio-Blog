import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ENV_EXAMPLE,
  ENV_FIELDS,
  FEATURES_EXAMPLE,
  FEATURES_FIELDS,
} from './config-docs.js';

const CONFIGURATION_DOC = readFileSync(new URL('../../../../../doc/CONFIGURATION.md', import.meta.url), 'utf-8');

describe('config docs examples', () => {
  it('documents the implemented OpenNote server environment variables without product-facing CLI copy', () => {
    expect(ENV_EXAMPLE).toContain('OPENNOTE_CONFIG=./config.yaml');
    expect(ENV_EXAMPLE).toContain('OPENNOTE_PASSWORD=…');
    expect(ENV_EXAMPLE).toContain('PORT=3000');
    expect(ENV_EXAMPLE).not.toContain('LUMIO_TOKEN');
    expect(ENV_EXAMPLE).not.toContain('本地 CLI');
    expect(ENV_EXAMPLE).not.toContain('GISCUS_REPO');

    expect(ENV_FIELDS.map((field) => field.name)).toEqual(
      expect.arrayContaining(['OPENNOTE_CONFIG', 'OPENNOTE_PASSWORD', 'PORT']),
    );
  });

  it('does not describe removed automation interfaces in feature flags', () => {
    const legacyCliLabel = ['Blog', 'CLI'].join(' ');
    const removedInterfaceToken = ['m', 'cp'].join('');

    expect(FEATURES_EXAMPLE).toContain('workflow:');
    expect(FEATURES_EXAMPLE).toContain('cli_enabled: true');
    expect(FEATURES_EXAMPLE).toContain('本地预览 / 同步配置');
    expect(FEATURES_EXAMPLE).not.toContain('本地 CLI');
    expect(FEATURES_EXAMPLE).not.toContain('agent:');
    expect(FEATURES_EXAMPLE).not.toContain(legacyCliLabel);
    expect(FEATURES_EXAMPLE).not.toContain(removedInterfaceToken);

    expect(FEATURES_FIELDS.find((field) => field.name === 'workflow.cli_enabled')?.desc).toBe('本地预览 / 同步配置');
    expect(FEATURES_FIELDS.some((field) => field.name.startsWith('agent.'))).toBe(false);
  });

  it('documents only the feed format that is currently generated', () => {
    const rssField = FEATURES_FIELDS.find((field) => field.name === 'content.rss');

    expect(rssField?.desc).toBe('RSS 订阅');
    expect(rssField?.desc).not.toContain('Atom');
    expect(rssField?.desc).not.toContain('JSON Feed');
  });

  it('describes the implemented local comments system instead of legacy Giscus copy', () => {
    const commentsField = FEATURES_FIELDS.find((field) => field.name === 'content.comments');

    expect(FEATURES_EXAMPLE).toContain('comments: true             # 本地评论审核');
    expect(FEATURES_EXAMPLE).not.toContain('Giscus');
    expect(commentsField?.desc).toBe('本地评论审核');
  });

  it('uses the implemented note.* webhook event names in config examples', () => {
    expect(FEATURES_EXAMPLE).toContain('event: "note.published"');
    expect(FEATURES_EXAMPLE).toContain('event: "note.updated"');
    expect(FEATURES_EXAMPLE).not.toContain('event: "post.published"');
    expect(FEATURES_EXAMPLE).not.toContain('event: "post.updated"');

    expect(CONFIGURATION_DOC).toContain('event: "note.published"');
    expect(CONFIGURATION_DOC).toContain('event: "note.updated"');
    expect(CONFIGURATION_DOC).not.toContain('event: "post.published"');
    expect(CONFIGURATION_DOC).not.toContain('event: "post.updated"');
  });

  it('keeps the markdown configuration reference aligned with removed public surfaces', () => {
    expect(CONFIGURATION_DOC).not.toContain('GISCUS_REPO');
    expect(CONFIGURATION_DOC).not.toContain('本地 CLI');
    expect(CONFIGURATION_DOC).toContain('OPENNOTE_CONFIG=./config.yaml');
    expect(CONFIGURATION_DOC).toContain('cli_enabled: true          # 本地预览 / 同步配置');
  });
});
