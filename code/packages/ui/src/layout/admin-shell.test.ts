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
      label: '设置',
      href: '#/settings',
    });
    expect(item?.disabled).not.toBe(true);
  });

  it('links to the FNS sync settings page', () => {
    const item = findMenuItem('#/settings/fns');

    expect(item).toMatchObject({
      label: 'FNS 同步',
      href: '#/settings/fns',
    });
    expect(item?.disabled).not.toBe(true);
  });
});
