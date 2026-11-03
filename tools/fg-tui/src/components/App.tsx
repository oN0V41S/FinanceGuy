import { useState, type ReactElement } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { PipelineEvent } from '../model/events.js';
import type { Board as BoardModel, BoardCard } from '../model/types.js';
import { ActivityFeed } from './ActivityFeed.js';
import { Board, useTerminalWidth } from './Board.js';
import { DetailPanel } from './DetailPanel.js';
import { Footer } from './Footer.js';
import { FindingsList } from './FindingsList.js';
import { GateBanner } from './GateBanner.js';
import { MetricsBar } from './MetricsBar.js';
import { PhaseBar } from './PhaseBar.js';
import { CommandPalette, HelpPanel, PALETTE_COMMANDS } from './Overlay.js';
import { formatAge, minutesSince } from './format.js';

export interface AppProps {
  board: BoardModel;
  activity: string[];
  unstable?: boolean;
  /** Eventos da pipeline (events.jsonl) para o detalhe do card. */
  events?: PipelineEvent[];
  /** Relógio usado em "atualizado há X"; padrão: agora. */
  now?: Date;
  /** Largura do terminal; padrão: a do stdout (ou 80). */
  width?: number;
  /** `false` desliga a captura de teclado (modo `--once`, sem raw mode). */
  interactive?: boolean;
  /** Chamado ao pressionar `q`, antes de encerrar o Ink. */
  onQuit?: () => void;
  /** Esc sem detalhe aberto: volta (ex.: à aba "Todas"). Sem isso, Esc encerra a TUI. */
  onBack?: () => void;
  /** Chamado ao pressionar `r` (a TUI é somente leitura: apenas pede nova leitura). */
  onReload?: () => void;
}

/** A partir desta largura o detalhe abre ao lado do quadro; abaixo, empilhado. */
export const SIDE_PANEL_MIN_WIDTH = 110;
const SIDE_PANEL_WIDTH = 42;
const ACTIVITY_MAX = 6;
const FINDINGS_MAX = 3;

type OverlayKind = 'none' | 'help' | 'palette';

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
  events,
  now,
  width,
  interactive = true,
  onQuit,
  onBack,
  onReload,
}: AppProps): ReactElement {
  const { exit } = useApp();
  const terminalWidth = useTerminalWidth(width);
  const [rawSelection, setRawSelection] = useState<Selection>(() => initialSelection(board));
  const [detailOpen, setDetailOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlayKind>('none');
  const [paletteRow, setPaletteRow] = useState(0);

  const selection = clampSelection(board, rawSelection);
  const selectedCard: BoardCard | undefined = board.columns[selection.column]?.cards[selection.row];
  const clock = now ?? new Date();

  const quit = (): void => {
    onQuit?.();
    exit();
  };
  const openDetail = (): void => {
    if (selectedCard !== undefined) setDetailOpen(true);
  };

  useInput(
    (input, key) => {
      if (overlay === 'palette') {
        if (key.escape) setOverlay('none');
        else if (key.upArrow || input === 'k') setPaletteRow((r) => Math.max(0, r - 1));
        else if (key.downArrow || input === 'j') setPaletteRow((r) => Math.min(PALETTE_COMMANDS.length - 1, r + 1));
        else if (key.return) {
          const command = PALETTE_COMMANDS[paletteRow]?.id;
          setOverlay('none');
          if (command === 'detail') openDetail();
          else if (command === 'reload') onReload?.();
          else if (command === 'help') setOverlay('help');
          else if (command === 'quit') quit();
        }
        return;
      }
      if (overlay === 'help') {
        if (key.escape || input === '?') setOverlay('none');
        else if (input === 'q') quit();
        return;
      }
      if (input === 'q') {
        quit();
      } else if (input === '?') {
        setOverlay('help');
      } else if (input === ':' || (key.ctrl && input === 'k')) {
        setPaletteRow(0);
        setOverlay('palette');
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
        openDetail();
      } else if (key.escape) {
        if (detailOpen) {
          setDetailOpen(false);
        } else if (onBack !== undefined) {
          onBack();
        } else {
          quit();
        }
      }
    },
    { isActive: interactive },
  );

  const staleCard = board.columns.some((column) => column.cards.some((card) => card.stale));
  const staleMinutes = minutesSince(board.updatedAt, clock);
  const sideDetail = detailOpen && selectedCard !== undefined && terminalWidth >= SIDE_PANEL_MIN_WIDTH;
  const boardWidth = sideDetail ? terminalWidth - SIDE_PANEL_WIDTH - 1 : terminalWidth;
  const shownActivity = activity.slice(-ACTIVITY_MAX);
  const hiddenActivity = activity.length - shownActivity.length;
  const shownFindings = board.findings.slice(0, FINDINGS_MAX);
  const hiddenFindings = board.findings.length - shownFindings.length;

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
      <MetricsBar metrics={board.metrics} ready={board.ready} />
      {board.dagCycle ? <Text color="yellow">dependências (dependsOn) formam um ciclo: ordem ambígua</Text> : null}
      {unstable ? <Text color="yellow">leitura instável, mantendo último estado</Text> : null}
      <Box marginTop={1} flexDirection="column">
        <ActivityFeed lines={shownActivity} />
        {hiddenActivity > 0 ? <Text dimColor>{`… +${hiddenActivity} linhas anteriores`}</Text> : null}
      </Box>
      {board.findings.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <FindingsList findings={shownFindings} />
          {hiddenFindings > 0 ? <Text dimColor>{`… +${hiddenFindings} achados`}</Text> : null}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Box flexDirection="column" width={boardWidth}>
          <Board board={board} selected={selection} width={boardWidth} />
        </Box>
        {sideDetail && selectedCard !== undefined ? (
          <Box flexDirection="column" width={SIDE_PANEL_WIDTH} marginLeft={1}>
            <DetailPanel card={selectedCard} events={events} />
          </Box>
        ) : null}
      </Box>
      {detailOpen && selectedCard !== undefined && !sideDetail ? <DetailPanel card={selectedCard} events={events} /> : null}
      {overlay === 'help' ? <HelpPanel /> : null}
      {overlay === 'palette' ? <CommandPalette selected={paletteRow} /> : null}
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
