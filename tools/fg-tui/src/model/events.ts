import { z } from 'zod';
import { sanitizeText } from './sanitizeText.js';
import type { FsLike } from './types.js';

export const EVENTS_FILE = '.fg-pipeline.events.jsonl';

/** Acima disso o arquivo é recusado (tratado como vazio). */
export const MAX_EVENTS_BYTES = 5_000_000;

export const EVENT_TYPES = [
  'step_started',
  'step_done',
  'step_failed',
  'command',
  'file_changed',
  'finding',
  'note',
] as const;

export const PipelineEventSchema = z.object({
  ts: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'ts inválido'),
  step: z.number().int().nullable(),
  type: z.enum(EVENT_TYPES),
  agent: z.string().optional(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

export interface EventsResult {
  events: PipelineEvent[];
  skipped: number;
}

function vazio(): EventsResult {
  return { events: [], skipped: 0 };
}

function byTs(a: PipelineEvent, b: PipelineEvent): number {
  return Date.parse(a.ts) - Date.parse(b.ts);
}

/** Interpreta o JSONL. Linha inválida é contada e ignorada; nunca lança. */
export function parseEvents(text: string): EventsResult {
  const events: PipelineEvent[] = [];
  let skipped = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      skipped += 1;
      continue;
    }
    const parsed = PipelineEventSchema.safeParse(json);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const e = parsed.data;
    events.push({
      ...e,
      message: sanitizeText(e.message),
      ...(e.agent !== undefined ? { agent: sanitizeText(e.agent) } : {}),
    });
  }

  // sort estável: eventos com o mesmo ts mantêm a ordem do arquivo
  return { events: events.sort(byTs), skipped };
}

/** Lê `<dir>/.fg-pipeline.events.jsonl`. Ausente ou ilegível devolve vazio. */
export function readEvents(dir: string, fs: FsLike): EventsResult {
  const file = `${dir.replace(/[\\/]+$/, '')}/${EVENTS_FILE}`;
  try {
    if (!fs.exists(file)) return vazio();
    const raw = fs.readFile(file);
    if (raw.length > MAX_EVENTS_BYTES) return vazio();
    return parseEvents(raw);
  } catch {
    return vazio();
  }
}

/** Eventos de uma etapa, em ordem cronológica. */
export function eventsForStep(events: readonly PipelineEvent[], index: number): PipelineEvent[] {
  return events.filter((e) => e.step === index).sort(byTs);
}

/** Últimos `n` eventos (ordem cronológica). */
export function tailEvents(events: readonly PipelineEvent[], n: number): PipelineEvent[] {
  if (n <= 0) return [];
  return [...events].sort(byTs).slice(-n);
}
