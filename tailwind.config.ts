import type { Config } from 'tailwindcss';

type ColorTree = { [key: string]: string | ColorTree };
type AlphaColor = (params: { opacityValue?: string }) => string;
type AlphaColorTree = { [key: string]: AlphaColor | string | AlphaColorTree };

/**
 * Tokens do tema são `var(--x)` com valor hex. O Tailwind v3 não consegue aplicar o
 * modificador de opacidade (`border-outline-variant/30`) a um `var()` opaco: a classe
 * simplesmente NÃO é gerada e a borda cai no padrão do preflight (#e5e7eb → "borda branca").
 * Esta função faz toda cor `var(...)` aceitar `/NN` via `color-mix`.
 */
export function withAlpha(tree: ColorTree): AlphaColorTree {
  const out: AlphaColorTree = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string' && value.startsWith('var(')) {
      out[key] = ({ opacityValue }) =>
        opacityValue === undefined
          ? value
          : `color-mix(in srgb, ${value} calc(${opacityValue} * 100%), transparent)`;
    } else {
      out[key] = typeof value === 'string' ? value : withAlpha(value);
    }
  }
  return out;
}

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Cor de borda padrão do app: nunca deixar cair no #e5e7eb do preflight.
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      colors: withAlpha({
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'on-primary': 'var(--on-primary)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        surface: {
          DEFAULT: 'var(--surface)',
          bright: 'var(--surface-bright)',
          container: 'var(--surface-container)',
          'container-low': 'var(--surface-container-low)',
          'container-high': 'var(--surface-container-high)',
          'container-highest': 'var(--surface-container-highest)',
          'container-lowest': 'var(--surface-container-lowest)',
          dim: 'var(--surface-dim)',
          tint: 'var(--surface-tint)',
          variant: 'var(--surface-variant)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          'on-primary': 'var(--on-primary)',
          'on-container': 'var(--on-primary-container)',
          fixed: 'var(--primary-fixed)',
          'fixed-dim': 'var(--primary-fixed-dim)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
          'on-secondary': 'var(--on-secondary)',
          'on-container': 'var(--on-secondary-container)',
          fixed: 'var(--secondary-fixed)',
          'fixed-dim': 'var(--secondary-fixed-dim)',
        },
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
          'on-tertiary': 'var(--on-tertiary)',
          'on-container': 'var(--on-tertiary-container)',
          fixed: 'var(--tertiary-fixed)',
          'fixed-dim': 'var(--tertiary-fixed-dim)',
        },
        error: {
          DEFAULT: 'var(--error)',
          container: 'var(--error-container)',
          'on-error': 'var(--on-error)',
          'on-container': 'var(--on-error-container)',
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
        inverse: {
          'on-surface': 'var(--inverse-on-surface)',
          primary: 'var(--inverse-primary)',
          surface: 'var(--inverse-surface)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          background: 'var(--brand-background)',
        },
        finance: {
          income: 'var(--finance-income)',
          expense: 'var(--finance-expense)',
          recurring: 'var(--finance-recurring)',
        },
        neutral: {
          DEFAULT: '#787679',
          foreground: '#787679',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
      }),
      borderRadius: {
        DEFAULT: 'var(--radius)',
        'md': '0.375rem',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
export default config;
