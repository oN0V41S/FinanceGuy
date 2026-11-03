import { spawn } from 'child_process';
import { CliError } from './errors';
import type { ExecPort } from './types';

const SAFE_ARG = /^[\w@./:=,+-]+$/;
const FORBIDDEN_CHARS = /["%`&|<>^\r\n]/;

/** Escapa um argumento para o shell (necessário no Windows para resolver pnpm.cmd/npx.cmd). */
function quote(arg: string): string {
  if (FORBIDDEN_CHARS.test(arg)) {
    throw new CliError('blocked', `Argumento com caracteres não permitidos: ${arg}`);
  }
  return SAFE_ARG.test(arg) ? arg : `"${arg}"`;
}

export interface SpawnPlan {
  file: string;
  args: string[];
  shell: boolean;
}

/**
 * No Windows precisa de shell para resolver pnpm.cmd/npx.cmd; passar `args` junto com `shell: true`
 * dispara o aviso DEP0190, então o comando vira uma única string já escapada.
 */
export function buildSpawnPlan(command: string, args: string[], platform: string = process.platform): SpawnPlan {
  if (platform === 'win32') {
    return { file: [command, ...args.map(quote)].join(' '), args: [], shell: true };
  }
  return { file: command, args, shell: false };
}

export function createRealExec(cwd: string): ExecPort {
  return {
    run(command, args) {
      return new Promise((resolvePromise) => {
        const plan = buildSpawnPlan(command, args);
        const child = spawn(plan.file, plan.args, { cwd, stdio: 'inherit', shell: plan.shell });
        child.on('error', () => resolvePromise(1));
        child.on('close', (code) => resolvePromise(code ?? 1));
      });
    },
  };
}
