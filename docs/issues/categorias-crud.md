## ✨ Feature: Gerenciamento de Categorias de transações (CRUD com categorias padrão)

### Resumo
Hoje as categorias são um `z.enum` fixo e hardcoded (`CategoryEnum` em `src/features/transactions/validations.ts`: Alimentação, Transporte, Casa, Saúde, Educação, Lazer, Salário, Investimentos, Outros). O usuário não consegue criar, renomear nem remover categorias. Esta issue transforma categorias em **dados por usuário**: todo usuário recebe um **conjunto padrão** e pode **criar, editar e excluir** (com reatribuição segura) suas categorias, numa tela dedicada acessível pela navegação.

### Contexto atual (auditoria)
- `Transaction.category` é `String` no Prisma (`@@index([category])`), validado só por `CategoryEnum` no Zod — **sem tabela de categorias**.
- Consumidores do enum: `TransactionModal.tsx` (`categoryOptions = CategoryEnum.options` + refine), `FilterControls.tsx` (select de categoria), `CategoryBreakdown.tsx` (dashboard, agrega por `t.category`), `postgresTransaction.repository.ts` (filtro `where.category` e busca textual), `src/lib/swagger.ts`, `useFinanceData`/`useTransactions`.
- Navegação: `HeaderLayout.tsx` e `MobileNavBar.tsx` (`src/features/dashboard/components/`). Padrão de feature a seguir: `src/features/investments/` e `src/features/goals/` (service, repository Postgres, Zod, API, hooks SWR, `src/app/<rota>/page.tsx`).
- **Evoluir, não duplicar.** Dados existentes não podem quebrar.

### Decisões de produto (fechadas — ajustar na revisão se necessário)
| Tema | Decisão |
|---|---|
| Escopo das categorias | **Por usuário** (isolamento total por `userId`). |
| Padrão | 9 categorias atuais viram **defaults semeados por usuário** (linhas reais, `isDefault = true`), criadas de forma **lazy e idempotente** no primeiro acesso (sem migration de dados em massa). |
| Editar defaults | Pode **renomear / mudar cor e ícone**. **Não pode excluir** defaults. A categoria **"Outros"** é o fallback protegido (nem excluível nem renomeável). |
| Tipo da categoria | `income` \| `expense` \| `both`. O modal de transação lista só categorias compatíveis com o tipo selecionado. |
| Excluir categoria com transações | Exige **reatribuição**: UI pede a categoria de destino (default "Outros"); a operação é atômica. Sem transações → exclusão direta. |
| Renomear | Propaga para as transações existentes (atômico). |
| Compatibilidade | `Transaction.category` **continua `String`** (nome da categoria) — sem FK nesta fase, preservando filtros, dashboard, RAG e testes atuais. |
| Unicidade | Nome único por usuário, **case-insensitive e sem acento**, 1–40 caracteres. |
| Limite | Máx. **50 categorias** por usuário (proteção de abuso/UX). |
| Fora de escopo | Subcategorias, orçamento por categoria, regras de auto-categorização por IA (ganchos apenas), compartilhamento entre usuários. |

### Escopo

#### 1. Modelo de dados (Prisma) — `database-engineer`
Novo model (tabela `categories`):
```prisma
model Category {
  id         String   @id @default(cuid())
  name       String   @db.VarChar(40)
  nameKey    String   @db.VarChar(40)   // normalizado (lowercase, sem acento) p/ unicidade
  type       String   @default("both") @db.VarChar(10) // 'income' | 'expense' | 'both' (Zod, não enum de DB)
  color      String?  @db.VarChar(9)    // hex '#RRGGBB'
  icon       String?  @db.VarChar(40)   // chave de ícone (lucide)
  isDefault  Boolean  @default(false)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([userId, nameKey])
  @@index([userId])
  @@map("categories")
}
```
- Adicionar `categories Category[]` em `User`.
- **Nenhuma alteração** em `Transaction` (sem FK). Migration aditiva (`prisma migrate dev`); `db push` só em dev.
- Constante `DEFAULT_CATEGORIES` (nome, tipo, cor, ícone) em `src/features/categories/defaults.ts` — fonte única do seed.

#### 2. Backend — `backend-engineer`
Estrutura `src/features/categories/` (Clean Architecture, DI em `src/core`):
- `types.ts`, `validations.ts` (Zod: `CreateCategorySchema`, `UpdateCategorySchema`, `DeleteCategorySchema` com `reassignTo?`), `ICategory.repository.ts`, `postgresCategory.repository.ts` (usa singleton `src/lib/prisma.ts`), `categories.service.ts`, `normalizeCategoryName.ts` (trim, NFD sem acento, lowercase).
- **Service**:
  - `ensureDefaults(userId)` — `createMany({ skipDuplicates: true })`, idempotente e seguro sob concorrência (índice único).
  - `list(userId)` — chama `ensureDefaults` e devolve ordenado (defaults primeiro, depois alfabético) + `transactionCount` por categoria.
  - `create`, `update` (rename propaga em `prisma.$transaction`: `category.update` + `transaction.updateMany({ where: { userId, category: oldName } })`), `remove` (reatribui e exclui em `$transaction`).
  - Regras: bloqueia excluir default/“Outros”, bloqueia renomear “Outros”, limite de 50, unicidade por `nameKey`, destino de reatribuição ≠ origem e pertencente ao usuário.
- **Integração com transações**: substituir `CategoryEnum` por validação dinâmica. `CreateTransactionSchema.category` passa a `z.string().trim().min(1).max(40)`; o **service de transações valida** que a categoria existe para o `userId` (e é compatível com o `type`), retornando erro de domínio claro. `CategoryEnum` permanece **apenas** como alias de `DEFAULT_CATEGORIES` para compat/seed (marcar `@deprecated`).
- Invalidar cache SWR/`unstable_cache` de transações e dashboard após rename/delete (ver `transactions.service.cache.test.ts` para o padrão).

#### 3. API — `backend-engineer`
Todas autenticadas, validadas com Zod, escopadas por `userId` (x-user-id do proxy), erros amigáveis (nunca vazar stack):
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/categories` | Lista (semeia defaults se necessário); `?type=income\|expense` filtra compatíveis. |
| POST | `/api/categories` | Cria. `201`; `409` nome duplicado; `422` limite atingido. |
| PATCH | `/api/categories/:id` | Edita nome/tipo/cor/ícone. `403` p/ ações proibidas em “Outros”; `409` duplicado. |
| DELETE | `/api/categories/:id` | Body/query `reassignTo` obrigatório se houver transações. `403` p/ default; `409` se `reassignTo` ausente com transações. |
- Documentar no Swagger (`src/lib/swagger.ts`) e em `docs/BACKEND.md`.
- Mudança de `type` com transações incompatíveis existentes: **permitido**, mas retorna aviso (não migra transações); filtros continuam funcionando.

#### 4. UI — `frontend`
- Nova rota `src/app/categorias/page.tsx` + `src/features/categories/components/`:
  - `CategoriesList` (cards/linhas com cor, ícone, nome, tipo, nº de transações, selo “Padrão”).
  - `CategoryFormDialog` (criar/editar: nome, tipo, seletor de cor predefinida, seletor de ícone).
  - `DeleteCategoryDialog` — se `transactionCount > 0`, exige escolher destino de reatribuição (select com label explícito) e mostra quantas transações serão movidas; reaproveitar `ConfirmDeleteDialog` quando sem transações.
  - Hooks SWR `useCategories` / mutations com `mutate` otimista + rollback.
- **Navegação integrada**: item “Categorias” em `HeaderLayout.tsx` e `MobileNavBar.tsx` (ordem a definir com o design), rota ativa destacada; opcionalmente atalho “Gerenciar categorias” dentro do select do `TransactionModal`.
- Refatorar consumidores para buscar do hook em vez do enum: `TransactionModal` (filtra por tipo; se a categoria da transação editada foi removida/renomeada, ainda exibir o valor atual), `FilterControls`, `CategoryBreakdown` (usar `color` da categoria quando existir; fallback à paleta atual).
- Regras de UI do projeto: `@base-ui/react` **`SelectValue` com `children` mapeando value → label** + `className="bg-surface-container"` no `SelectContent`; `<Skeleton>` para loading (sem `LazyLoad` na página inteira, sem `setTimeout`, sem `MOCK_DATA`); tokens de `docs/ui-guidelines.md`; responsivo (mobile first) e acessível (labels, foco, `role="alert"` nos erros).

#### 5. Tratamento de erros / UX (crítico)
- Mensagens calmas e acionáveis em PT-BR: “Já existe uma categoria com esse nome.”, “Você atingiu o limite de 50 categorias.”, “Escolha para onde mover as N transações antes de excluir.”, “Não foi possível salvar agora. Tente novamente.”
- Falha de rede/servidor: toast + manter formulário preenchido + retry; nunca perder dados digitados.
- Operações de rename/delete são **atômicas** (tudo ou nada); a UI nunca mostra estado parcial.
- Falha ao semear defaults não pode bloquear transações: fallback para `DEFAULT_CATEGORIES` em memória (somente leitura) com aviso discreto.

#### 6. Segurança
- Escopo `userId` em **toda** query (incluindo `updateMany` de transações e validação do destino de reatribuição) — teste explícito de IDOR.
- Zod em toda entrada; `name` sanitizado (sem HTML; renderização sempre escapada pelo React); `color` validada por regex `^#[0-9A-Fa-f]{6}$`; `icon` validado contra allowlist.
- Sem logar dados sensíveis; rate limit herdado do proxy.

#### 7. Ganchos futuros (sem implementar)
- `categoryId` FK em `Transaction` (migração gradual a partir do nome).
- Orçamento mensal por categoria; categorização automática por IA/RAG usando as categorias do usuário.

### Plano de execução (sub-agentes)
```
Fase 0 (sequencial)   docs-architect ─► ajusta docs/architecture.md + BACKEND.md (contrato)
Fase 1 (sequencial)   database-engineer ─► model Category + migration + defaults.ts
Fase 2 (paralelo)  ┬─ backend-engineer ─► repository/service/API + integração c/ transações (TDD)
                   └─ frontend ─► CategoriesList/Dialogs/hooks contra contrato mockado (TDD)
Fase 3 (sequencial)   frontend + backend ─► refatorar TransactionModal / FilterControls / CategoryBreakdown + nav
Fase 4 (paralelo)  ┬─ quality-assurance-analyst ─► regressão, E2E, IDOR
                   ├─ security-secret-auditor ─► revisão de segurança
                   └─ docs-architect ─► Swagger, TECHNICAL_DOCS
Fase 5                project-review ─► revisão final + lint/test/build
```

### Testes (TDD — escrever antes)
- **Repository/Service**: `ensureDefaults` idempotente (2 chamadas = 9 linhas) e concorrente; create (ok, duplicado por acento/caixa, limite 50); rename propaga às transações e é atômico (falha no meio ⇒ nada muda); delete com/sem transações, sem `reassignTo` ⇒ erro, destino inválido/de outro usuário ⇒ erro; defaults/“Outros” protegidos; isolamento por `userId`.
- **API**: status codes (`201/200/400/401/403/404/409/422`), validação Zod, auth obrigatória.
- **Transações**: criar/editar com categoria inexistente ⇒ erro de domínio; categoria incompatível com `type` ⇒ erro; usuários antigos continuam funcionando (lazy seed).
- **UI (RTL)**: listagem, criar/editar/excluir (com e sem reatribuição), erros de rede preservam formulário, `SelectValue` exibe label (não a chave), modal de transação filtra por tipo, categoria removida ainda exibida na edição, navegação mostra item ativo (desktop e mobile).
- **Regressão**: suites existentes de transactions/dashboard/FilterControls/CategoryBreakdown permanecem verdes.

### Critérios de aceite
- [ ] Usuário novo (e antigo, sem migração de dados) vê as 9 categorias padrão em `/categorias` e no modal de transação.
- [ ] É possível criar, editar (nome/tipo/cor/ícone) e excluir categorias personalizadas.
- [ ] Renomear atualiza todas as transações da categoria; excluir com transações exige destino e move tudo atomicamente.
- [ ] Defaults não podem ser excluídos; “Outros” não pode ser excluída nem renomeada.
- [ ] Nomes duplicados (ignorando caixa/acento) e acima do limite são rejeitados com mensagem clara.
- [ ] `TransactionModal`, `FilterControls` e `CategoryBreakdown` usam as categorias do usuário (sem enum hardcoded) e respeitam a cor.
- [ ] Item “Categorias” na navegação desktop e mobile.
- [ ] Nenhuma query sem `userId`; teste de IDOR passando.
- [ ] `npx jest <relacionado>` e `npm run lint` verdes; sem `any`; imports `@/...`; Prisma via singleton.
- [ ] Swagger e `docs/BACKEND.md` atualizados.

### Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Transações antigas com categoria que não existe mais no catálogo | Seed cobre as 9 atuais; no modal/filtros exibir valor atual mesmo fora do catálogo; script opcional de reconciliação. |
| Rename/delete em massa lento | `updateMany` indexado por (`userId`, `category`); considerar índice composto se necessário. |
| Corrida no seed lazy | `@@unique([userId, nameKey])` + `skipDuplicates`. |
| Quebra de testes que usam `CategoryEnum` | Manter alias `@deprecated` e migrar testes gradualmente. |

### Questões em aberto (decidir na revisão)
1. Permitir **ocultar/arquivar** defaults que o usuário nunca usa (em vez de só proibir exclusão)?
2. Ícone/cor: lista predefinida (proposto) ou seletor livre?
3. Posição do item “Categorias” na navegação (ou dentro de um menu “Configurações”)?

**Labels sugeridas:** `enhancement` · **Prioridade:** Média · **Side:** Back-End + Front-End + Banco de Dados · **Versão:** V2
