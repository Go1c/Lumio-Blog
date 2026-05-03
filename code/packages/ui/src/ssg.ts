/**
 * SSG-only entry point.
 * 不引入 preact / JSX,可在纯 Node 模板渲染场景安全使用。
 */

export {
  publicLayout,
  escHtml,
  type PublicLayoutOpts,
} from './layout/public-layout.js';

export { TOKENS_CSS, PRIMITIVES_CSS, ALL_CSS } from './tokens.css.js';
export { THEME_BOOT_SCRIPT, type ThemeMode } from './theme-boot.js';
