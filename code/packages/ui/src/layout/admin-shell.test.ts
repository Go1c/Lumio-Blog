import { describe, expect, it } from 'vitest';
import * as adminShell from './admin-shell.js';

describe('default admin menu', () => {
  it('links to the FNS sync settings page', () => {
    const menu = (adminShell as unknown as { DEFAULT_ADMIN_MENU?: Array<{ items: Array<{ label: string; href?: string; disabled?: boolean }> }> })
      .DEFAULT_ADMIN_MENU;

    const item = menu
      ?.flatMap((group) => group.items)
      .find((entry) => entry.href === '#/settings/fns');

    expect(item).toMatchObject({
      label: 'FNS 同步',
      href: '#/settings/fns',
    });
    expect(item?.disabled).not.toBe(true);
  });
});
