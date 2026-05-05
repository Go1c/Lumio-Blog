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
 * 顺便补:
 *   - mermaid 启动器
 *   - obsidian 运行时(canvas panzoom + html-embed 自适应高度;<script src="..."> 加载,
 *     缓存友好,只有真用到时才付费)
 *   - callout fold 切换
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
  </script>
  <script>
    // callout 折叠 / 展开
    document.addEventListener('click', function (ev) {
      const head = ev.target instanceof Element ? ev.target.closest('.callout.is-foldable .callout__title') : null;
      if (!head) return;
      const aside = head.closest('.callout');
      if (!aside) return;
      aside.classList.toggle('is-collapsed');
    });
  </script>
  <script defer src="/obsidian-runtime.js"></script>`;
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
