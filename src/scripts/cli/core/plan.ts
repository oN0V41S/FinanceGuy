import { hasFlag } from './args';
import { CliError, emptyResult } from './errors';
import { assertWritable } from './guards';
import type { CommandContext, CommandResult, ParsedArgs } from './types';

export interface PlannedFile {
  path: string;
  content: string;
}

/**
 * Aplica um plano de criação de arquivos respeitando os guards:
 * `--dry-run` é o padrão (só `--write` grava) e nada existente é sobrescrito sem `--force`.
 */
export function applyCreatePlan(
  command: string,
  files: PlannedFile[],
  args: ParsedArgs,
  ctx: CommandContext,
  nextSteps: string[] = [],
): CommandResult {
  const planned = files.map((f) => ({ path: assertWritable(f.path), content: f.content }));

  if (!hasFlag(args, 'force')) {
    const conflicts = planned.filter((f) => ctx.fs.exists(f.path)).map((f) => f.path);
    if (conflicts.length > 0) {
      throw new CliError(
        'blocked',
        'Alguns arquivos já existem e não foram alterados. Use --force para sobrescrever.',
        conflicts,
      );
    }
  }

  const write = hasFlag(args, 'write');
  if (write) {
    planned.forEach((f) => ctx.fs.writeFile(f.path, f.content));
  }

  return emptyResult(command, {
    status: write ? 'ok' : 'dry-run',
    message: write
      ? `${planned.length} arquivo(s) criado(s).`
      : `Dry-run: nada foi gravado (${planned.length} arquivo(s) planejado(s)). Use --write para efetivar.`,
    created: planned.map((f) => f.path),
    nextSteps,
    previews: write ? undefined : Object.fromEntries(planned.map((f) => [f.path, f.content])),
  });
}
