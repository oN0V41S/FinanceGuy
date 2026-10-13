import { CliError } from '../../core/errors';
import { applyCreatePlan, type PlannedFile } from '../../core/plan';
import { normalizeRepoPath } from '../../core/guards';
import type { Command } from '../../core/types';
import {
  apiPiece,
  componentPiece,
  containerSnippet,
  hookPiece,
  pagePiece,
  repositoryPiece,
  servicePiece,
  testPiece,
  toNames,
  validationsPiece,
} from './templates';

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const HOOK = /^use[A-Z][A-Za-z0-9]*$/;
const ROUTE = /^[a-z][a-z0-9-]*(\/[a-z0-9[\]-]+)*$/;

const KINDS = ['feature', 'component', 'hook', 'api-route', 'page', 'service', 'repository', 'test'] as const;

function requireKebab(value: string | undefined, label: string): string {
  if (!value || !KEBAB.test(value)) {
    throw new CliError('invalid-args', `${label} inválido: "${value ?? ''}". Use kebab-case, ex.: wallet-card.`);
  }
  return value;
}

function requirePascal(value: string | undefined, label: string): string {
  if (!value || !PASCAL.test(value)) {
    throw new CliError('invalid-args', `${label} inválido: "${value ?? ''}". Use PascalCase, ex.: WalletCard.`);
  }
  return value;
}

export const scaffoldCommand: Command = {
  name: 'scaffold',
  summary: 'Gera esqueletos no padrão do projeto (TDD: stubs + it.todo). Dry-run por padrão',
  usage: [
    'fg scaffold feature <nome-kebab> [--write]',
    'fg scaffold component <feature> <NomePascal>',
    'fg scaffold hook <feature> <useNome>',
    'fg scaffold api-route <feature>',
    'fg scaffold page <rota>',
    'fg scaffold service <feature>',
    'fg scaffold repository <feature>',
    'fg scaffold test <arquivo-alvo>',
  ],
  async run(args, ctx) {
    const [kind, first, second] = args.positionals;
    if (!kind || !(KINDS as readonly string[]).includes(kind)) {
      throw new CliError('invalid-args', `Tipo inválido. Use: ${KINDS.join(' | ')}.`);
    }

    let files: PlannedFile[] = [];
    const nextSteps: string[] = [];

    switch (kind) {
      case 'feature': {
        const n = toNames(requireKebab(first, 'Nome da feature'));
        files = [
          ...validationsPiece(n),
          ...repositoryPiece(n),
          ...servicePiece(n),
          ...apiPiece(n),
          ...hookPiece(n),
        ];
        nextSteps.push(
          `Rode os testes (todos pendentes): pnpm fg test src/features/${n.kebab}`,
          'Defina o modelo no prisma/schema.prisma e rode: pnpm fg db generate',
          'Implemente na ordem: validations → repository → service → api → hook (red → green)',
          containerSnippet(n),
        );
        break;
      }
      case 'component': {
        const n = toNames(requireKebab(first, 'Feature'));
        files = componentPiece(n, requirePascal(second, 'Componente'));
        nextSteps.push('Siga docs/ui-guidelines.md (shadcn-ui, Skeleton para loading).');
        break;
      }
      case 'hook': {
        const n = toNames(requireKebab(first, 'Feature'));
        if (!second || !HOOK.test(second)) {
          throw new CliError('invalid-args', `Hook inválido: "${second ?? ''}". Use useNome, ex.: useWallet.`);
        }
        files = hookPiece(n, second);
        break;
      }
      case 'api-route':
        files = apiPiece(toNames(requireKebab(first, 'Feature')));
        nextSteps.push('Valide entrada com Zod e trate erros com mensagem amigável.');
        break;
      case 'page': {
        if (!first || !ROUTE.test(first)) {
          throw new CliError('invalid-args', `Rota inválida: "${first ?? ''}". Ex.: wallet ou settings/profile.`);
        }
        const last = first.split('/').pop() ?? first;
        files = pagePiece(first, toNames(last.replace(/[[\]]/g, '')).pascal);
        break;
      }
      case 'service':
        files = servicePiece(toNames(requireKebab(first, 'Feature')));
        break;
      case 'repository':
        files = repositoryPiece(toNames(requireKebab(first, 'Feature')));
        break;
      case 'test': {
        if (!first) throw new CliError('invalid-args', 'Informe o arquivo-alvo. Ex.: fg scaffold test src/lib/x.ts');
        const target = normalizeRepoPath(first);
        if (!/\.(ts|tsx)$/.test(target)) {
          throw new CliError('invalid-args', 'O alvo deve ser um arquivo .ts ou .tsx.');
        }
        if (!ctx.fs.exists(target)) throw new CliError('invalid-args', `Arquivo-alvo não encontrado: ${target}`);
        files = [testPiece(target)];
        break;
      }
    }

    return applyCreatePlan('scaffold', files, args, ctx, nextSteps);
  },
};
