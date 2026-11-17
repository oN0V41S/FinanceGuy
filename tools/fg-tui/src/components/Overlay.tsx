import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { PALETTE } from './theme.js';

export interface PaletteCommand {
  id: 'detail' | 'reload' | 'help' | 'quit';
  label: string;
  keys: string;
}

export const PALETTE_COMMANDS: readonly PaletteCommand[] = [
  { id: 'detail', label: 'Abrir detalhe da etapa', keys: 'Enter' },
  { id: 'reload', label: 'Recarregar estado', keys: 'r' },
  { id: 'help', label: 'Ajuda de atalhos', keys: '?' },
  { id: 'quit', label: 'Sair', keys: 'q' },
];

const HELP_LINES: readonly string[] = [
  '←/→ ou h/l  muda de coluna',
  '↑/↓ ou k/j  muda de card',
  'Enter       abre o detalhe ao lado do quadro',
  'Esc         fecha painel/ajuda; sem nada aberto, volta ou sai',
  'r           recarrega o estado',
  ':  ou Ctrl+K  paleta de comandos',
  '?           esta ajuda',
  'q           sai',
];

export function HelpPanel(): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={PALETTE.accent} paddingX={1}>
      <Text bold>Ajuda · atalhos</Text>
      {HELP_LINES.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
      <Text dimColor>Esc ou ? fecha.</Text>
    </Box>
  );
}

export function CommandPalette({ selected }: { selected: number }): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={PALETTE.accent} paddingX={1}>
      <Text bold>Paleta de comandos</Text>
      {PALETTE_COMMANDS.map((command, index) => (
        <Text key={command.id} bold={index === selected} color={index === selected ? PALETTE.accent : undefined}>
          {`${index === selected ? '› ' : '  '}${command.label}  [${command.keys}]`}
        </Text>
      ))}
      <Text dimColor>↑/↓ escolhe · Enter executa · Esc fecha</Text>
    </Box>
  );
}
