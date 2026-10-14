import type { Command } from '../core/types';
import { auditCommand } from './audit';
import { dbCommand } from './db';
import { devCommand } from './dev';
import { findCommand } from './find';
import { grepCommand } from './grep';
import { mvCommand } from './mv';
import { prCommand } from './pr';
import { replaceCommand } from './replace';
import { routeCommand } from './route';
import { scaffoldCommand } from './scaffold';
import { specCommand } from './specCommand';
import { testCommand } from './testCommand';

export const COMMANDS: Command[] = [
  devCommand,
  testCommand,
  dbCommand,
  prCommand,
  auditCommand,
  specCommand,
  routeCommand,
  scaffoldCommand,
  findCommand,
  grepCommand,
  mvCommand,
  replaceCommand,
];

export function findCommandByName(name: string): Command | undefined {
  return COMMANDS.find((c) => c.name === name);
}

export function helpText(command?: Command): string {
  if (command) {
    return [`fg ${command.name}: ${command.summary}`, '', 'Uso:', ...command.usage.map((u) => `  ${u}`)].join('\n');
  }
  return [
    'fg: CLI do FinanceGuy',
    '',
    'Uso: pnpm fg <grupo> [comando] [flags]',
    '',
    'Grupos:',
    ...COMMANDS.map((c) => `  ${c.name.padEnd(10)} ${c.summary}`),
    '',
    'Flags globais: --json  --write  --force  --help',
    'Escritas são dry-run por padrão; use --write para gravar.',
  ].join('\n');
}
