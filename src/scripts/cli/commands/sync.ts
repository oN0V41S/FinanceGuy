import { hasFlag } from '../core/args';
import { CliError, emptyResult } from '../core/errors';
import type { Command, CommandResult, FsPort } from '../core/types';

const SOURCE_DIR = '.ai/skills-agents';
const AGENTS_SRC = `${SOURCE_DIR}/agents`;
const SKILLS_SRC = `${SOURCE_DIR}/skills`;
const INDEX_PATH = `${SOURCE_DIR}/INDEX.md`;
const GENERATED_MARK = 'GERADO';

const TARGETS = [
  { tool: 'claude', agents: '.claude/agents', skills: '.claude/skills' },
  { tool: 'opencode', agents: '.opencode/agents', skills: '.opencode/skills' },
] as const;
type Tool = (typeof TARGETS)[number]['tool'];

/** Chaves neutras: valem para as duas ferramentas. */
const SHARED_KEYS = ['name', 'description'];
/** Chaves neutras que só o OpenCode entende (as cores/modos do Claude são outros). */
const OPENCODE_KEYS = ['mode', 'color'];
const TOOL_PREFIX: Record<Tool, string> = { claude: 'claude-', opencode: 'opencode-' };

interface AgentSource {
  slug: string;
  fields: Map<string, string>;
  body: string;
}

const normalizeEol = (text: string): string => text.replace(/\r\n/g, '\n');

function parseAgent(slug: string, raw: string): AgentSource {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalizeEol(raw));
  if (!match) throw new CliError('invalid-args', `${AGENTS_SRC}/${slug}.md: frontmatter ausente.`);

  const fields = new Map<string, string>();
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) throw new CliError('invalid-args', `${AGENTS_SRC}/${slug}.md: linha inválida "${line}".`);
    fields.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }

  const allowed = (key: string): boolean =>
    SHARED_KEYS.includes(key) ||
    OPENCODE_KEYS.includes(key) ||
    Object.values(TOOL_PREFIX).some((p) => key.startsWith(p) && key.length > p.length);
  const unknown = [...fields.keys()].filter((k) => !allowed(k));
  if (unknown.length > 0) {
    throw new CliError(
      'invalid-args',
      `${AGENTS_SRC}/${slug}.md: chave(s) desconhecida(s): ${unknown.join(', ')}. ` +
        `Use name, description, mode, color ou prefixe com claude-/opencode-.`,
    );
  }
  for (const required of SHARED_KEYS) {
    if (!fields.get(required)) {
      throw new CliError('invalid-args', `${AGENTS_SRC}/${slug}.md: "${required}" é obrigatório.`);
    }
  }
  return { slug, fields, body: match[2].replace(/^\n+/, '') };
}

function renderAgent(agent: AgentSource, tool: Tool): string {
  const lines: string[] = [];
  for (const key of SHARED_KEYS) lines.push(`${key}: ${agent.fields.get(key)}`);

  if (tool === 'opencode') {
    lines.push(`mode: ${agent.fields.get('mode') ?? 'subagent'}`);
    const color = agent.fields.get('color');
    if (color) lines.push(`color: ${color}`);
  }
  const prefix = TOOL_PREFIX[tool];
  for (const [key, value] of agent.fields) {
    if (key.startsWith(prefix)) lines.push(`${key.slice(prefix.length)}: ${value}`);
  }

  const mark = `<!-- ${GENERATED_MARK} de ${AGENTS_SRC}/${agent.slug}.md por "pnpm fg sync" — não edite. -->`;
  return `---\n${lines.join('\n')}\n---\n${mark}\n\n${agent.body}`;
}

function listFilesRecursive(fs: FsPort, dir: string): string[] {
  return fs.list(dir).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDir ? listFilesRecursive(fs, path) : [path];
  });
}

function renderIndex(agents: AgentSource[], skills: string[]): string {
  const rows = agents.map((a) => `| \`${a.slug}\` | ${a.fields.get('description')} |`);
  return [
    `<!-- ${GENERATED_MARK} por "pnpm fg sync" — não edite. -->`,
    '# Índice de agentes e skills',
    '',
    `Fonte única: \`${SOURCE_DIR}/\`. Rode \`pnpm fg sync --write\` após editar.`,
    '',
    '## Agentes',
    '',
    '| Agente | Descrição |',
    '|---|---|',
    ...rows,
    '',
    '## Skills',
    '',
    ...skills.map((s) => `- \`${s}\``),
    '',
  ].join('\n');
}

/** Mapa caminho → conteúdo esperado de tudo que o sync gera. */
function buildExpected(fs: FsPort): { files: Map<string, string>; generatedDirs: string[] } {
  const files = new Map<string, string>();

  const agents = fs
    .list(AGENTS_SRC)
    .filter((e) => !e.isDir && e.name.endsWith('.md'))
    .map((e) => parseAgent(e.name.slice(0, -3), fs.readFile(`${AGENTS_SRC}/${e.name}`)));
  for (const agent of agents) {
    for (const t of TARGETS) files.set(`${t.agents}/${agent.slug}.md`, renderAgent(agent, t.tool));
  }

  const skills = fs.list(SKILLS_SRC).filter((e) => e.isDir).map((e) => e.name);
  for (const skill of skills) {
    for (const src of listFilesRecursive(fs, `${SKILLS_SRC}/${skill}`)) {
      const rel = src.slice(SKILLS_SRC.length + 1);
      for (const t of TARGETS) files.set(`${t.skills}/${rel}`, fs.readFile(src));
    }
  }

  files.set(INDEX_PATH, renderIndex(agents, skills));
  return { files, generatedDirs: TARGETS.map((t) => t.agents) };
}

export const syncCommand: Command = {
  name: 'sync',
  summary: 'Gera .claude/ e .opencode/ (agentes e skills) a partir de .ai/skills-agents/',
  usage: [
    'fg sync                 # dry-run: mostra o que mudaria',
    'fg sync --write         # grava os arquivos gerados',
    'fg sync --check         # falha (exit 1) se houver divergência (CI)',
  ],
  async run(args, ctx) {
    const { fs } = ctx;
    if (!fs.exists(SOURCE_DIR)) {
      throw new CliError('invalid-args', `Fonte ${SOURCE_DIR}/ não encontrada.`);
    }
    const { files, generatedDirs } = buildExpected(fs);

    const created: string[] = [];
    const modified: string[] = [];
    for (const [path, content] of files) {
      if (!fs.exists(path)) created.push(path);
      else if (normalizeEol(fs.readFile(path)) !== normalizeEol(content)) modified.push(path);
    }
    // Só remove órfãos que o próprio sync gerou (têm a marca); autoria manual é preservada.
    const orphans = generatedDirs
      .flatMap((dir) => fs.list(dir).filter((e) => !e.isDir).map((e) => `${dir}/${e.name}`))
      .filter((p) => !files.has(p) && fs.readFile(p).includes(GENERATED_MARK));

    const drift = created.length + modified.length + orphans.length;
    const base: Partial<CommandResult> = { created, modified, matches: orphans.map((o) => `órfão: ${o}`) };

    if (hasFlag(args, 'check')) {
      return emptyResult('sync', {
        ...base,
        status: drift === 0 ? 'ok' : 'failed',
        message: drift === 0 ? 'Tudo em dia.' : `${drift} arquivo(s) divergente(s). Rode "pnpm fg sync --write".`,
      });
    }
    if (!hasFlag(args, 'write')) {
      return emptyResult('sync', {
        ...base,
        status: 'dry-run',
        message: drift === 0 ? 'Nada a fazer.' : `${drift} alteração(ões) pendente(s). Use --write.`,
      });
    }

    for (const path of [...created, ...modified]) fs.writeFile(path, files.get(path) as string);
    for (const path of orphans) fs.remove(path);
    return emptyResult('sync', {
      ...base,
      status: 'ok',
      message: drift === 0 ? 'Nada a fazer.' : `${drift} arquivo(s) sincronizado(s).`,
    });
  },
};
