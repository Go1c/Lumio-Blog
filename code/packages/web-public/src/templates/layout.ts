import { publicLayout, escHtml as escFromUi, type PublicLayoutOpts } from '@opennote/ui/ssg';
import type { SiteConfig } from '@opennote/core';

export const esc = escFromUi;

export interface LayoutOpts {
  title: string;
  description: string;
  config: SiteConfig;
  body: string;
  noindex?: boolean;
  /** 当前导航 id;如 'home' / 'tags' */
  active?: string;
}

/**
 * 兼容旧调用点的薄壳。把 LayoutOpts 转成 publicLayout 需要的形状,
 * 顺便补一个 mermaid 启动器(原来内联在这里)。
 */
export function layout(o: LayoutOpts): string {
  const extraScripts = `<script type="module">
    if (document.querySelector('.mermaid')) {
      const m = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
      const dark = (document.documentElement.getAttribute('data-theme')==='dark') ||
        (!document.documentElement.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      m.default.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' });
      await m.default.run({ querySelector: '.mermaid' });
    }
  </script>`;
  const opts: PublicLayoutOpts = {
    title: o.title,
    description: o.description,
    config: o.config,
    body: o.body,
    extraScripts,
  };
  if (o.noindex) opts.noindex = true;
  if (o.active) opts.active = o.active;
  return publicLayout(opts);
}
