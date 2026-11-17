import { defaultTheme, extendTheme } from '@inkjs/ui';

/** Cores semânticas únicas da TUI (tokens do Ink, sem hex: degradam em terminais sem cor). */
export const PALETTE = {
  accent: 'cyan',
  warn: 'yellow',
  danger: 'red',
  ok: 'green',
  muted: 'gray',
  blocked: 'magenta',
} as const;

/** Tema do `@inkjs/ui`: barra de progresso e badges seguem a mesma paleta. */
export const tuiTheme = extendTheme(defaultTheme, {
  components: {
    ProgressBar: {
      styles: {
        completed: () => ({ color: PALETTE.ok }),
        remaining: () => ({ dimColor: true }),
      },
    },
  },
});
