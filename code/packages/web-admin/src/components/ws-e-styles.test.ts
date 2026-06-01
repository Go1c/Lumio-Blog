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

  it('renders dense admin tables as label/value cards on phones', () => {
    expect(WS_E_STYLE).toContain('.ws-e__table td::before');
    expect(WS_E_STYLE).toContain('content: attr(data-label)');
    expect(WS_E_STYLE).toContain('.ws-e__table thead { display: none; }');
    expect(WS_E_STYLE).toContain('grid-template-columns: minmax(72px, 0.38fr) minmax(0, 1fr)');
  });

  it('removes native fieldset chrome from webhook event pickers', () => {
    expect(WS_E_STYLE).toContain('fieldset.ws-e__field');
    expect(WS_E_STYLE).toContain('border: 0');
  });
});
