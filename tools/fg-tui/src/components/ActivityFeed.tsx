import type { ReactElement } from 'react';
import { Box, Text } from 'ink';

export interface ActivityFeedProps {
  lines: string[];
}

type Kind = 'heading' | 'bullet' | 'text';

interface FormattedLine {
  kind: Kind;
  text: string;
}

/** Remove marcas de markdown (`#`, `-`, `*`, crases, negrito) e classifica a linha para exibição. */
export function formatActivityLine(line: string): FormattedLine {
  const clean = (value: string): string =>
    value.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]*)`/g, '$1').trim();
  const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
  if (heading) return { kind: 'heading', text: clean(heading[1] ?? '') };
  const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
  if (bullet) return { kind: 'bullet', text: clean(bullet[1] ?? '') };
  return { kind: 'text', text: clean(line) };
}

export function ActivityFeed({ lines }: ActivityFeedProps): ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Atividade</Text>
      {lines.length === 0 ? (
        <Text dimColor>Sem atividade registrada ainda.</Text>
      ) : (
        lines.map((line, index) => {
          const { kind, text } = formatActivityLine(line);
          if (text.length === 0) return null;
          if (kind === 'heading') {
            return (
              <Text key={`${index}:${line}`} wrap="wrap" bold color="cyan">
                {text}
              </Text>
            );
          }
          return (
            <Box key={`${index}:${line}`} paddingLeft={2}>
              {kind === 'bullet' ? <Text>{'• '}</Text> : null}
              <Box flexShrink={1}>
                <Text wrap="wrap">{text}</Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
