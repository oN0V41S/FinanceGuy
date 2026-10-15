# Cenários — Transações

**Versão**: 1.0 | **Última atualização**: 2026-10-14
Código: `src/features/transactions/` · Spec: [transactions-screen](../../specs/transactions-screen.md) · Formato: [README](./README.md)

Contrato (de `validations.ts`): `type` income|expense · `value` > 0 · `title` ≤ 100 · `description` ≤ 255 · `responsible` 1–100 · `category` ∈ {Alimentação, Transporte, Casa, Saúde, Educação, Lazer, Salário, Investimentos, Outros} · `date` válida · `paid` padrão `false`.

## Cadastro e validação

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| T-01 | P1 | Criar despesa `R$ 45,90`, Alimentação, responsável "Marina", data `2026-03-10` | Aparece em março com valor e categoria corretos; totais atualizam | EP | A | I |
| T-02 | P1 | Valor `0`, `-1` e vazio | Recusa com "Valor deve ser positivo"; nada gravado; formulário mantém dados | BVA/NEG | A | U |
| T-03 | P1 | `title` com 100 e 101 caracteres; `description` com 255 e 256 | 100/255 aceitam; 101/256 recusam com mensagem de limite | BVA | M | U |

## Parcelas e recorrência

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| T-04 | P1 | Compra `R$ 1.200,00` em 12x a partir de `2026-03-05` | 12 parcelas `1/12…12/12`, uma por mês; total do mês = 1 parcela (sem contar o registro pai); soma das parcelas = 1.200,00 | INV/ST | A | I |
| T-05 | P1 | Compra `R$ 100,00` em 3x | Soma das parcelas = 100,00 exato (sem dízima; resíduo na última) — **hoje `value/total` sem arredondar: ver [pitfall 8](../known-pitfalls.md)** | INV/BVA | A | U |
| T-06 | P2 | Despesa recorrente `R$ 300,00` por 6 meses | 6 ocorrências de 300,00 (recorrente não divide o valor) | EP | A | U |
| T-07 | P2 | Excluir "esta e futuras" a partir da 4ª ocorrência | Ocorrências ≥ 4ª removidas; 1ª–3ª preservadas; contagem retornada correta | ST | A | I |
| T-07b | P2 | Editar "esta e futuras" | Só ocorrências a partir da data de referência mudam | ST | A | I |
| T-07c | P1 | Falha ao gravar a parcela 5 de 12 | Nenhum registro parcial deixado (ou usuário informado e estado consistente) — ver [pitfall 19](../known-pitfalls.md) | NEG | A | I |

## Período, saldo e filtros

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| T-08 | P2 | Saldo inicial de março com filtros `{tipo, categoria, responsável, pago, busca}` em combinações | Saldo inicial = receitas − despesas **estritamente anteriores** a `2026-03-01` que satisfazem os mesmos filtros da lista | TD | A | I |
| T-09 | P2 | Troca de mês fev → mar → fev rápida | Lista, totais e saldo do mês correto; sem dados do mês anterior "piscando" | ST | M | E |
| T-10 | P2 | Transações em `2026-03-15`, `03-16`, `03-31` e `04-01` com visão por quinzena/mês | 15 na 1ª quinzena, 16 na 2ª, 31 em março, 01 em abril | BVA | A | U |
| T-11 | P3 | Filtrar por responsável "Diego" | Lista, totais e saldo inicial refletem só "Diego" | EP/TD | M | I |
| T-12 | P1 | Marcar despesa como paga | Totais "pago"/"a pagar" atualizam; desfazer reverte | ST | A | I |
| T-13 | P1 | Busca por trecho do título sem resultados | Estado vazio claro ("nenhuma transação encontrada"), sem erro | EP | B | I |

## Acesso e erros

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| T-14 | P3 | Usuário B tenta ler/editar/excluir transação de A (`GET/PUT/DELETE /api/transactions/:id`) | 403/404; nada alterado | AUTH | A | I |
| T-15 | P1 | Sem sessão chama a API | 401 | AUTH | A | I |
| T-16 | P1 | API de transações falha (500) | Mensagem amigável, ação de tentar de novo, resto da tela utilizável; sem detalhe interno | NEG | A | E |
| T-17 | P1 | Mutação (criar/editar/excluir) | Cache do usuário invalidado: lista mostra o resultado sem recarregar a página | ST | M | I |

## Charters exploratórios sugeridos

- **P1**: "Explorar o lançamento do dia a dia no celular (375 px) para descobrir atritos de digitação de valor e data."
- **P2**: "Explorar mês com renda irregular e recorrências para descobrir inconsistências de saldo inicial."
- **P3**: "Explorar o uso de 'Responsável' por duas pessoas para descobrir confusões de filtro e totais."
