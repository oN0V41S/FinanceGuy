import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
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
      },
      borderRadius: {
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
