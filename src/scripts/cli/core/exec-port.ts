import { spawn } from 'child_process';
import { CliError } from './errors';
import type { ExecPort } from './types';

const SAFE_ARG = /^[\w@./:=,+-]+$/;
const FORBIDDEN_CHARS = /["%`\r\n]/;

/** Escapa um argumento para o shell (necessário no Windows para resolver pnpm.cmd/npx.cmd). */
function quote(arg: string): string {
  if (FORBIDDEN_CHARS.test(arg)) {
    throw new CliError('blocked', `Argumento com caracteres não permitidos: ${arg}`);
  }
  return SAFE_ARG.test(arg) ? arg : `"${arg}"`;
}

export function createRealExec(cwd: string): ExecPort {
  return {
    run(command, args) {
      return new Promise((resolvePromise) => {
        const child = spawn(command, args.map(quote), {
          cwd,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
        child.on('error', () => resolvePromise(1));
        child.on('close', (code) => resolvePromise(code ?? 1));
      });
    },
  };
}
