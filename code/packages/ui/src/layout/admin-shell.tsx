import type { JSX, ComponentChildren } from 'preact';
import { HfIcon, type HfIconName } from '../components/HfIcon.js';
import { Avatar } from '../primitives/Avatar.js';

export interface AdminMenuItem {
  /** 菜单标题 */
  label: string;
  /** 跳转地址,disabled 时可省略 */
  href?: string;
  icon?: HfIconName;
  badge?: string | number;
  disabled?: boolean;
  /** 可选,用于自定义判断高亮(否则按 currentPath 匹配 href) */
  match?: (currentPath: string) => boolean;
}

export interface AdminMenuGroup {
  label: string;
  items: AdminMenuItem[];
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

export interface AdminShellProps {
  /** 当前页面路径,用于高亮(例如 '/notes' 或 '#/notes') */
  currentPath: string;
  /** 面包屑 */
  breadcrumbs?: AdminBreadcrumb[];
  /** 自定义菜单(不传则使用默认 5 分组) */
  menu?: AdminMenuGroup[];
  /** 主体内容 */
  children: ComponentChildren;
  /** 顶栏右侧扩展(例如新建按钮) */
  topbarActions?: ComponentChildren;
  /** 用户菜单内容,点击头像后展开;默认只有头像 */
  userMenu?: ComponentChildren;
  /** 退出登录 */
  onLogout?: () => void;
  /** 触发同步 */
  onSync?: () => void;
  /** 用户头像首字母 */
  userInitials?: string;
  /** 站点名称(显示在 sidebar) */
  siteName?: string;
  /** 搜索框点击 */
  onOpenSearch?: () => void;
}

export const DEFAULT_ADMIN_MENU: AdminMenuGroup[] = [
  {
    label: '概览',
    items: [
      { label: '仪表盘', href: '#/', icon: 'home' },
    ],
  },
  {
    label: '内容',
    items: [
      { label: '文章管理', href: '#/notes', icon: 'note', badge: 28, match: (p) => p.startsWith('#/notes') },
      { label: '专栏管理', href: '#/columns', icon: 'book', badge: 4 },
      { label: '标签管理', href: '#/tags', icon: 'tag', badge: 15 },
      { label: '评论审核', href: '#/comments', icon: 'comment', badge: 6 },
    ],
  },
  {
    label: '运营',
    items: [
      { label: '广告位', href: '#/media', icon: 'image', badge: 3 },
      { label: '数据统计', href: '#/analytics', icon: 'chart' },
      {
        label: '系统设置',
        href: '#/settings',
        icon: 'settings',
        match: (p) => p === '#/settings' || p.startsWith('#/settings/'),
      },
    ],
  },
];

function isActive(item: AdminMenuItem, currentPath: string): boolean {
  if (item.match) return item.match(currentPath);
  if (!item.href) return false;
  return item.href === currentPath;
}

export function AdminShell({
  currentPath,
  breadcrumbs,
  menu = DEFAULT_ADMIN_MENU,
  children,
  topbarActions,
  userMenu,
  onLogout,
  onSync,
  userInitials = 'L',
  siteName = 'Lumio Blog',
  onOpenSearch,
}: AdminShellProps): JSX.Element {
  const pageTitle = currentPath === '#/'
    ? '仪表盘'
    : breadcrumbs && breadcrumbs.length > 0
    ? breadcrumbs[breadcrumbs.length - 1]?.label ?? '仪表盘'
    : '仪表盘';
  const pageSub = currentPath === '#/'
    ? '欢迎回来,这是今天的数据概览'
    : 'Lumio Game Tech Blog 管理后台';

  return (
    <div class="ui-admin">
      <a class="skip-link" href="#main-content">跳到主内容</a>

      <aside class="ui-admin__sidebar" aria-label="后台导航">
        <div class="ui-admin__brand">
          <div class="ui-admin__logo" aria-hidden="true">
            <span class="ui-admin__pix"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="ui-admin__brand-text">
            <div class="ui-admin__brand-name">LUMIO 后台</div>
            <div class="ui-admin__brand-sub">ADMIN CONSOLE</div>
          </div>
        </div>

        {menu.map((group) => (
          <div class="ui-admin__group" key={group.label}>
            <div class="ui-admin__group-label">{group.label}</div>
            <ul class="ui-admin__nav">
              {group.items.map((it) => {
                const active = isActive(it, currentPath);
                if (it.disabled) {
                  return (
                    <li key={it.label}>
                      <span
                        class="ui-admin__nav-item"
                        aria-disabled="true"
                        title="尚未实现"
                      >
                        {it.icon && <HfIcon name={it.icon} size={14} />}
                        <span>{it.label}</span>
                        <span class="ui-admin__badge">soon</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={it.label}>
                    <a
                      class="ui-admin__nav-item"
                      href={it.href ?? '#'}
                      aria-current={active ? 'page' : undefined}
                    >
                      {it.icon && <HfIcon name={it.icon} size={14} />}
                      <span>{it.label}</span>
                      {it.badge !== undefined && <span class="ui-admin__badge">{it.badge}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div class="ui-admin__foot">
          <Avatar initials={userInitials} aria-label="当前用户" size={34} />
          <div>
            <div class="ui-admin__foot-name">林辰</div>
            <div class="ui-admin__foot-role">超级管理员</div>
          </div>
        </div>
      </aside>

      <div class="ui-admin__main">
        <header class="ui-admin__topbar" role="banner">
          <div class="ui-admin__top-title">
            <div class="ui-admin__top-h">{pageTitle}</div>
            <div class="ui-admin__top-sub">{pageSub}</div>
          </div>

          <div class="hf-grow" />

          <button
            type="button"
            class="ui-admin__topbar-search"
            onClick={onOpenSearch}
            aria-label="搜索"
          >
            <HfIcon name="search" size={13} />
            <span class="hf-grow">搜索文章、用户...</span>
          </button>

          {topbarActions}

          <a class="btn-new" href="#/notes" aria-label="写文章">
            <HfIcon name="plus" size={13} /> 写文章
          </a>
        </header>

        <main id="main-content" class="ui-admin__content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
