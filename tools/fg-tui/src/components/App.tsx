import { useState, type ReactElement } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Board as BoardModel, BoardCard } from '../model/types.js';
import { ActivityFeed } from './ActivityFeed.js';
import { Board, useTerminalWidth } from './Board.js';
import { DetailPanel } from './DetailPanel.js';
import { Footer } from './Footer.js';
import { FindingsList } from './FindingsList.js';
import { GateBanner } from './GateBanner.js';
import { PhaseBar } from './PhaseBar.js';
import { formatAge, minutesSince } from './format.js';

export interface AppProps {
  board: BoardModel;
  activity: string[];
  unstable?: boolean;
  /** Relógio usado em "atualizado há X"; padrão: agora. */
  now?: Date;
  /** Largura do terminal; padrão: a do stdout (ou 80). */
  width?: number;
  /** `false` desliga a captura de teclado (modo `--once`, sem raw mode). */
  interactive?: boolean;
  /** Chamado ao pressionar `q`, antes de encerrar o Ink. */
  onQuit?: () => void;
  /** Chamado ao pressionar `r` (a TUI é somente leitura: apenas pede nova leitura). */
  onReload?: () => void;
}

interface Selection {
  column: number;
  row: number;
}

function initialSelection(board: BoardModel): Selection {
  const running = board.columns.findIndex((column) => column.id === 'running' && column.cards.length > 0);
  if (running >= 0) return { column: running, row: 0 };
  const first = board.columns.findIndex((column) => column.cards.length > 0);
  return { column: Math.max(0, first), row: 0 };
}

function clampSelection(board: BoardModel, selection: Selection): Selection {
  const column = Math.min(Math.max(0, selection.column), Math.max(0, board.columns.length - 1));
  const size = board.columns[column]?.cards.length ?? 0;
  return { column, row: Math.min(Math.max(0, selection.row), Math.max(0, size - 1)) };
}

export function App({
  board,
  activity,
  unstable = false,
  now,
  width,
  interactive = true,
  onQuit,
  onReload,
}: AppProps): ReactElement {
  const { exit } = useApp();
  const terminalWidth = useTerminalWidth(width);
  const [rawSelection, setRawSelection] = useState<Selection>(() => initialSelection(board));
  const [detailOpen, setDetailOpen] = useState(false);

  const selection = clampSelection(board, rawSelection);
  const selectedCard: BoardCard | undefined = board.columns[selection.column]?.cards[selection.row];
  const clock = now ?? new Date();

  useInput(
    (input, key) => {
      if (input === 'q') {
        onQuit?.();
        exit();
      } else if (input === 'r') {
        onReload?.();
      } else if (key.leftArrow || input === 'h') {
        setRawSelection({ column: selection.column - 1, row: selection.row });
      } else if (key.rightArrow || input === 'l') {
        setRawSelection({ column: selection.column + 1, row: selection.row });
      } else if (key.upArrow || input === 'k') {
        setRawSelection({ column: selection.column, row: selection.row - 1 });
      } else if (key.downArrow || input === 'j') {
        setRawSelection({ column: selection.column, row: selection.row + 1 });
      } else if (key.return) {
        if (selectedCard !== undefined) setDetailOpen(true);
      } else if (key.escape) {
        setDetailOpen(false);
      }
    },
    { isActive: interactive },
  );

  const staleCard = board.columns.some((column) => column.cards.some((card) => card.stale));
  const staleMinutes = minutesSince(board.updatedAt, clock);

  return (
    <Box flexDirection="column" width={terminalWidth}>
      <Box flexWrap="wrap" columnGap={2}>
        <Text bold color="cyan" wrap="truncate-end">{`${board.code} · ${board.slug} · ${board.state}`}</Text>
        <Text dimColor>{`atualizado ${formatAge(board.updatedAt, clock)}`}</Text>
        {staleCard && staleMinutes !== null ? (
          <Text color="yellow">{`sem atualização há ${staleMinutes} min`}</Text>
        ) : null}
      </Box>
      <PhaseBar phases={board.phases} />
      {unstable ? <Text color="yellow">leitura instável, mantendo último estado</Text> : null}
      <Box marginTop={1} flexDirection="column">
        <Board board={board} selected={selection} width={terminalWidth} />
      </Box>
      {detailOpen && selectedCard !== undefined ? <DetailPanel card={selectedCard} /> : null}
      <Box marginTop={1} flexDirection="column">
        <ActivityFeed lines={activity} />
      </Box>
      {board.findings.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <FindingsList findings={board.findings} />
        </Box>
      ) : null}
      {board.gate !== null ? (
        <Box marginTop={1}>
          <GateBanner gate={board.gate} />
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Footer />
      </Box>
    </Box>
  );
}
