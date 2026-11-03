import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { Metrics } from '../model/metrics.js';

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

/** Linha de métricas de eficácia (V3): só mostra o que dá para derivar do estado/eventos. */
export function formatMetrics(m: Metrics): string[] {
  const parts = [`${m.done}/${m.total} etapas`];
  if (m.failed > 0) parts.push(`${m.failed} falha${m.failed > 1 ? 's' : ''}`);
  parts.push(`${m.reviewCycles} ciclo${m.reviewCycles === 1 ? '' : 's'} de revisão`);
  if (m.firstTryGreenPct !== null) parts.push(`${m.firstTryGreenPct}% verde de 1ª`);
  if (m.avgStepMs !== null) parts.push(`média ${formatDuration(m.avgStepMs)}/etapa`);
  if (m.wallMs !== null) parts.push(`total ${formatDuration(m.wallMs)}`);
  if (m.parallelPeak > 1) parts.push(`paralelismo ${m.parallelPeak}`);
  return parts;
}

export function MetricsBar({ metrics, ready }: { metrics: Metrics; ready: number[] }): ReactElement | null {
  if (metrics.total === 0) return null;
  return (
    <Box flexDirection="column">
      <Text dimColor wrap="wrap">{`Métricas: ${formatMetrics(metrics).join(' · ')}`}</Text>
      {ready.length > 0 ? <Text color="magenta" wrap="wrap">{`Prontas para rodar em paralelo: etapa${ready.length > 1 ? 's' : ''} ${ready.join(', ')}`}</Text> : null}
    </Box>
  );
}
