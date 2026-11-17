export type CliStatus = 'ok' | 'dry-run' | 'invalid-args' | 'blocked' | 'failed';

export interface FsEntry {
  name: string;
  isDir: boolean;
}

/** Porta de sistema de arquivos. Todos os caminhos são relativos à raiz do repo, com `/`. */
export interface FsPort {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  remove(path: string): void;
  list(dir: string): FsEntry[];
}

/** Porta de execução de processos. Retorna o exit code do processo filho. */
export interface ExecPort {
  run(command: string, args: string[]): Promise<number>;
}

export interface CommandContext {
  fs: FsPort;
  exec: ExecPort;
}

export type FlagValue = string | boolean;

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, FlagValue>;
  /** Todas as ocorrências de flags com valor, na ordem (flags repetíveis, ex.: --dir A --dir B). */
  repeated?: Record<string, string[]>;
}

export interface CommandResult {
  status: CliStatus;
  command: string;
  message: string;
  created: string[];
  modified: string[];
  moved: string[];
  matches: string[];
  nextSteps: string[];
  errors: string[];
  previews?: Record<string, string>;
  /** Quando `true` e `status` é `ok`, nada é impresso depois do comando (a saída do filho já basta). */
  quiet?: boolean;
}

export interface Command {
  name: string;
  summary: string;
  usage: string[];
  run(args: ParsedArgs, ctx: CommandContext): Promise<CommandResult>;
}

export const EXIT_CODES: Record<CliStatus, number> = {
  ok: 0,
  'dry-run': 0,
  failed: 1,
  'invalid-args': 2,
  blocked: 3,
};
