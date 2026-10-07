## ✨ Feature: Ativos de mercado com cotação via API pública, rendimento, resgate com imposto e histórico

### Resumo
Permitir ao usuário **cadastrar um ativo** (ações BR/EUA, FIIs, ETFs, cripto, câmbio, etc.) informando **quando investiu**, ver **quanto rendeu** com base em cotações de APIs públicas/gratuitas e, ao **resgatar**, calcular o **imposto estimado** e **salvar a operação no histórico de investimentos**. A arquitetura deve deixar pronto o gancho para **alertas automáticos** (fase futura).

### Contexto atual
- `Investment` hoje é um registro estático (`name`, `type` Renda Fixa/Variável, `value`, `quantity` e `term` como string). Não há ticker, data de aplicação, preço, cotação nem histórico.
- Feature existente em `src/features/investments/` (service, repository Postgres, Zod, API, `InvestmentCard`, `InvestmentFormDialog`, `useInvestments`). **Evoluir, não duplicar.**

### Decisões de produto (fechadas)
| Tema | Decisão |
|---|---|
| Provedores de cotação | **brapi.dev** (B3: ações, FIIs, ETFs, BDRs, cripto, câmbio) + **Yahoo Finance** (EUA e demais). Ambos atrás de uma interface `IQuoteProvider`, trocáveis. |
| Imposto no resgate | **Alíquota informada pelo usuário** (%), sem regras fiscais embutidas. UI deixa claro que é **estimativa**, não substitui contador. |
| Alertas | **Fora do escopo** desta issue; apenas modelagem/ganchos (ver "Fase futura"). |

### Escopo

#### 1. Modelo de dados (Prisma) — `database-engineer`
- Estender `Investment` (campos novos opcionais para não quebrar dados existentes):
  - `ticker String? @db.VarChar(20)`, `market String?` (`BR` | `US` | `CRYPTO` | `FX` | `OTHER`), `currency String @default("BRL")`
  - `purchaseDate DateTime? @db.Date`, `unitPrice Decimal? @db.Decimal(16,6)`, `quantityNumber Decimal? @db.Decimal(18,8)` (migrar `quantity` string → numérico; manter legado até migração de dados)
  - `status String @default("active")` (`active` | `redeemed`)
- Novo model `InvestmentTransaction` (histórico, tabela `investment_transactions`):
  `id`, `investmentId`, `userId`, `kind` (`buy` | `redeem`), `date`, `quantity`, `unitPrice`, `grossValue`, `taxRate`, `taxValue`, `netValue`, `profit`, `note?`, `created_at`. Índices em `userId` e `investmentId`, `onDelete: Cascade`.
- Cache opcional `QuoteCache` (`symbol`, `provider`, `price`, `currency`, `fetchedAt`) para respeitar rate limit das APIs.
- Usar `prisma db push` só em dev; gerar migration para produção.

#### 2. Cotações (backend) — `backend-engineer`
- `src/features/investments/quotes/`: `IQuoteProvider`, `BrapiQuoteProvider`, `YahooQuoteProvider`, `QuoteService` (escolhe provider por `market`, cache com TTL ~15 min, fallback entre providers, timeout).
- Endpoint `GET /api/investments/quotes?symbol=PETR4&market=BR` (autenticado, Zod na entrada) e busca de ticker (`/api/investments/search?q=`).
- Chaves/tokens só via env (nunca logar). Erros de API externa viram resposta amigável (`503` com mensagem) e a UI cai para "última cotação conhecida".
- Conversão de moeda (USD→BRL) via câmbio do próprio provider quando `currency != BRL`.

#### 3. Regras de negócio — `backend-engineer`
- **Rendimento**: `valorAtual = quantity × cotaçãoAtual`; `lucro = valorAtual − (quantity × unitPrice)`; `rentabilidade % = lucro / custo`. Multi-compras do mesmo ativo usam **preço médio**.
- **Resgate** (total ou parcial): `bruto = qty × preçoResgate`; `lucro = bruto − custo proporcional`; `imposto = max(lucro, 0) × taxRate`; `líquido = bruto − imposto`. Prejuízo ⇒ imposto 0. Parcial reduz quantidade; total marca `status = redeemed`.
- Tudo em `Decimal` (sem `float`) e em serviço puro/testável.
- Cada compra/resgate grava um `InvestmentTransaction`. **Decisão de produto: o resgate NÃO gera `Transaction`** (evita duplicar saldo). O histórico de investimentos é a fonte única: guarda compra, venda e **valor final** (bruto, imposto, líquido, lucro) para **consulta do usuário** e uso pelo **RAG** da IA.
- **Snapshot imutável**: cada registro guarda ticker, nome, mercado, moeda, quantidade, preço, datas e valores finais no momento da operação (não depender do `Investment` atual nem de cotação futura), para que consultas e RAG reflitam o fato histórico mesmo se o ativo for editado/removido (avaliar `onDelete: SetNull` em vez de `Cascade` no `investmentId`).
- **Pronto para RAG**: expor serviço de leitura (`getInvestmentHistoryForUser`) com resumo textual/estruturado por operação (ex.: "Comprou 10 PETR4 a R$ 35,00 em 10/01; vendeu em 05/09 a R$ 40,00; lucro R$ 50,00; imposto R$ 7,50; líquido R$ 392,50"), sempre escopado por `userId`.

#### 4. API — `backend-engineer`
- `POST /api/investments/:id/redeem` (body: `quantity`, `unitPrice?` default = cotação atual, `taxRate`, `date`) → retorna simulação **e** persiste.
- `POST /api/investments/:id/redeem/preview` (simula sem gravar).
- `GET /api/investments/history` (filtros por ativo/período/tipo) e `GET /api/investments/:id/history`.
- `GET /api/investments` passa a devolver `currentPrice`, `currentValue`, `profit`, `profitPct`.
- Todas validadas com Zod, escopadas por `userId` (x-user-id do proxy).

#### 5. UI — `frontend`
- `InvestmentFormDialog`: campos ticker (com busca/autocomplete), mercado, data da compra, quantidade, preço unitário (sugerir cotação do dia da data via API quando possível). Manter fluxo existente para Renda Fixa.
- `InvestmentCard`: cotação atual, valor atual, lucro/prejuízo (cor + sinal), rentabilidade %, botão **Resgatar**.
- `RedeemDialog`: quantidade (total/parcial), preço, **alíquota %**, preview bruto/imposto/líquido com aviso "estimativa".
- Aba/seção **Histórico de investimentos** (lista agrupada por mês, filtros).
- Estados: `<Skeleton>` para cotações (não `LazyLoad` na página inteira), erro de cotação com mensagem calma + retry, vazio claro. Em `Select` (@base-ui) sempre passar o label em `SelectValue`.

#### 6. Preparação para alertas (apenas ganchos)
- Modelo futuro `InvestmentAlert` (`investmentId`, `condition` `price_above|price_below|profit_pct`, `threshold`, `channel`, `active`) **não implementado** agora.
- `QuoteService` expõe método reutilizável por um futuro job (cron/Vercel Cron) que avalia alertas; e-mail já existe em `src/lib/email/`.

### Fora de escopo
Alertas/notificações, cálculo fiscal automático, DARF/IRPF, integração com corretoras, preços históricos intradiários, dividendos/proventos.

### Critérios de aceite
- [ ] Usuário cadastra ativo com ticker, data, quantidade e preço e vê cotação atual, valor atual, lucro e rentabilidade %.
- [ ] Funciona para ao menos 1 ativo BR (ex.: `PETR4`) e 1 EUA (ex.: `AAPL`, convertido p/ BRL).
- [ ] Resgate total e parcial com alíquota informada; prejuízo ⇒ imposto 0; preview não persiste.
- [ ] Resgate grava `InvestmentTransaction` e aparece no Histórico; resgate total move o ativo para `redeemed`.
- [ ] Resgate **não** cria `Transaction` nem altera o saldo de transações (teste garantindo).
- [ ] Histórico mantém compra, venda e valor final (bruto/imposto/líquido/lucro) como snapshot e continua legível após editar/excluir o ativo.
- [ ] Serviço de leitura do histórico escopado por `userId`, pronto para consumo pelo RAG.
- [ ] Falha/timeout/limite da API externa não quebra a tela (usa cache/última cotação + mensagem amigável).
- [ ] Dados existentes de `Investment` continuam funcionando (migração não destrutiva).
- [ ] Cálculos com `Decimal`; entradas validadas com Zod; sem `any`; nenhum segredo logado.
- [ ] Testes Jest (TDD) para: cálculo de rendimento/preço médio, resgate/imposto, providers (mock de fetch), service de cotação (cache/fallback), rotas, hook e dialogs.
- [ ] `npx jest src/features/investments` e `npm run lint` passando.

### Mapa de execução (sub-agentes)
```
Etapa 0 (sequencial)  docs-architect ──► fecha spec + registra no Notion (FING-XX)
Etapa 1 (sequencial)  database-engineer ──► schema Prisma + migration  ── bloqueia 2/3/4
Etapa 2 (paralelo)    ├─ backend-engineer A: quotes (providers, cache, endpoints)
                      ├─ backend-engineer B: regras de rendimento/resgate + history API
                      └─ quality-assurance-analyst: testes (TDD) escritos antes de cada serviço
Etapa 3 (paralelo)    ├─ frontend: form/card/aba histórico   (depende de 2A/2B)
                      └─ frontend: RedeemDialog + preview     (depende de 2B)
Etapa 4 (sequencial)  security-secret-auditor ──► env/rate limit/escopo por userId/SSRF nos providers
Etapa 5 (sequencial)  quality-assurance-analyst ──► jest + lint + E2E manual (Playwright)
Etapa 6 (sequencial)  project-review ──► revisão de arquitetura, depois PR (GitHub Flow, squash)
```

### Riscos / pontos a validar
- Limites de rate das APIs gratuitas (mitigado por cache + fallback). Yahoo não tem API oficial gratuita estável: manter isolado no adaptador.
- Termos de uso das APIs para exibição de cotação ao usuário final.
- Migração de `quantity` (string) para numérico.
- ~~Resgate gera `Transaction`?~~ **Decidido: não.** Histórico de investimentos é a fonte única (consulta + RAG).
- Privacidade: dados do histórico enviados ao RAG/LLM devem respeitar `docs/security.md` (escopo por usuário, sem dados sensíveis em logs).

**Labels sugeridas:** `feature`, `investments`, `backend`, `frontend`, `database`
**Notion (schema):** Código FING-XX · Nome "Ativos de mercado: cotação, rendimento e resgate" · Status Backlog · Prioridade Alta · Side Full-stack · Versão a definir
