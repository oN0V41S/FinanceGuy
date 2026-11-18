import { z } from 'zod';

export const StepSchema = z.object({
  index: z.number().int().positive(),
  agent: z.string(),
  sessionID: z.string().nullable(),
  model: z.string().nullable(),
  commit: z.string().nullable(),
  status: z.enum(['pending', 'running', 'done', 'failed']),
  /** V3 (DAG): índices das etapas que precisam concluir antes desta. Ausente = sem dependências. */
  dependsOn: z.array(z.number().int().positive()).optional(),
});

export const PipelineStateSchema = z.object({
  code: z.string().regex(/^FING-\d+$/),
  slug: z.string(),
  notionPageUrl: z.string(),
  specPath: z.string(),
  worktree: z.string(),
  baseSha: z.string(),
  state: z.string(), // string livre: estados novos não quebram a TUI
  steps: z.array(StepSchema),
  review: z.object({
    cycles: z.number().int().nonnegative(),
    findings: z.array(z.record(z.string(), z.unknown())), // tolerante; ver normalizeFinding
  }),
  updatedAt: z.string(),
  failedAt: z.string().optional(),
  reason: z.string().optional(),
});

export type PipelineState = z.infer<typeof PipelineStateSchema>;
