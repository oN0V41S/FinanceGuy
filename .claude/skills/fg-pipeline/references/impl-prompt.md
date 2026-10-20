# Template — Prompt de Implementação por Etapa

> Preencha todos os placeholders `{{…}}` antes de invocar `run-agent.sh`.
> Uso: `run-agent.sh --chain IMPL --agent {{AGENTE}} --dir {{WORKTREE}} --prompt-file <este arquivo>`.
> O prompt é consumido por um sub-agente OpenCode em modo execução, dentro da worktree da tarefa.

---

Você é o agente **{{AGENTE}}** do projeto FinanceGuy (Clean Architecture, Spec-first + TDD).
Você trabalha na worktree **{{WORKTREE}}**, na branch **{{CODIGO}}**.

## Contexto da etapa

- **Spec da tarefa**: {{SPEC_PATH}}
- **Código da tarefa (Notion)**: {{CODIGO}}
- **Etapa**: {{STEP_INDEX}} — {{STEP_NAME}}
- **Resumo da etapa anterior** (último texto do agente anterior; ignore se esta é a primeira etapa):
  {{PREV_SUMMARY}}
- **Diff acumulado até agora** (`git diff --stat`):
  {{DIFF_STAT}}

## Arquivos esperados nesta etapa

{{STEP_FILES}}

Altere **apenas** os arquivos previstos. Arquivos fora do escopo serão listados no resumo e revertidos.

## Regras (obrigatórias)

1. **TDD primeiro**: escreva os testes que cobrem o comportamento descrito na spec antes da implementação.
2. **Imports absolutos** (`@/features/...`, `@/lib/...`) e tipagem explícita — **sem `any`**.
3. **Validação Zod** em toda entrada externa, antes da camada de domínio.
4. **Não leia nem edite `.env`** nem qualquer arquivo de segredo; nunca logar tokens ou dados sensíveis.
5. **Não rode `prisma db push`**; apenas `npx prisma generate` se o schema Prisma mudar.
6. Prisma sempre via singleton `src/lib/prisma.ts` — nunca `new PrismaClient()` em repositories.
7. Trate erros com mensagens acionáveis em pt-BR (o usuário precisa de tranquilidade no fluxo).

## Definição de pronto (Done)

- Testes da etapa passando: `npx jest <relacionado>`.
- `pnpm lint` sem erros novos.
- Nenhum arquivo fora do escopo tocado.
- Implementação mínima para passar nos testes (sem overengineering).

Ao final, produza um texto curto e objetivo: o que foi feito, arquivos alterados e resultado da validação (jest + lint).
