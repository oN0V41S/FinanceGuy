import type { ReactElement } from 'react';
import { Box, Text } from 'ink';

export const SHORTCUTS: readonly string[] = [
  '←/→ coluna',
  '↑/↓ card',
  'Enter detalhe',
  'Esc voltar',
  'r recarregar',
  'q sair',
];

export const FOOTER_TEXT = SHORTCUTS.join(' · ');

/** Rodapé fixo de atalhos; quebra entre atalhos (nunca no meio de um) em terminais estreitos. */
export function Footer(): ReactElement {
  return (
    <Box flexWrap="wrap" columnGap={1}>
      {SHORTCUTS.map((shortcut, index) => (
        <Text key={shortcut} color="gray" wrap="truncate-end">
          {index < SHORTCUTS.length - 1 ? `${shortcut} ·` : shortcut}
        </Text>
      ))}
    </Box>
  );
}
