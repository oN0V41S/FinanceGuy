import config, { withAlpha } from '../../../tailwind.config';

type AlphaColor = (params: { opacityValue?: string }) => string;

describe('tailwind: tokens var() aceitam modificador de opacidade', () => {
  it('withAlpha gera color-mix quando há opacidade e mantém var() puro sem ela', () => {
    const colors = withAlpha({ x: 'var(--x)' });
    const fn = colors.x as AlphaColor;

    expect(fn({})).toBe('var(--x)');
    expect(fn({ opacityValue: '0.3' })).toBe('color-mix(in srgb, var(--x) calc(0.3 * 100%), transparent)');
  });

  it('percorre grupos aninhados e preserva cores que não são var()', () => {
    const colors = withAlpha({ group: { DEFAULT: 'var(--g)' }, fixed: '#787679' });

    expect(typeof (colors.group as Record<string, unknown>).DEFAULT).toBe('function');
    expect(colors.fixed).toBe('#787679');
  });

  it('outline-variant (usado em bordas de cards) suporta /NN no tema real', () => {
    const colors = config.theme?.extend?.colors as Record<string, Record<string, AlphaColor>>;

    expect(colors.outline.variant({ opacityValue: '0.3' })).toContain('var(--outline-variant)');
  });

  it('a cor de borda padrão vem do tema, não do #e5e7eb do preflight', () => {
    const borderColor = config.theme?.extend?.borderColor as Record<string, string>;

    expect(borderColor.DEFAULT).toBe('var(--border)');
  });
});
