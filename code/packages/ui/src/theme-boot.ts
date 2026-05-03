/**
 * 主题启动脚本(SSG / 内联使用)
 * 不依赖 preact,可在 SSR / 静态站安全 import。
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * 内联到 <head> 第一段的脚本,在样式应用前同步设 data-theme,避免闪烁。
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
