import { CliError } from './errors';
import type { FlagValue, ParsedArgs } from './types';

const BOOLEAN_FLAGS = new Set([
  'json',
  'write',
  'force',
  'help',
  'yes',
  'coverage',
  'dry-run',
  'check',
  'demo',
  'once',
  'dump',
]);

const SHORT_ALIASES: Record<string, string> = { h: 'help', t: 't', C: 'C' };

/** Parser manual de argv. `--` encerra as flags; flags não-booleanas consomem o próximo token. */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};
  const repeated: Record<string, string[]> = {};
  const setValue = (name: string, value: string): void => {
    flags[name] = value;
    (repeated[name] ??= []).push(value);
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith('--')) {
      const body = token.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        setValue(body.slice(0, eq), body.slice(eq + 1));
        continue;
      }
      if (BOOLEAN_FLAGS.has(body)) {
        flags[body] = true;
        continue;
      }
      setValue(body, takeValue(argv, i, token));
      i += 1;
      continue;
    }

    if (/^-[A-Za-z]$/.test(token)) {
      const name = SHORT_ALIASES[token.slice(1)];
      if (!name) {
        throw new CliError('invalid-args', `Flag desconhecida: ${token}.`);
      }
      if (BOOLEAN_FLAGS.has(name)) {
        flags[name] = true;
        continue;
      }
      setValue(name, takeValue(argv, i, token));
      i += 1;
      continue;
    }

    positionals.push(token);
  }

  return { positionals, flags, repeated };
}

function takeValue(argv: string[], index: number, token: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new CliError(
      'invalid-args',
      `A flag ${token} precisa de um valor (ex.: ${token} <valor> ou ${token}=<valor>). Use --help para ver as opções.`,
    );
  }
  return value;
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === 'string' ? value : undefined;
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
  return args.flags[name] === true;
}

/** Todas as ocorrências de uma flag com valor (ex.: `--dir A --dir B` → ['A', 'B']). */
export function flagStrings(args: ParsedArgs, name: string): string[] {
  const all = args.repeated?.[name];
  if (all) return all.filter((value) => value.length > 0);
  const single = flagString(args, name);
  return single ? [single] : [];
}
