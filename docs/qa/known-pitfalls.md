# Armadilhas Conhecidas — QA

**Versão**: 1.0 | **Status**: Ativo | **Última atualização**: 2026-10-14

Problemas que já ocorreram ou são fáceis de repetir. Cada item vira verificação em revisão/teste. Complementa a seção "Armadilhas Conhecidas" do `CLAUDE.md`.

| # | Armadilha | Sintoma | Como evitar / testar |
|---|-----------|---------|----------------------|
| 1 | `SelectValue` do `@base-ui/react` não mostra o `ItemText` | Aparece a chave interna (`last6`, `2025-s1`) | Passar `children` mapeando valor → rótulo; `SelectContent className="bg-surface-container"`. Teste RTL: o texto visível é o rótulo |
| 2 | `LazyLoad` em excesso ou `setTimeout` para simular loading | Conteúdo estático atrasado, skeleton desnecessário | `LazyLoad` só em seções assíncronas; `Skeleton` por componente; proibido `setTimeout` de loading |
| 3 | `MOCK_DATA` como fallback de produção | Usuário vê dados falsos quando a API falha | Dados só dos hooks (`useDashboardData`, `useMonthlySummary`); erro explícito e amigável |
| 4 | Data de compra recua um dia (fuso/UTC) | Registro mostra dia anterior (corrigido em e05e4d9) | Testar datas em `YYYY-MM-DD` com relógio fixo e fuso diferente de UTC; não usar `new Date(str)` + `toISOString()` para exibir |
| 5 | Data futura de compra | Investimento "comprado amanhã" | `CreateInvestmentSchema` recusa > hoje + 1 dia; teste BVA em hoje, +1 dia, +1 dia e 1 ms |
| 6 | Sufixo `.SA` aplicado a índices/pares no Yahoo (`^BVSP`, `BRL=X`) | Cotação não encontrada (corrigido em 30d9b51) | Teste do provider com ticker de índice/par; índice bloqueado no cadastro (da57b33) |
| 7 | Ponto flutuante em dinheiro | Centavo a mais/menos em parcelas, médias e IR (`0,1 × 3`) | `round2`; teste da soma das parcelas = total; propriedades com centavos inteiros |
| 8 | Parcelas = `value / total_installments` sem arredondamento (`createTransaction`) | Valor com dízima (ex.: 100 ÷ 3 = 33,333…) e soma das parcelas fora do total em centavos | **Achado a confirmar/corrigir**: arredondar a 2 casas e jogar o resíduo na última parcela; teste soma das parcelas = total com valor não divisível |
| 9 | Autorização só no cliente / sem `userId` na query | IDOR: editar/excluir recurso de outro usuário | Toda query filtra por `userId`; teste: usuário B acessa recurso de A → 403/404 |
| 10 | Saldo inicial ignora filtros ativos | Saldo não bate com a lista filtrada | `OpeningBalanceFilters` espelha os filtros da lista; tabela de decisão no cenário T-08 |
| 11 | Cache de service devolve dado velho após mutação | Lista não reflete criação/edição | Testar invalidação (`transactions.service.cache.test.ts` como modelo) |
| 12 | Modal não rola em tela baixa | Botão de salvar inacessível (corrigido em e05e4d9) | Verificar viewport 375×600 nos modais com formulário longo |
| 13 | Testes ignorados em `jest.config.mjs` | Regressão passa despercebida | Cada ignore com issue e prazo; revisar a lista a cada release |
| 14 | Marcadores de conflito commitados | Doc/código inválido (ocorreu em `.opencode/agents/project-review.md`) | Checar `git grep "^<<<<<<<"` no regression-checklist e no CI |
| 15 | Lib com API sensível a versão (NextAuth v5 beta, Zod v4, Next 16, base-ui) | Código que "parece certo" mas não existe na versão | Consultar Context7 MCP antes de implementar (regra do `CLAUDE.md`) |
| 16 | Teste que depende de "hoje" | Falha só em certos dias/virada de mês | Relógio fixo (`jest.setSystemTime`); casos explícitos de fim de mês e 15/16 |
| 17 | Mensagem de erro técnica ao usuário | Stack, SQL ou token na tela/log | Mensagem amigável + log sem dados sensíveis; teste do caminho de erro |
| 18 | Parcelado grava a transação **pai com o valor total** e mais N filhas | Possível dupla contagem em totais/saldo se a consulta somar pai + filhas | **A verificar**: cenário T-04 confere o total do mês com uma compra parcelada; confirmar que o pai fica fora das somas |
| 19 | Criação de parcelas é sequencial, sem transação de banco | Falha no meio deixa pai e parte das filhas gravados | **A verificar**: teste com repositório falhando na parcela k; considerar `prisma.$transaction` |

## Como adicionar um item

1. Reproduza com um teste que falha.
2. Corrija.
3. Registre aqui: sintoma, causa, como evitar e commit/PR de referência.
