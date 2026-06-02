import { describe, expect, it } from 'vitest';
import { DEFAULT_ADMIN_MENU } from './admin-shell.js';

function findMenuItem(href: string) {
  return DEFAULT_ADMIN_MENU
    .flatMap((group) => group.items)
    .find((entry) => entry.href === href);
}

describe('default admin menu', () => {
  it('links to the general settings page', () => {
    const item = findMenuItem('#/settings');

    expect(item).toMatchObject({
      label: '系统设置',
      href: '#/settings',
    });
    expect(item?.disabled).not.toBe(true);
  });

  it('does not have a top-level FNS sync sidebar item (FNS lives inside settings)', () => {
    const item = findMenuItem('#/settings/fns');
    expect(item).toBeUndefined();
  });
});
