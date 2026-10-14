import { parseArgs, hasFlag } from './core/args';
import { emptyResult, errorToResult } from './core/errors';
import { renderResult } from './core/output';
import { EXIT_CODES } from './core/types';
import type { CommandContext } from './core/types';
import { findCommandByName, helpText } from './commands';

export interface RunOutcome {
  output: string;
  exitCode: number;
}

/** Orquestra parse → dispatch → render. Pura em relação a I/O real (tudo via `ctx`). */
export async function runCli(argv: string[], ctx: CommandContext): Promise<RunOutcome> {
  const [group, ...rest] = argv;
  const wantsJson = argv.includes('--json');

  try {
    const args = parseArgs(rest);
    const command = group && !group.startsWith('-') ? findCommandByName(group) : undefined;

    if (!group || group === '--help' || group === '-h' || (!command && group === 'help')) {
      return { output: helpText(), exitCode: 0 };
    }
    if (!command) {
      const result = emptyResult(group, {
        status: 'invalid-args',
        message: `Grupo desconhecido: "${group}". Rode pnpm fg --help.`,
      });
      return { output: renderResult(result, wantsJson), exitCode: EXIT_CODES[result.status] };
    }
    if (hasFlag(args, 'help')) {
      return { output: helpText(command), exitCode: 0 };
    }

    const result = await command.run(args, ctx);
    return { output: renderResult(result, hasFlag(args, 'json')), exitCode: EXIT_CODES[result.status] };
  } catch (error) {
    const result = errorToResult(group ?? 'fg', error);
    return { output: renderResult(result, wantsJson), exitCode: EXIT_CODES[result.status] };
  }
}
