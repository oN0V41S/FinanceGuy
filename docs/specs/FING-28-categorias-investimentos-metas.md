# Spec: Vínculo entre Metas e Categorias de Investimento (FING-28)

**Status**: Draft (follow-up de FING-27)
**Versão**: 1.0
**Última atualização**: 2026-10-20

## 1. Visão Geral
**Objetivo**: mostrar quanto de cada meta (`Goal`) já está coberto por investimentos de uma categoria, por exemplo "Aposentadoria: R$ 12.000 de R$ 100.000 (12%)".

**Dependência**: FING-27 (categorias de investimento com `scope = 'investment'` e `Investment.categoryId`).

**Fora de escopo**: valor de mercado/cotação, alocação automática, qualquer alteração em transações.

## 2. Proposta
- `Goal.investmentCategoryId` opcional (`onDelete: SetNull`); no máximo uma categoria por meta.
- Progresso da meta = valor existente (`current`) + soma de `Investment.value` ativos da categoria vinculada (a regra exata, somar ou substituir, é decisão do grill-me desta spec).
- Formulário de meta ganha Select "Categoria de investimento" (opcional).
- Card da meta mostra o valor vindo da carteira e o link para a categoria.
- Contexto da IA: campo opcional `fromInvestments` na meta, enviado só quando a pergunta tratar de metas/investimentos (mesmo gate de FING-27 §2.4).

## 3. Edge Cases
- Categoria excluída → vínculo vira `null` (`SetNull`) e a meta volta a usar só o valor manual.
- Categoria de outro usuário/escopo → rejeitada (`400`).
- Mesma categoria em várias metas → permitido; UI avisa que o valor é compartilhado.
- Erros com mensagens PT-BR calmas; falha ao somar a carteira não derruba a tela de metas.

## 4. Critérios de Aceitação
1. Meta vinculada exibe o progresso somando a carteira da categoria; sem vínculo, nada muda.
2. Excluir a categoria desfaz o vínculo sem erro.
3. Validação de dono/escopo no service (testada).
4. Contexto da IA inclui `fromInvestments` só sob demanda.
5. `npx jest <relacionados>` e `npm run lint` verdes; migração SQL aditiva (sem `db push`).

## 5. Mapa de Execução
database-engineer (schema + SQL) → backend-engineer (service, soma, contexto IA) → frontend (formulário e card da meta) → quality-assurance-analyst. Aberto no grill-me: regra de soma e metas com várias categorias.
