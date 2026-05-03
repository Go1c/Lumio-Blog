import type { JSX, ComponentChildren } from 'preact';
import { HfIcon, type HfIconName } from '../components/HfIcon.js';
import { useTheme } from '../hooks/useTheme.js';
import { Button } from '../primitives/Button.js';
import { Avatar } from '../primitives/Avatar.js';

export interface AdminMenuItem {
  /** 菜单标题 */
  label: string;
  /** 跳转地址,disabled 时可省略 */
  href?: string;
  icon?: HfIconName;
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

const DEFAULT_MENU: AdminMenuGroup[] = [
  {
    label: '仪表盘',
    items: [
      { label: '概览', icon: 'home', disabled: true },
    ],
  },
  {
    label: '内容',
    items: [
      { label: '笔记', href: '#/', icon: 'note', match: (p) => p === '#/' || p === '' || p.startsWith('#/notes') },
      { label: '标签', icon: 'tag', disabled: true },
      { label: '媒体', icon: 'image', disabled: true },
    ],
  },
  {
    label: '互动',
    items: [
      { label: '评论', icon: 'comment', disabled: true },
      { label: '订阅', icon: 'mail', disabled: true },
    ],
  },
  {
    label: '分析',
    items: [
      { label: '文章数据', icon: 'chart', disabled: true },
    ],
  },
  {
    label: '设置',
    items: [
      { label: '站点', icon: 'settings', disabled: true },
      { label: '外观', icon: 'star', disabled: true },
      { label: 'SEO', icon: 'search', disabled: true },
      { label: 'Tokens', href: '#/tokens', icon: 'lock' },
      { label: 'Webhooks', href: '#/webhooks', icon: 'webhook' },
      { label: '备份', icon: 'database', disabled: true },
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
  menu = DEFAULT_MENU,
  children,
  topbarActions,
  userMenu,
  onLogout,
  onSync,
  userInitials = 'L',
  siteName = 'opennote',
  onOpenSearch,
}: AdminShellProps): JSX.Element {
  const { effective, toggle } = useTheme();

  return (
    <div class="ui-admin">
      <a class="skip-link" href="#main-content">跳到主内容</a>

      <aside class="ui-admin__sidebar" aria-label="后台导航">
        <div class="ui-admin__brand">
          <div class="ui-admin__logo" aria-hidden="true">L</div>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>
            {siteName}
            <span class="hf-mono hf-tiny hf-faint" style={{ marginLeft: '4px' }}>admin</span>
          </div>
        </div>

        {menu.map((group) => (
          <div key={group.label}>
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
                        <span class="hf-mono hf-tiny hf-faint" style={{ marginLeft: 'auto' }}>soon</span>
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
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      <div class="ui-admin__main">
        <header class="ui-admin__topbar" role="banner">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav class="ui-admin__crumbs" aria-label="面包屑">
              {breadcrumbs.map((c, i) => (
                <span key={i}>
                  {i > 0 && <span aria-hidden="true"> / </span>}
                  {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
                </span>
              ))}
            </nav>
          ) : (
            <span class="ui-admin__crumbs">{siteName}</span>
          )}

          <div class="hf-grow" />

          {onOpenSearch && (
            <button
              type="button"
              class="ui-admin__topbar-search"
              onClick={onOpenSearch}
              aria-label="搜索 (⌘K)"
              aria-keyshortcuts="Meta+K Control+K"
            >
              <HfIcon name="search" size={13} />
              <span class="hf-grow">搜索…</span>
              <span class="ui-kbd" aria-hidden="true">⌘K</span>
            </button>
          )}

          {onSync && (
            <Button size="sm" onClick={onSync} aria-label="同步内容">
              <HfIcon name="sync" size={12} /> 同步
            </Button>
          )}

          {topbarActions}

          <Button
            size="icon"
            onClick={toggle}
            aria-label={effective === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            <HfIcon name={effective === 'dark' ? 'sun' : 'moon'} size={14} />
          </Button>

          {userMenu ?? (
            <Avatar
              initials={userInitials}
              aria-label="当前用户"
              size={28}
            />
          )}

          {onLogout && (
            <Button size="sm" variant="ghost" onClick={onLogout} aria-label="退出登录">
              退出
            </Button>
          )}
        </header>

        <main id="main-content" class="ui-admin__content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
