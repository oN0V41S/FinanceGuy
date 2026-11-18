# Spec: Contexto da IA enviado por assunto (FING-29)

**Status**: Draft (follow-up de FING-27)
**Versão**: 1.0
**Última atualização**: 2026-10-20

## 1. Visão Geral
**Problema**: o `FinancialContextDto` envia **todas** as seções em toda pergunta (transações, metas e até 30 investimentos), limitado apenas por tetos (`MAX_INVESTMENTS=30`, `MAX_CONTEXT_JSON_CHARS=12000`). Perguntas simples ("quanto gastei com mercado?") carregam metas e carteira sem necessidade, aumentando tokens, latência e custo.

**Objetivo**: incluir cada seção do contexto somente quando a pergunta tratar do assunto, sem LLM, mantendo a resposta correta quando o assunto não é detectado.

**Dependência**: FING-27 (cria `wantsPortfolio` e o padrão "seção sob demanda + cache ignorado").

## 2. Proposta
- Generalizar `portfolioIntent.ts` em `contextTopics.ts`: `detectTopics(question) → Set<'transactions' | 'goals' | 'investments'>` (normalização sem acento/caixa, igual a `questionPeriod`).
- `buildFinancialContext` recebe `topics` e omite seções fora dele; `omitted` continua informando o que foi cortado por limite (não por assunto).
- `transactions` permanece como padrão quando nenhum assunto é detectado (comportamento seguro: perguntas genéricas continuam recebendo o resumo do mês).
- Cache (`withContextCache`): ignorar o cache quando algum assunto específico (metas/investimentos) for detectado, como já é feito para período; a chave `ai:ctx:{userId}` não muda.
- Fluxos de escrita (`askCreate`/`askLlm`): enviam só o assunto da entidade manipulada.
- Métrica: logar (sem dados sensíveis) `{ topics, jsonChars }` por pergunta para medir a economia.

## 3. Edge Cases
- Pergunta ambígua ou multiassunto → união dos assuntos detectados.
- Nenhum assunto detectado → contexto padrão atual (sem regressão).
- Falso negativo (assunto não detectado) → a IA responde que não tem o dado; mitigar com lista de termos testada e fácil de estender.
- Nunca vazar DTO de uma pergunta para outra (testes de cache).

## 4. Critérios de Aceitação
1. `detectTopics` cobre termos de metas, investimentos e transações (testes por tabela, com e sem acento).
2. Pergunta só de transações não inclui `goals` nem `investments` no DTO; tamanho do JSON menor que o atual.
3. Pergunta genérica mantém o contexto padrão atual.
4. Cache nunca serve DTO de outro conjunto de assuntos.
5. Fluxos de escrita enviam apenas o contexto da entidade.
6. `npx jest src/features/ai` e `npm run lint` verdes.

## 5. Mapa de Execução
backend-engineer (TDD: `contextTopics`, `buildFinancialContext`, cache) → quality-assurance-analyst (regressão das respostas da IA) → project-review.
