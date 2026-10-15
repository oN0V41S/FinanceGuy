# Cenários de Teste — Formato

**Versão**: 1.0 | **Última atualização**: 2026-10-14

Cenário = comportamento observável, com persona, dado e resultado esperado verificável. Serve a três usos: charter exploratório, roteiro de regressão e especificação para teste automatizado.

## Colunas

| Coluna | Significado |
|--------|-------------|
| **ID** | `T-` transações, `I-` investimentos, `G-` metas. Estável: testes citam o ID no `describe`/`it` |
| **Persona** | `P1`…`P4` (ver [personas](../../product/personas/README.md)) |
| **Dado / Ação** | Pré-condição e passos, curtos |
| **Esperado** | Resultado observável (inclui mensagem em erros) |
| **Técnica** | EP, BVA, TD (tabela de decisão), ST (estados), NEG (negativo), INV (invariante), AUTH |
| **Risco** | A (dinheiro/segurança), M, B |
| **Nível** | U (unitário), I (integração), E (E2E), M (manual/exploratório) |

## Regras

- Um cenário = uma coisa verificável. Se tem "e" no Esperado, provavelmente são dois.
- Cenário novo nasce junto com a spec; teste automatizado cita o ID: `it('T-04: …')`.
- Coluna **Nível** é a recomendação; o estado real de automação é medido pelos testes (`grep "T-04" src`), não por esta tabela.
- Dados: valores redondos e datas absolutas (`2026-03-15`), nunca "hoje".
- **Esperado** descreve o comportamento desejado, derivado do contrato (Zod/cálculos). Se o código divergir, é um **achado**: registrar em [known-pitfalls](../known-pitfalls.md) ou abrir issue, sem ajustar o cenário para "caber".
- Personas: perfil de **uso**, não regra de negócio. A regra vem do código/spec.

## Índice

- [Transações](./transactions.md)
- [Investimentos](./investments.md)
- [Metas](./goals.md)
