import { describe, expect, it } from 'vitest';
import { WS_E_STYLE } from './ws-e-styles.js';

describe('WS-E settings responsive CSS', () => {
  it('turns the settings sub-nav into compact horizontal chips on phones', () => {
    expect(WS_E_STYLE).toContain('.ws-e__settings-nav ul');
    expect(WS_E_STYLE).toContain('overflow-x: auto');
    expect(WS_E_STYLE).toContain('grid-template-columns: 1fr');
    expect(WS_E_STYLE).toContain('padding: 14px 16px 88px');
    expect(WS_E_STYLE).toContain('gap: 10px');
  });
});
