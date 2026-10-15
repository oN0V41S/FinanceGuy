# Estratégia de Testes — FinanceGuy

**Versão**: 1.0 | **Status**: Ativo | **Última atualização**: 2026-10-14

> Comandos e princípio TDD: [../testing.md](../testing.md). Detalhes operacionais do agente: `.opencode/agents/quality-assurance-analyst.md` (espelho em `.claude/agents/`).

Princípio: **mais confiança com menos testes**. Cobertura de linha mostra o que foi executado, não o que foi verificado.

## 1. Onde investir

- **Testing Trophy**: prioridade para testes de **integração** (service + repository mockado no limite do Prisma; componente + hook + interação com RTL). Unitário puro para regras e funções puras; E2E só para poucos fluxos críticos.
- **Risco = impacto × probabilidade**. Ordem: dinheiro (saldos, parcelas, resgate/IR) → autorização por `userId` → entrada externa (Zod) → fluxo de UI crítico → cosmético.
- Testar **comportamento observável**, não implementação (sem snapshots grandes nem asserts sobre estado interno).

## 2. Como derivar os casos

| Técnica | Uso | Exemplo no FinanceGuy |
|---------|-----|-----------------------|
| Partição de equivalência | Classes de entrada equivalentes | `type`: income / expense; `market`: cada mercado do `MarketEnum` |
| Valor limite | Bordas | `title` 100/101 chars, `description` 255/256, dia 15/16, fim de mês 28–31, valor `0`/`0,01`, data de compra hoje/amanhã+1 dia, alíquota 0/100/101 |
| Tabela de decisão | Regras compostas | Saldo inicial × filtros ativos (tipo, categoria, responsável, pago, busca) |
| Transição de estado | Fluxos com estado | Investimento `ACTIVE` → resgate parcial → resgate total `REDEEMED`; sessão válida → expirada |
| Negativo/erro | Todo ponto de falha | 401/403, payload inválido, banco/cotação indisponível: mensagem amigável, sem vazar detalhe |

Nome do teste: *dado X, quando Y, então Z*. Um comportamento por teste.

## 3. Invariantes (property-based — recomendado)

Para dinheiro, além de exemplos, validar propriedades para qualquer entrada:

- soma das parcelas = valor total (sem perder/ganhar centavo);
- `saldo final = saldo inicial + receitas − despesas`, independentemente da ordem;
- `simulateRedeem`: `netValue = grossValue − taxValue`; `taxValue = 0` se `profit ≤ 0`; `quantidade restante ≥ 0`;
- `round2` idempotente; nunca `NaN`/`Infinity`.

Ferramenta: `fast-check` (**não instalado** — pedir confirmação antes de adicionar).

## 4. Mutation testing (módulos críticos)

StrykerJS **apenas** em: `calculations.ts` (investimentos), `transactions.service.ts`, utils de data/moeda. Meta de referência: ≥ 80% de mutantes mortos; sobreviventes viram novos casos (normalmente um limite faltando). **Não instalado.**

## 5. Contratos e fronteiras

- Schemas Zod (`validations.ts`) são o contrato: testar válido, inválido e limite diretamente.
- Tipos consumidos pelo cliente vêm do mesmo schema (`z.infer`).
- Toda rota: 401 sem sessão, 403/404 para recurso de outro `userId` (IDOR), 400 com erro Zod legível.
- Provedores de cotação (Brapi, Yahoo): testes com respostas **fixas** (fixtures), nunca rede real.
- IA (branches `feat/fing-7-ia-mvp` e `feat/fing-18-agente-escrita`): o modelo **só propõe**; testar com respostas mockadas que nenhuma escrita ocorre sem confirmação do usuário e que não há recomendação de ativo específico.

## 6. Exploratório guiado por persona

Sessões de 30–45 min com charter: *"Explorar [área] como [persona] para descobrir [risco]"*. Resultados: bugs, dúvidas e novos testes automatizados. Os cenários em [scenarios/](./scenarios/README.md) são a fonte dos charters.

## 7. Disciplina da suíte

- Determinismo: tempo congelado (`jest.useFakeTimers` / `setSystemTime`), sem depender de "hoje", fuso, ordem ou rede.
- Teste instável é corrigido ou colocado em `testPathIgnorePatterns` **com issue e prazo**. Hoje há testes ignorados em `jest.config.mjs` (dashboard layout/responsive, auth, landing, cache): tratar como dívida rastreada.
- Todo bug corrigido ganha teste de regressão que falha antes do conserto.
- Mocks restaurados (`jest.restoreAllMocks`); sem `console.log` em teste.

## 8. Definition of Done (testes)

- [ ] Teste escrito antes e visto falhando pelo motivo certo
- [ ] Casos por EP/BVA (+ tabela de decisão/estados se houver regra composta), incluindo erros
- [ ] Caminho de erro: mensagem amigável, sem dado sensível
- [ ] Autorização por `userId` testada em leitura e escrita
- [ ] Sem dependência de data atual, ordem ou rede
- [ ] `npx jest <relacionado>` e `npm run lint` verdes; ≥ 80% nas features críticas
- [ ] Cenário correspondente em `docs/qa/scenarios/` atualizado (e persona citada)

## 9. Ferramentas

| Ferramenta | Estado |
|-----------|--------|
| Jest 30 + React Testing Library + jsdom | Instalado |
| fast-check | Recomendado (não instalado) |
| StrykerJS | Recomendado (não instalado) |
| Playwright (E2E) | Recomendado (não instalado) |
| MSW | Recomendado (não instalado) |

Nova dependência exige confirmação do usuário e motivo registrado (princípio de simplicidade do `project-review`).

## Referências

- [Testing Trophy / Testing Library](https://testing-library.com/docs/guiding-principles/)
- [ISTQB — técnicas de teste de caixa-preta](https://istqb.org/)
- [fast-check](https://fast-check.dev/) · [StrykerJS](https://stryker-mutator.io/docs/stryker-js/introduction/)
