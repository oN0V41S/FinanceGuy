# Cenários — Investimentos

**Versão**: 1.0 | **Última atualização**: 2026-10-14
Código: `src/features/investments/` · Formato: [README](./README.md)

Contrato (de `validations.ts` e `calculations.ts`): `type` ∈ {Renda Fixa, Renda Variável} · `status` ACTIVE|REDEEMED · `market` ∈ {BR, US, CRYPTO, FX, OTHER} · ativo de mercado (com `ticker`) exige `market`, `purchaseDate`, `unitPrice`, `shares`; `value` = `round2(shares × unitPrice)` · ticker `^…` é recusado (usar ETF, ex.: BOVA11) · compra futura (> agora + 24 h) recusada · resgate: `quantity` > 0 e ≤ posição, `taxRate` 0–100, IR só sobre lucro positivo.

## Cadastro

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| I-01 | P1 | Renda Fixa manual "Tesouro Selic", valor `R$ 1.000,00`, sem ticker | Cadastra; valor obrigatório; sem exigir campos de mercado | EP | M | I |
| I-02 | P4 | Ativo BR `PETR4`, 10 cotas a `R$ 30,00`, compra `2026-03-10` | `value = 300,00` calculado; ticker em maiúsculas; aparece na carteira | EP/INV | A | I |
| I-03 | P4 | Ticker com campos de mercado faltando (sem `shares`, sem `unitPrice`, sem data, sem mercado) | Um erro por campo: "Campo obrigatório para ativos de mercado" | NEG | M | U |
| I-04 | P4 | Ticker `^BVSP` | Recusado: "Índices não são negociáveis… cadastre um ETF… BOVA11" | NEG | M | U |
| I-05 | P4 | Data de compra hoje, +24 h e +24 h 1 ms | Hoje e +24 h aceitam; acima recusa "Data de compra não pode ser futura". Exibição não recua um dia | BVA | M | U |
| I-06 | P4 | `ticker` com caracteres inválidos (`PETR 4`, `PETR4;`) | "Ticker inválido" | EP/NEG | M | U |
| I-07 | P4 | Novo investimento: abrir tickers recentes e histórico de preços do ticker | Sugestões vêm do histórico do próprio usuário; histórico de preços carrega ou mostra aviso | EP | B | I |

## Cotação e posição

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| I-08 | P4 | Duas compras: 10 a 30,00 e 10 a 40,00 | Preço médio 35,00; quantidade 20; custo 700,00 | INV | A | U |
| I-09 | P4 | Posição 10 a 30,00, cotação atual 33,00 | Custo 300,00; valor atual 330,00; lucro 30,00; 10,00% | INV | A | U |
| I-10 | P4 | Custo zero | `profitPct = 0`, sem `NaN`/`Infinity` | BVA | M | U |
| I-11 | P4 | Provedor de cotação (Brapi/Yahoo) indisponível ou ativo inexistente | Valor investido continua visível; aviso "cotação indisponível"; sem erro técnico | NEG | A | I |
| I-12 | P4 | Índice/par (`^BVSP`, `BRL=X`) consultados no Yahoo | Símbolo sem `.SA` indevido | EP | M | U |

## Resgate

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| I-13 | P4 | Resgatar 5 de 10 a 36,00 (custo 30,00), IR 15% | Bruto 180,00; custo 150,00; lucro 30,00; IR 4,50; líquido 175,50; restam 5; continua `ACTIVE` | INV/ST | A | U |
| I-14 | P4 | Resgatar 10 de 10 | `isTotal = true`; investimento vira `REDEEMED` | ST | A | I |
| I-15 | P4 | Resgate com prejuízo (preço de venda < custo) | IR = 0; líquido = bruto | BVA | A | U |
| I-16 | P4 | Quantidade 0, negativa, > posição; IR −1, 0, 100, 101 | Recusa com mensagem; 0 e 100 aceitos | BVA/NEG | A | U |
| I-17 | P4 | Prévia vs confirmação com a mesma cotação | Valores idênticos | INV | A | I |
| I-18 | P4 | Resgatar sem informar preço | Usa a cotação atual; se indisponível, pede o preço | EP/NEG | M | I |
| I-19 | P4 | Resgate duplo (clicar duas vezes em confirmar) | Uma única operação registrada | NEG | A | E |

## Acesso, histórico e UI

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| I-20 | P3 | Usuário B acessa/edita/resgata investimento de A | 403/404 | AUTH | A | I |
| I-21 | P4 | Modal de novo investimento em viewport 375×600 | Rola; botão salvar alcançável | EP | M | M |
| I-22 | P1 | Carteira vazia | Estado vazio com chamada para cadastrar o primeiro investimento | EP | B | I |

## Charters exploratórios sugeridos

- **P4**: "Explorar cadastro e resgate de ativos de mercado para descobrir divergências entre prévia, valor confirmado e carteira."
- **P1**: "Explorar o primeiro investimento (Renda Fixa) para descobrir termos financeiros que travam um iniciante."
