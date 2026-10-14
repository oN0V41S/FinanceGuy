import { CliError, emptyResult } from '../core/errors';
import type { Command } from '../core/types';

const AUDIT_PATH = '.opencode/AUDIT.md';

interface Route {
  keywords: string[];
  doc: string | null;
  agent: string | null;
}

const clean = (cell: string): string => cell.replace(/`/g, '').trim();
const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const orNull = (value: string): string | null => (value === '' || value.startsWith('—') || value === '-' ? null : value);

/** Lê a routing table de `.opencode/AUDIT.md` (linhas com 3 colunas: palavras-chave | doc | sub-agente). */
export function parseRoutes(markdown: string): Route[] {
  const routes: Route[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|');
    if (cells.length !== 3) continue;
    const [keywordsCell, docCell, agentCell] = cells.map(clean);
    if (/^-+$/.test(keywordsCell.replace(/\s/g, '')) || /palavras-chave/i.test(keywordsCell)) continue;
    const docMatch = docCell.match(/docs\/[\w./-]+|\.opencode\/[\w./-]+/);
    routes.push({
      keywords: keywordsCell.split(/[,/]/).map((k) => normalize(k.trim())).filter(Boolean),
      doc: docMatch ? docMatch[0] : orNull(docCell),
      agent: orNull(agentCell),
    });
  }
  return routes;
}

export const routeCommand: Command = {
  name: 'route',
  summary: 'Doc e sub-agente da routing table para uma tarefa',
  usage: ['fg route componente modal', 'fg route "prisma migration"'],
  async run(args, ctx) {
    const words = args.positionals.flatMap((p) => normalize(p).split(/\s+/)).filter(Boolean);
    if (words.length === 0) {
      throw new CliError('invalid-args', 'Informe palavras-chave da tarefa. Ex.: fg route componente modal.');
    }
    if (!ctx.fs.exists(AUDIT_PATH)) {
      throw new CliError('failed', `Não encontrei ${AUDIT_PATH}.`);
    }

    const scored = parseRoutes(ctx.fs.readFile(AUDIT_PATH))
      .map((route) => ({
        route,
        score: words.filter((w) => route.keywords.some((k) => k === w || k.includes(w))).length,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return emptyResult('route', {
        status: 'failed',
        message: 'Nenhuma área encontrada para essas palavras-chave.',
        nextSteps: [`Consulte a routing table em ${AUDIT_PATH}.`],
      });
    }

    const best = scored[0].route;
    const nextSteps: string[] = [];
    if (best.doc) nextSteps.push(`Leia ${best.doc}`);
    if (best.agent) nextSteps.push(`Invoque o sub-agente ${best.agent}`);

    return emptyResult('route', {
      message: `Área: ${best.keywords.slice(0, 4).join(', ')}…`,
      matches: [`doc=${best.doc ?? '—'}`, `agent=${best.agent ?? '—'}`],
      nextSteps,
    });
  },
};
