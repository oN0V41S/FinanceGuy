import { emptyResult } from './errors';
import type { CommandContext, CommandResult } from './types';

export interface Step {
  name: string;
  command: string;
  args: string[];
}

/** Executa passos em sequência; para no primeiro que falhar e propaga o exit code como falha. */
export async function runSteps(
  commandName: string,
  steps: Step[],
  ctx: CommandContext,
  nextOnSuccess: string[] = [],
): Promise<CommandResult> {
  for (const step of steps) {
    const code = await ctx.exec.run(step.command, step.args);
    if (code !== 0) {
      return emptyResult(commandName, {
        status: 'failed',
        message: `Falhou em "${step.name}" (exit ${code}).`,
        errors: [`${step.command} ${step.args.join(' ')}`.trim()],
      });
    }
  }
  return emptyResult(commandName, {
    message: `Concluído: ${steps.map((s) => s.name).join(' → ')}.`,
    nextSteps: nextOnSuccess,
  });
}
