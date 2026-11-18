---
description: Correção/iteração de feature em loop: bug → correção → validação (curl/navegador) → repete se houver problema
argument-hint: <descrição do problema ou bug, com rota/endpoint e passos para reproduzir>
---

# /fg-fix — loop de correção de feature

Você (Claude) é o **maestro** do loop. Cada fase é executada por **um sub-agente** via a ferramenta Agent (nunca edite código diretamente no maestro). O loop repete até a validação reportar **PASSOU** ou até atingir o limite de ciclos.

Problema recebido: `$ARGUMENTS`

Se `$ARGUMENTS` estiver vazio, pergunte ao usuário o problema antes de começar (é a única pergunta permitida).

## Regras fixas

- **Limite**: máximo **3 ciclos**. Ao estourar, pare, não commite, e reporte o último relatório de validação.
- **Estado do ciclo**: guarde em cada ciclo `ciclo n`, o diagnóstico, os arquivos alterados e o relatório de validação. Passe esse histórico adiante em cada sub-agente (o ciclo seguinte precisa saber o que já foi tentado).
- **Worktree**: trabalhe apenas no diretório atual. Não altere o checkout principal.
- **TDD**: a correção começa por um teste que reproduz o bug (quando a área tem suíte Jest).
- **Sem `prisma db push`** e sem abrir PR. Sem `--auto` em nenhum comando.
- Commit só ao final, com PASSOU, Conventional Commits e o trailer `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.

## Fluxo

```
PROBLEMA → CORREÇÃO → VALIDAÇÃO ──PASSOU──► commit + resumo
    ▲                     │
    └────── FALHOU ───────┘   (novo ciclo, máx. 3)
```

### Fase 1 — Problema (diagnóstico)

Sub-agente: `Explore` (com “very thorough”) para localizar o código e, se for necessário, `general-purpose` para reproduzir.

Entregue ao sub-agente:
- o problema original (`$ARGUMENTS`) e, a partir do ciclo 2, o relatório de validação que falhou;
- a instrução de **não editar nada** nesta fase.

Ele deve devolver, em pt-BR:
1. **Causa provável** (arquivo:linha) e como ela gera o sintoma.
2. **Tipo de tarefa**: `UI` (componente/página/CSS), `API` (rota, service, repository), ou `misto`.
3. **Critérios de aceitação** derivados do problema, verificáveis (ex.: “no desktop 1280, o donut fica à esquerda da lista”).
4. **Rotas ou endpoints** a validar.

### Fase 2 — Correção (implementação)

Escolha o sub-agente pela área do diagnóstico:
- `frontend` → UI, componentes, layout;
- `backend-engineer` → API routes, services, repositories;
- `database-engineer` → schema Prisma;
- para mistos, execute `backend-engineer` e depois `frontend`, nessa ordem.

Entregue ao sub-agente:
- diagnóstico da fase 1 e critérios de aceitação;
- regras do projeto: imports absolutos `@/`, sem `any`, Zod em entrada externa, tratamento de erro com mensagem tranquilizadora, sem `setTimeout` para simular loading, sem `MOCK_DATA`;
- para classes com alpha em tema, usar `withAlpha` (ver `AGENTS.md`), nunca `style={{ borderColor }}` nem `!border-*`.

Ao terminar, rode na worktree: `npx jest <relacionado>` e `npx eslint <arquivos>` e `npx tsc --noEmit`. Se falhar, o próprio sub-agente corrige antes de devolver.

**Atenção ao jest**: o caminho da worktree contém `\.claude\`, que está em `testPathIgnorePatterns`. Use:
`npx jest --testPathIgnorePatterns node_modules .next e2e -- <padrão>`

### Fase 3 — Validação (curl ou navegador)

Sub-agente: `quality-assurance-analyst`. Escolha o método pelo tipo de tarefa:

- **API** → `curl` contra o servidor da worktree (`http://localhost:<porta>`): sucesso (200/201), erro de validação Zod (400), sem autenticação (401), recurso inexistente (404), e para mutações use dados de teste `ZZTeste` e limpe depois.
- **UI** → navegador (`mcp__Claude_Browser__*`): desktop 1280×800 e mobile 375×812, com print. Verifique também overflow horizontal e o console sem erros.
- **misto** → os dois.

O sub-agente **não edita nem commita nada**. Ele devolve um relatório com:
- `PASSOU` ou `FALHOU`;
- para cada critério da fase 1: ok/falhou, com a evidência (saída do curl ou print/medida);
- se `FALHOU`: o que falhou e a provável causa, para alimentar o próximo ciclo.

### Decisão do loop

- **PASSOU** → vá para o fechamento.
- **FALHOU** e ciclo < 3 → volte à **Fase 1** com o relatório de validação como nova evidência. O número do ciclo sobe.
- **FALHOU** e ciclo = 3 → pare. Não commite. Reporte o estado e o que foi tentado em cada ciclo.

## Fechamento (só com PASSOU)

1. Rode `npx jest --testPathIgnorePatterns node_modules .next e2e -- <relacionado>`, `npx tsc --noEmit` e `npx eslint <arquivos alterados>`. Tudo limpo.
2. `git status` e `git diff --stat`: confirme que só os arquivos da correção aparecem.
3. Commit com Conventional Commits (`fix:` para bug, `feat:` para ajuste de feature), o código da tarefa se houver, e o trailer do Haiku.
4. Resumo ao usuário: problema, causa, arquivos, ciclos usados, evidências da validação (prints e saídas do curl) e o que ficou de fora.

Se a alteração for de front-end, a regra de auto-push do projeto vale: após o commit, dê push direto para o preview, sem perguntar.
