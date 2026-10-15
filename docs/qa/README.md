# Base de Conhecimento de QA — FinanceGuy

**Versão**: 1.0 | **Status**: Ativo | **Última atualização**: 2026-10-14

Ponto de entrada único para qualidade: estratégia, checklists, armadilhas conhecidas e cenários de teste guiados por persona.

## Mapa

| Documento | Para quê |
|-----------|----------|
| [test-strategy.md](./test-strategy.md) | Como decidimos **o que** e **como** testar (risco, técnicas, ferramentas, Definition of Done) |
| [regression-checklist.md](./regression-checklist.md) | Roteiro de regressão antes de release/PR grande |
| [known-pitfalls.md](./known-pitfalls.md) | Bugs e armadilhas que já aconteceram — não repetir |
| [scenarios/README.md](./scenarios/README.md) | Formato dos cenários e como ligá-los a testes |
| [scenarios/transactions.md](./scenarios/transactions.md) | Cenários de transações (parcelas, recorrência, quinzena, saldo inicial) |
| [scenarios/investments.md](./scenarios/investments.md) | Cenários de investimentos (ativos de mercado, posição, resgate com IR) |
| [scenarios/goals.md](./scenarios/goals.md) | Cenários de metas |
| [../product/personas/README.md](../product/personas/README.md) | Personas que dão **perfil de usuário** aos cenários |
| [../testing.md](../testing.md) | Comandos Jest e princípio TDD (referência rápida) |
| [../debugging.md](../debugging.md) | Investigação de falhas |

## Como usar

1. **Vai implementar?** Spec → cenários da área (escolha a persona afetada) → teste falhando (TDD) → código.
2. **Vai revisar?** Rode o agente `project-review` (arquitetura, manutenibilidade, simplicidade) e confira o checklist.
3. **Vai liberar?** Execute o [regression-checklist](./regression-checklist.md) com pelo menos uma persona por fluxo alterado.
4. **Achou bug?** Escreva o teste de regressão primeiro e registre a causa em [known-pitfalls](./known-pitfalls.md) se for recorrente.

## Agentes e skills

Os agentes `quality-assurance-analyst` e `project-review` existem em dois lugares, mantidos iguais:

- `.opencode/agents/` e `.opencode/skills/` — OpenCode
- `.claude/agents/` e `.claude/skills/` — Claude Code (carregados nativamente)

Ao alterar um, **atualize o outro no mesmo commit**.

## Dados de teste

- Use a conta de desenvolvimento local (ver seed/`.env.example`; **nunca** commitar credenciais reais nem de produção).
- Limpe os dados criados após testes manuais.
- Persona ≠ conta real: personas são hipóteses de perfil (ver README de personas), não usuários reais.
