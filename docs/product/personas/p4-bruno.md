# P4 — Bruno Teixeira

**Status**: hipótese · **Última atualização**: 2026-10-14 · Voltar: [personas](./README.md)

## Núcleo

| | |
|---|---|
| Idade / perfil | 41 anos, engenheiro CLT, renda ~R$ 9.500, sem dívidas, começou a investir há 8 meses |
| Relação com dinheiro | Analítico, cauteloso; teme perder dinheiro por falta de conhecimento |
| Nível financeiro | Iniciante em renda variável; tem Tesouro/CDB e comprou ações (PETR4), um ETF (BOVA11) e uma cripto |
| Dispositivo | Notebook (70%) para investimentos; celular para conferir |
| Objetivo principal | Ver custo, valor atual, lucro e o impacto do imposto antes de resgatar |
| Secundários | Acompanhar a carteira em um só lugar; entender preço médio |
| Dores | Corretoras mostram dados dispersos; dúvida de quanto de IR pagaria; tickers/índices confusos |
| Gatilhos | Notícia de mercado; vontade de realizar lucro; aporte mensal |
| Sucesso | Prévia de resgate bate com o valor que ele realmente recebe |
| Abandono se | Cotação errada ou ausente sem aviso; número que não "fecha" |

### Jornada típica
1. Cadastra compras (ticker, mercado, data, preço, quantidade).
2. Consulta a carteira e o histórico de preços do ticker.
3. Simula resgate parcial com alíquota de IR e confere o líquido.
4. Confirma o resgate e vê a posição restante.

## Lente QA

- **Dados típicos**: 5–8 ativos (BR, 1 US, 1 cripto), 2–3 compras no mesmo ticker, aportes mensais, tickers recentes repetidos.
- **Cenários prioritários**: I-02–I-19 (núcleo), I-20, I-21.
- **Riscos específicos**: ponto flutuante em preço médio e IR; cotação indisponível; ticker de índice (`^BVSP`) e par (`BRL=X`) no Yahoo; fuso na data de compra; resgate duplo; prévia ≠ confirmação.
- **Charter**: cadastrar o mesmo ativo em 3 compras com preços diferentes, simular resgates parcial e total e conferir tudo com planilha independente.
- **Critério de aceite**: preço médio, lucro, IR e líquido idênticos ao cálculo independente (tolerância 0,00).

## Lente UX / copy

- **Tom**: técnico e preciso, mas didático em termos específicos (tooltip curto para "preço médio", "alíquota").
- **Transparência**: mostrar a conta (bruto − custo = lucro; IR = lucro × alíquota; líquido) e a fonte/horário da cotação.
- **Avisos**: quando cotação não estiver disponível, dizer o que ainda é confiável ("valor investido") e o que não.
- **Índices**: mensagem de bloqueio útil — "Índices não são negociáveis. Cadastre um ETF que o replique, como BOVA11."
- **IR**: o app **simula**; não substitui contador nem orientação tributária (deixar visível).
- **Erros**: nunca perder o preenchimento do formulário; confirmar resgate com resumo antes.

## Lente IA

- **Pode propor** (com confirmação): registrar compra descrita em texto ("comprei 10 PETR4 a 30 ontem"), explicar o resultado da simulação de resgate, resumir a carteira (peso por tipo, lucro/prejuízo).
- **Não deve**: indicar ativo específico para comprar/vender ou "melhor momento"; prometer retorno; opinar sobre cripto/ação; calcular imposto "oficial".
- **Tom**: educativo e neutro; reforçar "não sou consultor financeiro licenciado".
- **Perfil (≤ 2000)**: exemplo — "Perfil moderado, horizonte 10 anos, aporte mensal de 1.500, quero diversificar."
- **Casos de borda**: "devo vender PETR4?" → explicar o limite e oferecer mostrar os números dele; ticker ambíguo/inexistente; data relativa ("ontem"); resgate acima da posição.
