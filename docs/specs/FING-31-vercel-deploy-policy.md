# Spec: Política de deploy Vercel (FING-31)

**Status**: Draft (aguardando Portão 1)
**Versão**: 1.0
**Última atualização**: 2026-11-16

---

## 1. Visão Geral

O deploy do FinanceGuy é feito pela integração Vercel↔GitHub, sem `vercel.json` nem workflow de deploy; o comportamento depende só do dashboard, sem versionamento nem documentação. Esta spec fixa e documenta a política:

- `main` → **Production**, somente no push/merge em `main`.
- `staging`, `feat/fing-*`, `FING-N`, demais branches e **todos os PRs** (inclusive `staging → main`) → **somente Preview**.

### 1.1 Decisões fechadas
| # | Decisão |
|---|---------|
| Q1 | Todas as branches continuam gerando Preview (sem `ignoreCommand`/allowlist) |
| Q2 | Production só no merge em `main`; fluxo `feat → staging → main` inalterado |
| Q3 | PRs são sempre Preview; sem GitHub Action extra (Preview da Vercel é por push, não por PR aberto) |
| Q4 | Configurações de dashboard (Production Branch, escopo de env vars) são manuais do usuário |

### 1.2 Referências
`docs/git-workflow.md` (Gate de `staging`), `docs/TECHNICAL_DOCS.md` §Deploy, `docs/security.md`.

## 2. Escopo

### 2.1 Código/docs (esta pipeline)
1. **`vercel.json`** (raiz): `$schema` + `git.deploymentEnabled` com `main` e `staging` habilitados.
2. **`docs/git-workflow.md`**: tabela branch/PR → ambiente Vercel + checklist do dashboard.
3. **`docs/TECHNICAL_DOCS.md`** §Deploy: `vercel deploy --prod` marcado como uso emergencial; deploy normal é por push em `main`.

### 2.2 Fora do escopo (manual, usuário no dashboard)
- *Production Branch* = `main`; *Automatically expose System Environment Variables* ligado.
- Env vars com escopo separado: Production só para Production; Preview com banco/chave de preview (nunca o banco de produção).
- *Deployment Protection* ativa para Preview; sem Deploy Hooks / promoção automática para branches de PR.

## 3. Mapa de Execução

| Etapa | Agente | Arquivos previstos | Depende de |
|---|---|---|---|
| 1. `vercel.json` | `devops-platform-engineer` | `vercel.json` | — |
| 2. Docs | `docs-architect` | `docs/git-workflow.md`, `docs/TECHNICAL_DOCS.md` | 1 |
| 3. Revisão | `project-review` + `security-secret-auditor` | (somente leitura) | 1, 2 |

Commits: `chore(deploy): versiona política de deploy Vercel (FING-31)` e `docs(deploy): documenta ambientes Vercel (FING-31)`.

## 4. Critérios de Aceite
- `vercel.json` é JSON válido e não contém segredos.
- Docs trazem a tabela branch/PR → ambiente e o checklist do dashboard.
- `pnpm lint` e `npx jest` continuam verdes (sem mudança de código de app).
- Após o push: branch `FING-31` gera **Preview**; merge em `staging` gera Preview; merge `staging → main` gera **Production**.

## 5. Testes (TDD)
Sem código de aplicação: validação por `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` e verificação manual dos deploys no dashboard Vercel.
