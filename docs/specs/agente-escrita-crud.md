# Spec: Agente de Escrita (CRUD via IA)

**Status**: Approved  
**Versão**: 1.0  
**Última atualização**: 2026-10-13  

---

## 1. Visão Geral

O assistente (`/assistente`, FING-7) passa a **propor** criação, alteração e remoção de **transações, investimentos e categorias**. O usuário revisa um card por ação (Confirmar / Alterar / Cancelar) e só então a escrita acontece. A IA nunca grava.

### 1.1 Objetivo de Negócio
- Registrar lançamentos por conversa ("gastei 50 no mercado hoje") com o mínimo de atrito e de custo de tokens.
- Dar segurança: nada é gravado sem clique explícito; tudo é auditado.
- Entregar a base de sessão (persistência, cache, auto-compact) que o FING-18 (chatbot) usa como fundação.

### 1.2 Dependências
- **FING-7** (módulo `src/features/ai`) commitado. Hoje está só no working tree de `FinanceGuy-fing7`.
- **Fase 2 (investimentos)**: merge do FING-7 em `main` + rebase (ativos de mercado #34: `ticker`, `market`, `shares`, `unitPrice`, `purchaseDate`).
- **Fase 3 (categorias)**: issue `docs/issues/categorias-crud.md` implementada (model `Category`).
- **Correção prévia**: `TransactionService.update/delete` e o repositório não filtram por `userId` (IDOR). Corrigir na Fase 1.
- Gemini `@google/genai` 2.28.0 (function calling). Context caching explícito fora do escopo (indisponível no free tier).

### 1.3 Referências
- `docs/security.md` (revisar: a regra "o modelo não tem tools" muda)
- `docs/specs/transactions-screen.md`, `docs/issues/categorias-crud.md`
- Plano aprovado: `breezy-roaming-harp.md`
- Notion: FING-18 (spec em sub-página), FING-7 (concluído)

### 1.4 Decisões fechadas
| Tema | Decisão |
|---|---|
| Fases | 1 transações → 2 investimentos → 3 categorias. Metas fora. |
| Mecanismo | Function calling sobre tools internas; sem servidor MCP; fronteira compatível com MCP |
| Portão (0 token) | Classificador verbo+entidade e extrator determinístico; se completo, não chama LLM |
| Rate limit | Só chamadas ao LLM consomem a cota; caminho determinístico e confirmações não |
| Segurança | LLM só propõe; execução só no confirm, com Zod, `userId`, claim atômico; ids nunca no LLM |
| Fila | Até 5 ações; um card por ação, entregues juntos; "Confirmar todas (N)" quando todas válidas; inválidos não bloqueiam válidos; seção "Próximos passos" |
| Alvo de alterar/remover | Servidor busca até 5 candidatas do usuário; 1 → card; várias → seleção; 0 → texto |
| Fora do MVP | Desfazer, lote por filtro, múltiplas conversas |

---

## 2. Arquitetura

### 2.1 Estrutura de Arquivos (`src/features/ai`)
```
agent/
  intent.ts · extract.ts · categoryHints.ts · missingFields.ts
  tools.ts · targetResolver.ts · agent.service.ts · action.executor.ts
  entityAdapters/{transaction,investment,category}.ts
session/
  session.service.ts · compact.ts · contextCache.ts
api/actions/…            # rotas finas
components/              # ActionCard, ActionCardList, NextSteps, MissingFieldsNotice,
                         # CandidatePicker, ActionEditForm, CompactedDivider
hooks/useAssistantActions.ts
```
Prisma (migration aditiva, timestamp > `20261006000001`): `ChatSession`, `ChatMessage`, `PendingAction`, `AuditLog` (cuid, `@@map` snake plural, `onDelete: Cascade` em `User`, `@@index([userId])`).

### 2.2 Fluxo de Dados
```
POST /api/ai/ask → Zod (4 KB) → x-user-id
  intent.classify (sem LLM, sem cota)
   ├ read    → fluxo FING-7 (consome cota)
   ├ clarify → texto curto (0 token)
   └ write   → ≤ 5 segmentos; por segmento: extract → targetResolver
        ├ completo        → PendingAction ready (0 token)
        ├ campos faltando → consome cota → LLM tool call (mode ANY, allowedFunctionNames) → Zod → ready | needs_input
        ├ várias candidatas → awaiting_pick
        └ nenhuma         → texto, sem PendingAction
  grava ChatMessage; tokens; ≥ AI_COMPACT_TOKENS → compact
```
Single-turn: a tool call é o resultado final; não há `functionResponse` de volta ao modelo (evita `thoughtSignature`).

### 2.3 Estados
Card: `needs_input` → `ready` → `confirming` → `confirmed` | `failed`; também `awaiting_pick`, `cancelled`, `expired`. UI: loading do envio, erro inline (`role="alert"`), sem toasts.

---

## 3. Contratos

### 3.1 Provider
`LlmRequest` ganha `tools?` e `toolChoice?`; `LlmResponse` ganha `toolCalls?: {name, args}[]`. `GeminiLlmProvider` mapeia para `functionDeclarations[].parametersJsonSchema` (`z.toJSONSchema`), `FunctionCallingConfigMode.ANY` + `allowedFunctionNames`, `automaticFunctionCalling.disable`.

### 3.2 Tipos
```ts
type AgentEntity = 'transaction' | 'investment' | 'category';
type AgentOp = 'create' | 'update' | 'delete';
type ActionStatus = 'needs_input' | 'ready' | 'awaiting_pick' | 'confirming'
  | 'confirmed' | 'failed' | 'cancelled' | 'expired';
interface ActionCardDto {
  id: string; queueId: string; position: number;
  entity: AgentEntity; op: AgentOp; status: ActionStatus; destructive: boolean;
  fields: { key: string; label: string; value: unknown; display: string;
            editable: boolean; missing: boolean; error?: string }[];
  before?: Record<string, unknown>;
  missingFields: { key: string; label: string; example: string }[];
  candidates?: { index: number; label: string }[]; // sem ids
  expiresAt: string;
}
```
`ChatMessage` (frontend) vira união discriminada: `text` (`kind` opcional, compatível), `action_cards`, `pick`, `compacted`; `content: string` sempre presente (resumo acessível).

### 3.3 Dados
- `PendingAction`: `id, userId, sessionId, queueId, position, entity, op, payload Json, targetId?, candidates Json?, before Json?, status, expiresAt, createdAt, resolvedAt?`
- `AuditLog`: `userId, entity, op, entityId, before, after, source='ai-agent', createdAt` (nunca em console)
- `ChatMessage`: `sessionId, userId, role, kind(text|actions|pick|compacted), content, payload Json?, tokens?, compacted`
- `ChatSession`: `userId, summary?, title?, tokenCount, status(active|archived)`
- `User.aiProfile`: descrição livre do usuário (até 2000 caracteres), enviada ao assistente como dado

### 3.4 Env
`AI_COMPACT_TOKENS=80000`, `AI_ACTION_TTL_MINUTES=10`, `AI_CONTEXT_CACHE_TTL_SECONDS=60`, `AI_SESSION_KEEP_MESSAGES=10`, `AI_MAX_QUEUE=5`, `AI_MAX_PENDING=20`.

### 3.5 Regras de campos (transação)
Obrigatórios: `type`, `value > 0`, `date` (padrão hoje), `category`, `responsible` (padrão igual ao `TransactionModal`; confirmar). `title` opcional (≤ 100). `paid` padrão `false` (pendente; só vira pago se o usuário disser). Tipo inferido por verbos ("recebi" → income; "gastei/paguei" → expense). Categoria: palavra-chave; senão a IA sugere entre as existentes.

#### Criação interpretada pelo Gemini (atualização)
- `classifyIntent` (sem LLM) só decide **op + entidade**; na criação o texto do usuário e o contrato de dados vão ao Gemini (`toolChoice` mode ANY, só a tool `propose_transaction_create`, pedido dentro de `<pedido>`), que devolve 1 chamada por lançamento — o próprio LLM define estrutura e quantidade de cards. Preenche só o que o usuário disse; a única inferência permitida é a categoria.
- Padrões aplicados pelo app (não pelo LLM): data = hoje, `paid=false` (rótulo "Pago"/"Não pago"), responsável = apelido/nome do perfil **se não parecer credencial** (`safeName.ts`).
- Categoria ausente: `CategorySuggester` (modelo menor, `AI_CATEGORY_MODEL`, prompt compacto) sugere entre as existentes.
- Dado obrigatório faltando (tipo, valor, categoria, responsável): nenhum card; resposta `clarify` com o que falta e rascunho em `ChatMessage.payload.draft`. A próxima mensagem curta (sem verbo, sem `?`, ≤ 300 caracteres) é enviada ao Gemini junto de `<rascunho>`.
- **Alterar/remover continuam no caminho determinístico** (regex em `extract.ts` + `targetResolver`) por decisão: o alvo precisa ser resolvido no servidor sem expor ids ao modelo; o LLM só entra para completar campos.
- Parcelas/recorrência (espelha o `TransactionModal`): só na criação; `total_installments` 2–48 e `is_recurring`. Parcelado: `value` é o TOTAL (o service divide em N filhas, +1 mês cada). Recorrente: `value` é o de CADA ocorrência e exige a quantidade (senão o assistente pergunta). Um lançamento = uma tool call (nunca uma por parcela). No card é campo informativo (`editable:false`); para mudar, cancelar e pedir de novo.

### 3.6 Utilitários
`formatDateBR` (sem `new Date('YYYY-MM-DD')`), `parseBRL` (extraído de `parseSearchAmount`, com re-export).

### 3.7 Sessão, cache, compact
- Contexto financeiro: cache `ai:ctx:{userId}`, TTL 60 s (Upstash ou memória), invalidado ao confirmar escrita.
- Tokens: `usageMetadata` real; fallback chars/4.
- Compact ao atingir `AI_COMPACT_TOKENS`: resume mensagens antigas (conteúdo tratado como dado), mantém ~10 recentes e todas com ação aberta; antigas ficam visíveis com `CompactedDivider`; falha não derruba a conversa.

---

## 4. API

| Rota | Método | Descrição |
|---|---|---|
| `/api/ai/ask` | POST | Compatível (`answer`, `truncated`) + opcionais `kind, sessionId, queueId, actions, nextSteps` |
| `/api/ai/session` | GET / POST | Hidrata sessão ativa / nova conversa (arquiva a ativa) |
| `/api/ai/sessions` | GET | Lista conversas (id, título, ativa, updatedAt) |
| `/api/ai/sessions/[id]` | PATCH / DELETE | Renomeia (1–60) / exclui |
| `/api/ai/sessions/[id]/activate` | POST | Troca de conversa preservando o contexto |
| `/api/ai/profile` | GET / PUT | Descrição de Perfil (≤ 2000) |
| `/api/ai/actions/[id]` | PATCH | Alterar: revalida Zod, recalcula `missingFields` |
| `/api/ai/actions/[id]/select` | POST | Escolhe candidata |
| `/api/ai/actions/confirm` | POST | `{ ids: string[1..5] }`, executa em ordem, resultado por item |
| `/api/ai/actions/[id]/cancel` | POST | Cancela uma |
| `/api/ai/actions/cancel` | POST | `{ queueId }` cancela restantes |

Erros: 401 sem `x-user-id`; 400 Zod; 404 ação inexistente ou de outro usuário (sem vazar); 409 já resolvida/confirmada; 410 expirada; 429 só no caminho com LLM (`Retry-After`); 5xx mapeados como no FING-7. Executor: claim atômico `updateMany where {id, userId, status:'ready', expiresAt>now}`; `count===1` garante idempotência; antes de alterar/remover, `getById(id, userId)`.

---

## 5. Edge Cases & Tratamento de Erro
- Verbo sem entidade, ou pergunta com palavra de comando: pergunta curta, 0 token.
- > 5 ações ou lote por filtro ("todas de março"): recusa calma com orientação.
- Valor ≤ 0, data inválida, investimento com data futura, `responsible` ausente.
- Ação expirada / já confirmada / cancelada / de outro usuário.
- Falha de rede ao confirmar: card permanece editável e tenta de novo. Falha parcial no lote: resultado por item e "Próximos passos" atualizado.
- Gemini indisponível ou limite: mensagens do FING-7; caminho determinístico segue funcionando.
- Título com texto de injeção: tratado como dado; nunca altera prompt ou tools.
- Limite de `PendingAction` abertas por usuário, com limpeza preguiçosa das expiradas.
- Compactação falha: segue sem compactar e avisa na próxima chamada.
- Mensagens sempre calmas, em PT-BR, sem jargão técnico.

---

## 6. Critérios de Aceitação
1. "Crie despesa de 50 no mercado hoje" gera card `ready` interpretado pelo Gemini (1 chamada, consome cota); confirmar grava a transação do usuário e invalida cache. Um pedido com 2 lançamentos gera 2 cards (quantidade decidida pelo LLM).
2. Sem valor/tipo/categoria/responsável: **nenhum card**; o assistente pergunta o que falta e guarda o rascunho; a resposta seguinte (sem verbo de comando) completa e gera o(s) card(s).
2a. "Notebook em 3x de R$ 100" gera 1 card com `value` 300 e `total_installments` 3 (campo "Parcelas" informativo); "recorrente" sem quantidade pergunta o número de ocorrências.
2b. Responsável padrão com cara de credencial (senha/token, dígitos ou símbolos) é ignorado: o assistente pergunta o responsável.
3. Alterar/remover: 0 candidatas → texto; 1 → card com diff; várias → seleção; ids nunca aparecem na resposta nem no prompt.
4. Usuário B não confirma, edita nem cancela ação do usuário A; dupla confirmação → 409; expirada não executa.
5. Lote de 3 válidos: 3 cards individuais + "Confirmar todas (3)" em uma requisição; com um inválido, os válidos seguem confirmáveis.
6. "Próximos passos" reflete concluídas, pendentes e falhas após cada resolução.
7. Toda escrita gera `AuditLog` com antes e depois; nenhum payload em console.
8. Sessão sobrevive ao reload; ≥ 80k tokens compacta mantendo ~10 recentes e ações abertas, com divisor.
9. Testes atuais do módulo de IA seguem verdes sem alteração.
10. Barra lateral: criar, alternar, renomear e excluir (com confirmação) conversas; título automático via Gemini com fallback; Perfil salvo e usado nas respostas; o system prompt informa as capacidades de escrita ao modelo.
11. `tsc --noEmit`, `pnpm lint`, `npx jest`, `pnpm build` limpos; cobertura do novo código > 80%.

---

## 7. Mapa de Execução

**Onda 0 (sequencial)**: commit do FING-7 (usuário) → spec aprovada → Notion → `tech-lead`/`backend-engineer` congela contratos em `types.ts`.

**Onda 1 (paralela, Fase 1)**: `database-engineer` (schema/migration) ∥ `backend-engineer` A (`intent`, `extract`, `categoryHints`, `missingFields`) ∥ `backend-engineer` B (ownership no `TransactionService`, `searchTransactions`, extensão do provider).

**Onda 2 (paralela)**: `backend-engineer` C (`agent.service`, `targetResolver`, `action.executor`, rotas, auditoria) ∥ `backend-engineer` D (`session.service`, `contextCache`, `compact`) ∥ `frontend` (componentes, hook, utilitários).

**Onda 3 (sequencial)**: `frontend` (integração, hidratação) → `quality-assurance-analyst` → `security-secret-auditor` (+ revisar `docs/security.md`) → `docs-architect` → `project-review`.

**Fase 2** (após merge do FING-7 e rebase em `main`): repete Ondas 1–3 com `entityAdapters/investment.ts`; resgate fora; índices `^` bloqueados.
**Fase 3** (após `categorias-crud`): `entityAdapters/category.ts`; exclusão exige `reassignTo`; tool só registrada se `CategoryService` existir.

TDD em todas as tarefas: o teste nasce desta spec e falha antes do código.
