import type { PipelineState } from './types.js';

/**
 * Estado de demonstração (`--demo`): cobre as 4 colunas do Kanban, agentes, modelos,
 * commits curtos e achados de revisão. `updatedAt` é "agora" para não aparecer como parado.
 * A etapa 4 aparece como falha para ilustrar a coluna "Falhou" (etapa paralela que errou).
 */
export function demoState(): PipelineState {
  return {
    code: 'FING-99',
    slug: 'exemplo-demo',
    notionPageUrl: 'https://www.notion.so/exemplo-demo',
    specPath: 'docs/specs/FING-99-exemplo-demo.md',
    worktree: '../FinanceGuy-FING-99',
    baseSha: '9f3c2ab',
    state: 'step_3_running',
    steps: [
      {
        index: 1,
        agent: 'devops-platform-engineer',
        sessionID: 'ses_demo0001a1b2c3',
        model: 'claude-sonnet-4',
        commit: '1a2b3c4d5e6f7a8b9c0d',
        status: 'done',
      },
      {
        index: 2,
        agent: 'quality-assurance-analyst',
        sessionID: 'ses_demo0002d4e5f6',
        model: 'gpt-5-mini',
        commit: '7e8f9a0b1c2d3e4f5a6b',
        status: 'done',
      },
      {
        index: 3,
        agent: 'backend-engineer',
        sessionID: 'ses_demo0003a7b8c9',
        model: 'claude-sonnet-4',
        commit: null,
        status: 'running',
      },
      {
        index: 4,
        agent: 'frontend',
        sessionID: 'ses_demo0004d0e1f2',
        model: 'deepseek-v3',
        commit: null,
        status: 'failed',
      },
      {
        index: 5,
        agent: 'docs-architect',
        sessionID: null,
        model: null,
        commit: null,
        status: 'pending',
      },
      {
        index: 6,
        agent: 'project-review',
        sessionID: null,
        model: null,
        commit: null,
        status: 'pending',
      },
    ],
    review: {
      cycles: 1,
      findings: [
        {
          severity: 'critico',
          file: 'src/features/transactions/service.ts',
          line: 42,
          description: 'Valor monetário calculado com ponto flutuante; usar Decimal.',
        },
        {
          severidade: 'alto',
          arquivo: 'src/app/api/goals/route.ts',
          linha: 18,
          descrição: 'Entrada externa sem validação Zod.',
        },
        {
          severity: 'medio',
          file: 'src/features/goals/repository.ts',
          line: 77,
          description: 'Consulta sem paginação pode retornar listas muito grandes.',
        },
        {
          severity: 'baixo',
          file: 'src/shared/components/GoalCard.tsx',
          line: 9,
          description: 'Nome de prop pouco claro.',
        },
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}
