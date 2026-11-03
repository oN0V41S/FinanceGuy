import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { eventsForStep, type PipelineEvent } from '../model/events.js';
import type { BoardCard } from '../model/types.js';
import { STATUS_COLOR, STATUS_LABEL } from './format.js';

export interface DetailPanelProps {
  card: BoardCard;
  events?: PipelineEvent[];
}

const MAX_EVENTS = 12;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total} s`;
  const min = Math.floor(total / 60);
  if (min < 60) return `${min} min ${total % 60} s`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** Primeiro `step_started` até `step_done|step_failed`; `null` se faltar uma das pontas. */
function stepDuration(stepEvents: readonly PipelineEvent[]): string | null {
  const start = stepEvents.find((e) => e.type === 'step_started');
  const end = stepEvents.find((e) => e.type === 'step_done' || e.type === 'step_failed');
  if (start === undefined || end === undefined) return null;
  return formatDuration(Date.parse(end.ts) - Date.parse(start.ts));
}

function hora(ts: string): string {
  const m = /T(\d{2}:\d{2}:\d{2})/.exec(ts);
  return m?.[1] ?? ts;
}

function fileOf(e: PipelineEvent): string {
  const path = e.data?.['path'] ?? e.data?.['file'];
  return typeof path === 'string' && path !== '' ? path : e.message;
}

export function DetailPanel({ card, events = [] }: DetailPanelProps): ReactElement {
  const stepEvents = eventsForStep(events, card.index);
  const duration = stepDuration(stepEvents);
  const files = [...new Set(stepEvents.filter((e) => e.type === 'file_changed').map(fileOf))];
  const findings = stepEvents.filter((e) => e.type === 'finding');
  const recent = stepEvents.slice(-MAX_EVENTS);

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
      <Text>{`Duração: ${duration ?? '—'}`}</Text>
      {stepEvents.length === 0 ? (
        <Text dimColor>Sem eventos registrados para esta etapa.</Text>
      ) : (
        <Box flexDirection="column">
          <Text bold>{`Eventos (últimos ${recent.length})`}</Text>
          {recent.map((e, i) => (
            <Text key={`${e.ts}-${i}`} wrap="wrap">{`${hora(e.ts)} ${e.type} ${e.message}`}</Text>
          ))}
          {files.length > 0 ? (
            <Box flexDirection="column">
              <Text bold>{`Arquivos alterados (${files.length})`}</Text>
              {files.map((f) => (
                <Text key={f} wrap="wrap">{`• ${f}`}</Text>
              ))}
            </Box>
          ) : null}
          {findings.length > 0 ? (
            <Box flexDirection="column">
              <Text bold color="red">{`Achados (${findings.length})`}</Text>
              {findings.map((f, i) => (
                <Text key={`${f.ts}-${i}`} wrap="wrap">{`• ${f.message}`}</Text>
              ))}
            </Box>
          ) : null}
        </Box>
      )}
      <Text dimColor>Esc fecha o detalhe.</Text>
    </Box>
  );
}
