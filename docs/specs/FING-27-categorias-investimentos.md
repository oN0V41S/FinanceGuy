# Spec: Categorias para Investimentos (FING-27)

**Status**: Draft
**Versão**: 1.0
**Última atualização**: 2026-10-20
**Card**: https://app.notion.com/p/3ffd3856092b813881c5d3914b6e3cb6
**Estende**: `docs/issues/categorias-crud.md` (issue #38, branch `feat/categories-crud`)

## 1. Visão Geral

### 1.1 Objetivo de Negócio
Hoje `Investment.type` só distingue `Renda Fixa | Renda Variável`. O usuário quer classificar a carteira do jeito dele (Aposentadoria, Reserva de emergência, Renda passiva, Cripto…) e **ver a carteira agrupada por categoria** em `/investimentos`. A IA (`/assistente`) responde sobre a carteira com os mesmos números que o usuário vê.

### 1.2 Decisões fechadas (grill-me)
| # | Decisão |
|---|---|
| Q1 | Categoria classifica o ativo e expressa o objetivo do dinheiro (campo único). Fora: subcategorias de transação. |
| Q2 | Mesma tabela `categories` + coluna `scope` (`transaction` \| `investment`); unicidade `(userId, scope, nameKey)`. |
| Q3 | `Investment.type` **intocado**; `Investment.categoryId` opcional (`onDelete: SetNull`). Sem backfill; ativos antigos = "Sem categoria". |
| Q4 | Seed lazy/idempotente por escopo; fallback protegido "Outros investimentos"; excluir categoria em uso migra os ativos para o fallback. |
| Q5 | `/categorias` ganha seletor "Transações \| Investimentos"; formulário do investimento ganha Select de categoria + badge no card; painel "Carteira por categoria" em `/investimentos`. |
| Q6 | Agente de **escrita** da IA não muda. O contexto de **leitura** ganha a carteira por categoria (ver Q10). |
| Q7 | Migração SQL aditiva e idempotente em `prisma/migrations`; **não** executar `db push`; o usuário aplica. |
| Q8 | Fatia = `Investment.value` (valor investido). Valor de mercado fica para a fase 2. |
| Q9 | Só ativos `ACTIVE`; resgatados ficam fora do resumo. |
| Q10 | Seção da IA enviada **somente quando a pergunta trata de investimentos** (ver §2.4). |
| Q11 | Vínculo categoria ↔ metas fora desta spec (follow-up: `docs/specs/FING-28-categorias-investimentos-metas.md`). |

### 1.3 Dependências
- `feat/categories-crud` (CRUD, `CategoriesService`, `Category`, UI `/categorias`) — **a mesma branch é usada**.
- Tailwind `withAlpha` (commit `45426c9`): bordas/`/NN` já funcionam.
- Contexto da IA: `src/features/ai/financialContext.ts`, `agent/financialContextSource.ts`, `session/contextCache.ts`.

### 1.4 Referências
`docs/specs/transactions-screen.md`, `docs/issues/categorias-crud.md`, `docs/ui-guidelines.md`, `AGENTS.md` (armadilhas: base-ui Select, borda `var()`, LazyLoad).

## 2. Arquitetura

### 2.1 Estrutura de Arquivos
```
prisma/schema.prisma                         + Category.scope ; + Investment.categoryId/category
prisma/migrations/2026102000001_investment_categories/migration.sql
src/features/categories/
  defaults.ts                                + DEFAULT_INVESTMENT_CATEGORIES, FALLBACK_INVESTMENT_CATEGORY_*
  validations.ts                             + scope no schema (default 'transaction')
  categories.service.ts / repository         scope em list/create/update/delete/seed
  components/CategoriesList.tsx              scope como prop; CategoryFormDialog herda scope
  hooks/useCategories.ts                     useCategories(scope)
src/app/categorias/page.tsx                  SegmentedToggle Transações | Investimentos
src/features/investments/
  validations.ts                             + categoryId (cuid, opcional/nullable)
  investment.service.ts / repository         valida categoria do mesmo usuário e scope
  portfolioSummary.ts                        NOVO: summarizeByCategory (função pura)
  components/InvestmentFormDialog.tsx        + Select de categoria
  components/InvestmentCard.tsx              + badge colorido
  components/PortfolioByCategory.tsx         NOVO: donut + lista + chips
src/app/investimentos/components/InvestmentsSection.tsx   integra painel + filtro por chip
src/features/ai/
  types.ts                                   + portfolioByCategory? no FinancialContextDto
  financialContext.ts                        monta a seção via summarizeByCategory
  portfolioIntent.ts                         NOVO: wantsPortfolio(question) (sem LLM)
  session/contextCache.ts                    ignora cache quando wantsPortfolio
```

### 2.2 Fluxo de Dados
1. `/investimentos` carrega `useInvestments` e `useCategories('investment')` (já com seed lazy).
2. `summarizeByCategory(investmentsAtivos, categorias)` → `{ total, slices[] }`; UI e IA usam a **mesma função**.
3. Chip/fatia selecionada filtra a grade de cards no cliente (sem nova request).
4. Excluir categoria: service migra `Investment.categoryId` → fallback "Outros investimentos" e remove a categoria na mesma transação.

### 2.3 Estados
- **loading**: `Skeleton` no painel (não `LazyLoad`; dados já vêm de hooks); cards seguem seu próprio estado.
- **empty**: sem investimentos ativos → painel não renderiza (mantém o empty state atual).
- **error**: erro de categorias/resumo mostra aviso calmo no painel ("Não foi possível carregar o resumo agora.") e **a grade de cards continua**.
- **success**: donut + lista; "Sem categoria" em cinza, só se houver ativos nela.

Layout (desktop): painel entre o botão "Novo" e a grade; donut (recharts) à esquerda com total no centro; lista ranqueada à direita (ponto de cor, nome, valor, %, nº de ativos); chips `Todas | <categorias>` abaixo. Mobile: barra empilhada horizontal no lugar do donut; lista com as 5 maiores + "ver todas". Bordas/superfícies via tokens (`border-outline-variant/30`), `SelectValue` com label mapeado como `children` (base-ui).

### 2.4 Contexto da IA — envio somente sob demanda
Situação atual (verificada): todas as seções do `FinancialContextDto` vão em toda pergunta, limitadas por tetos (`MAX_INVESTMENTS=30`, `MAX_CONTEXT_JSON_CHARS=12000`); o DTO é cacheado 60 s só quando a pergunta não cita período.

Para a nova seção `portfolioByCategory`:
- `wantsPortfolio(question)` (normalizada sem acento/caixa) é verdadeira para termos de investimento: `invest`, `carteira`, `aposent`, `previdenc`, `renda fixa|variavel|passiva`, `reserva`, `acoes`, `fii`, `cripto`, `aporte`, `rendimento`, `patrimonio`.
- Verdadeira → seção incluída; falsa → **seção omitida** (o prompt não cresce).
- Cache: se `wantsPortfolio` for verdadeira, **ignora o cache** (mesmo padrão de `resolveQuestionPeriod`), pois a chave é só `ai:ctx:{userId}`; assim o DTO com a seção nunca é servido a outra pergunta e vice-versa.
- Conteúdo: até **8 categorias** `{ name, total, pct, count }` + `Outras` agregada; nomes por `sanitizeLabel`/`safeName` (anti prompt-injection); incluída no `enforceSizeLimit` (cortada antes das metas).
- Aplica-se também aos fluxos de escrita (`askCreate`/`askLlm`): a seção só aparece se o texto pedir; nenhum custo extra quando não.
- Fora do escopo (follow-up sugerido): aplicar o mesmo filtro por assunto às seções já existentes (metas, investimentos, transações).

## 3. Contratos

```ts
// categories/validations.ts
export const CategoryScopeEnum = z.enum(['transaction', 'investment']);
// create/update/list recebem scope (default 'transaction' para compatibilidade)

// investments/validations.ts
categoryId: z.string().cuid().nullable().optional()

// investments/portfolioSummary.ts
export interface PortfolioSlice { categoryId: string | null; name: string; color: string | null; total: number; pct: number; count: number }
export interface PortfolioSummary { total: number; slices: PortfolioSlice[] } // ordenado por total desc; pct soma 100 (±0,01)
export function summarizeByCategory(investments: Investment[], categories: Category[]): PortfolioSummary

// ai/portfolioIntent.ts
export function wantsPortfolio(question: string): boolean
```

Defaults de investimento (seed, ordem de exibição): Renda Fixa, Renda Variável, Aposentadoria/Previdência, Reserva de emergência, Renda passiva, Cripto, **Outros investimentos** (protegido). Cores/ícones da allowlist existente.

## 4. API
- `GET /api/categories?scope=investment` · `POST /api/categories` `{ …, scope }` · `PATCH|DELETE /api/categories/:id` (scope vem do registro; não editável).
- `POST|PATCH /api/investments` aceitam `categoryId`; categoria de outro usuário/escopo → `400` `{ error: "Categoria inválida." }`.
- Respostas de erro seguem `handleError` existente (mensagens PT-BR calmas, sem vazar detalhes).

## 5. Edge Cases & Tratamento de Erro
- Categoria excluída com ativos → migram para "Outros investimentos"; usuário vê confirmação com a contagem.
- "Outros investimentos" não pode ser excluída nem renomeada (mesma regra do fallback atual).
- `categoryId` de outro usuário/escopo → rejeitado (nunca confiar no cliente).
- Mesmo nome em escopos diferentes é permitido; no mesmo escopo, duplicado → `409` amigável.
- Soma de percentuais com arredondamento: a maior fatia absorve o resto.
- Valor zero/negativo ignorado no resumo; total zero → painel oculto.
- Falha ao carregar categorias na IA → seção omitida, resposta segue sem ela.
- Limite `MAX_CATEGORIES_PER_USER` passa a valer **por escopo**.
- Migração rodada sem a coluna (deploy antes do SQL) → erro tratado com mensagem genérica; documentar ordem: aplicar SQL, depois deploy.

## 6. Critérios de Aceitação
1. `summarizeByCategory` agrupa, ordena, calcula % (soma 100) e cria "Sem categoria" apenas se houver ativos sem categoria; ignora `REDEEMED`.
2. Categorias de transação existentes seguem funcionando sem alteração (`scope` default).
3. Seed de investimento lazy e idempotente; "Outros investimentos" protegido.
4. Excluir categoria migra os ativos para o fallback na mesma transação.
5. Criar/editar investimento com `categoryId` válido salva e exibe badge; inválido → `400`.
6. `/investimentos` renderiza painel (donut + lista + chips), filtra a grade ao clicar; erro do painel não derruba os cards.
7. `/categorias` alterna Transações/Investimentos sem recarregar.
8. `wantsPortfolio` verdadeira para perguntas de investimento e falsa para "quanto gastei com mercado?"; sem a seção no DTO quando falsa.
9. Cache de contexto ignorado quando `wantsPortfolio`; teste garante que DTO com seção não vaza para pergunta sem tema.
10. Nomes de categoria na seção da IA são sanitizados; máx. 8 + "Outras"; DTO ≤ `MAX_CONTEXT_JSON_CHARS`.
11. Borda dos novos cards/painel renderiza com cor do tema no navegador (armadilha `var()`/opacidade).
12. `npx jest <relacionados>` e `npm run lint` verdes. Migração SQL revisada; nenhum `db push` executado.

## 7. Mapa de Execução

| Etapa | Agente | Depende de | Paralelo com |
|---|---|---|---|
| E1 Schema + migração SQL (scope, categoryId) | database-engineer | — | — |
| E2 Services/repos/validações (scope, categoryId, seed, migração de ativos ao excluir) — TDD | backend-engineer | E1 | — |
| E3 `portfolioSummary` + `portfolioIntent` + seção no contexto + cache — TDD | backend-engineer | E2 | E4 |
| E4 UI `/categorias` (toggle) + Select no formulário + badge | frontend | E2 | E3 |
| E5 `PortfolioByCategory` + integração em `InvestmentsSection` (commit imediato → preview Vercel) | frontend | E3 | — |
| E6 Testes de regressão/integração + verificação no navegador (Playwright) | quality-assurance-analyst | E4, E5 | — |
| E7 Revisão de arquitetura e segurança | project-review, security | E6 | — |

Commits por etapa (Conventional Commits, `(FING-27)`); alterações de front-end commitadas assim que validadas.
