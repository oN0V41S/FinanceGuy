import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { BoardCard } from '../model/types.js';
import { STATUS_COLOR, STATUS_LABEL } from './format.js';

export interface DetailPanelProps {
  card: BoardCard;
}

export function DetailPanel({ card }: DetailPanelProps): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold>{`Etapa ${card.index} · ${card.agent}`}</Text>
      <Text>
        {'Status: '}
        <Text color={STATUS_COLOR[card.status]}>{STATUS_LABEL[card.status]}</Text>
        {card.stale ? <Text color="yellow">{' (sem atualização há mais de 5 min)'}</Text> : null}
      </Text>
      <Text>{`Agente: ${card.agent}`}</Text>
      <Text>{`Modelo: ${card.model ?? '—'}`}</Text>
      <Text>{`Sessão: ${card.sessionShort ?? '—'}`}</Text>
      <Text>{`Commit: ${card.commitShort ?? '—'}`}</Text>
      <Text dimColor>Esc fecha o detalhe.</Text>
    </Box>
  );
}
