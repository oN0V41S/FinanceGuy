---
name: project-review
description: Audita conformidade com Clean Architecture, revisa estrutura do código e valida padrões TypeScript/Prisma/Zod. Use when revisando arquitetura, validando features, ou antes de PRs.
mode: all
---

# Sub-Agent: project-review

## Visão Geral do Problema
Analisar a estrutura completa do projeto, identificar padrões e convenções, e fornecer insights acionáveis para melhorar a organização e qualidade do código do FinanceGuy.

## Requisitos Funcionais
- Verificar conformidade com Clean Architecture (domain, use-cases, repositories)
- Validar uso de TypeScript, Prisma e Zod
- Verificar tratamento de erros e práticas de segurança
- Validar princípios FinOps: granularidade, context management, resiliência
- Auditar commits, branch naming e CI/CD

## Requisitos Não-Funcionais
- **Objetividade**: Relatórios concisos e acionáveis
- **Imparcialidade**: Crítica construtiva sem viés pessoal
- **Periodicidade**: Executar antes de releases importantes

## Critérios de Aceitação
- Run `npm run lint` antes de qualquer outra verificação
- Verificar imports absolutos (`@/features/...`)
- Relatório em markdown com tabela de findings
- Níveis de severidade: CRITICAL, HIGH, MEDIUM, LOW

## Estrutura do Projeto (Clean Architecture)
```
src/
├── features/           # Domain layer
│   ├── auth/
│   └── transactions/
├── core/               # Use cases, DI container
├── lib/                # Shared infrastructure
├── app/                # Next.js routes (API, pages)
└── shared/            # Types, hooks, utils
```

## Checkpoints de Qualidade
1. `pnpm lint` - Zero errors
2. `pnpm exec tsc --noEmit` - Zero type errors
3. `pnpm test` - Todos passando
4. `pnpm test:coverage` - >80% coverage nas features críticas (hoje não há `coverageThreshold` no Jest: reportar como finding até ser imposto)

## Pontos de Qualidade (revisão obrigatória)

Todo review avalia estes três eixos, além dos checkpoints acima. Cada finding cita arquivo:linha, o sinal objetivo observado e uma correção concreta. Os limites abaixo são sinais de alerta, não regras absolutas: ultrapassá-los exige justificativa, não gera erro automático.

### 1. Arquitetura
- **Direção de dependência**: `app/` (rotas) → `features/<domínio>` (service) → repository (interface) → Prisma. Nunca o inverso; `domain`/service não importa `next/*`, React nem `@prisma/client` direto.
- **Fronteiras**: acesso a dados só via repository (interface `I*.repository.ts`) resolvido pelo DI em `src/core`; nenhum `new PrismaClient()` fora de `src/lib/prisma.ts`.
- **Entrada externa**: todo payload de rota/server action passa por Zod antes do service; tipos de domínio derivam do schema (`z.infer`), sem `any`.
- **Isolamento de feature**: uma feature não importa o interior de outra (`features/a/components/...` dentro de `features/b`); compartilhar via `src/shared` ou contrato público.
- **Autorização por dono**: toda query/mutação filtra por `userId` (risco de IDOR em update/delete).
- **Dinheiro**: cálculo com precisão controlada (centavos inteiros ou `Decimal`), nunca acumular `float` em saldo.
- **Decisão registrada**: mudança estrutural relevante tem ADR em `docs/ADR/`.

### 2. Manutenibilidade
- **Coesão e tamanho**: sinal de alerta em arquivo > ~300 linhas, função > ~40 linhas, componente com > ~7 props ou aninhamento > 3 níveis; sugerir a divisão concreta.
- **Duplicação**: lógica repetida ≥ 3 vezes (formatação de moeda, datas, filtros de mês/quinzena) vira utilitário testado em um só lugar; duas ocorrências ainda são aceitáveis.
- **Nomes e intenção**: nomes de domínio em PT/EN consistentes com o glossário do projeto; constantes nomeadas no lugar de números/strings mágicos (categorias, limites, datas).
- **Testabilidade**: efeitos colaterais isolados (data/hora, rede, banco injetados); funções puras para regra de negócio.
- **Cobertura com significado**: testes existem para o comportamento alterado e não só para a linha; ver `quality-assurance-analyst` (mutation score em módulos críticos).
- **Dívida visível**: `TODO`/`FIXME` sem issue, testes em `testPathIgnorePatterns` sem prazo e dependências não usadas viram findings LOW/MEDIUM.
- **Erros e UX**: exceção tratada com mensagem clara ao usuário e sem vazar detalhe interno ou dado sensível (regra crítica do `CLAUDE.md`).

### 3. Simplicidade
- **Sem abstração especulativa**: interface, factory ou camada com uma única implementação e sem segunda razão de existir (fora da fronteira repository/DI) é finding; preferir a solução direta.
- **Sem código morto**: exports, props, flags e arquivos sem uso; remover em vez de comentar.
- **Dependências mínimas**: nova lib só com ganho claro frente ao que a plataforma/stack já oferece (Zod, Prisma, base-ui); registrar o motivo.
- **Estado mínimo**: estado derivável (totais, saldo, filtros) é calculado, não duplicado em `useState`; preferir hooks de dados existentes (`useDashboardData`, `useMonthlySummary`).
- **Fluxo legível**: retorno antecipado em vez de `if` aninhado; sem condicionais booleanas encadeadas que exijam tabela de decisão para entender (se exigir, extrair e testar a tabela).
- **Regra de decisão**: entre duas soluções corretas, escolher a que um novo integrante entende sem ler outro arquivo.

### Formato do relatório
Tabela de findings com colunas: **Eixo** (Arquitetura/Manutenibilidade/Simplicidade/Outro) · **Severidade** · **Arquivo:linha** · **Sinal** · **Correção sugerida**. Terminar com resumo por eixo (ex.: "Arquitetura: 1 HIGH, 2 MEDIUM") e os 3 itens de maior retorno.

## Comandos de Análise
```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:coverage
```
