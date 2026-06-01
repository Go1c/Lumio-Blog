import type { Features, SiteConfig } from '@opennote/core';

function replaceOptional<K extends 'theme' | 'seo' | 'home' | 'auth'>(
  target: SiteConfig,
  source: SiteConfig,
  key: K,
): void {
  const value = source[key];
  if (value === undefined) {
    delete target[key];
  } else {
    target[key] = value;
  }
}

/**
 * Refresh fields used by renderSite while keeping resolved runtime paths stable.
 * The server resolves vault/db/out once on boot; changing those at runtime would
 * desync the watcher and database handles.
 */
export function applyRuntimeConfig(
  target: SiteConfig,
  fresh: SiteConfig,
  features?: Features | null,
): void {
  target.site = fresh.site;
  target.author = fresh.author;
  replaceOptional(target, fresh, 'theme');
  replaceOptional(target, fresh, 'seo');
  replaceOptional(target, fresh, 'home');
  replaceOptional(target, fresh, 'auth');

  if (features) {
    target.features = {
      ...(fresh.features ?? {}),
      comments: features.content.comments,
      newsletter: features.content.newsletter,
      search: features.content.search,
      graph: features.content.graph,
      post_summary: features.content.post_summary,
    };
  } else if (fresh.features === undefined) {
    delete target.features;
  } else {
    target.features = fresh.features;
  }
}
