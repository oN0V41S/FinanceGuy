import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { Finding } from '../model/types.js';

export interface FindingsListProps {
  findings: Finding[];
}

const COLOR: Record<Finding['severity'], string> = {
  critico: 'red',
  alto: 'red',
  medio: 'yellow',
  baixo: 'gray',
  desconhecido: 'gray',
};

const LABEL: Record<Finding['severity'], string> = {
  critico: 'crítico',
  alto: 'alto',
  medio: 'médio',
  baixo: 'baixo',
  desconhecido: 'desconhecido',
};

function location(finding: Finding): string {
  if (finding.file === null) return '';
  return finding.line === null ? `${finding.file} ` : `${finding.file}:${finding.line} `;
}

export function FindingsList({ findings }: FindingsListProps): ReactElement | null {
  if (findings.length === 0) return null;
  return (
    <Box flexDirection="column">
      <Text bold>{`Achados da revisão (${findings.length})`}</Text>
      {findings.map((finding, index) => (
        <Box key={`${index}:${finding.description}`} flexDirection="column">
          <Text wrap="truncate-end">
            <Text color={COLOR[finding.severity]} bold>{`● ${LABEL[finding.severity].toUpperCase()}`}</Text>
            <Text dimColor>{location(finding) === '' ? '' : `  ${location(finding).trimEnd()}`}</Text>
          </Text>
          <Text wrap="wrap">{`  ${finding.description}`}</Text>
        </Box>
      ))}
    </Box>
  );
}
