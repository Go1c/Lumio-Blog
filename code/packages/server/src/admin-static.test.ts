import { describe, expect, it } from 'vitest';
import { rewriteAdminRequestPath } from './admin-static.js';

describe('rewriteAdminRequestPath', () => {
  it('serves the admin SPA for clean deep links while preserving asset paths', () => {
    expect(rewriteAdminRequestPath('/admin/')).toBe('/index.html');
    expect(rewriteAdminRequestPath('/admin/settings')).toBe('/index.html');
    expect(rewriteAdminRequestPath('/admin/settings/site')).toBe('/index.html');
    expect(rewriteAdminRequestPath('/admin/assets/index.js')).toBe('/assets/index.js');
  });
});
