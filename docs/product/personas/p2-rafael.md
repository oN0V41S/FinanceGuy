# P2 — Rafael Souza

**Status**: hipótese · **Última atualização**: 2026-10-14 · Voltar: [personas](./README.md)

## Núcleo

| | |
|---|---|
| Idade / perfil | 35 anos, designer freelancer (MEI), renda de R$ 4.000 a R$ 12.000 por mês, irregular |
| Relação com dinheiro | Pragmático, mas sofre em meses fracos; mistura gastos pessoais e do trabalho |
| Nível financeiro | Intermediário: entende fluxo de caixa e imposto, quer previsibilidade |
| Dispositivo | Notebook (60%) e celular (40%); sessões de 5–10 minutos, semanais |
| Objetivo principal | Saber quanto pode gastar neste mês dado o que entrou e o que já está comprometido |
| Objetivos secundários | Formar colchão de 6 meses de despesas; separar valor do imposto |
| Dores | Saldo do mês seguinte "surpreende"; assinaturas e recorrências esquecidas; recebimentos atrasados |
| Gatilhos | Entrada de pagamento; virada de mês; vencimento de imposto |
| Sucesso | Ver, em 1 tela, o saldo inicial do mês + entradas − compromissos |
| Abandono se | Saldo não bate com o extrato; filtros que não afetam o total |

### Jornada típica
1. Registra receita quando o cliente paga (às vezes com atraso).
2. Cadastra recorrências (assinaturas, internet) e parcelas.
3. Troca entre meses/quinzenas para planejar.
4. Filtra por categoria/responsável ("trabalho" × "pessoal") e confere o saldo.

## Lente QA

- **Dados típicos**: 20–40 transações/mês, receitas grandes e raras, 5–10 recorrências ativas, uso intenso de filtros e troca de mês/quinzena, usa 2025 e 2026 (anos disponíveis).
- **Cenários prioritários**: T-06, T-07, T-07b, T-08, T-09, T-10, T-17, G-05.
- **Riscos específicos**: saldo inicial com filtros combinados; virada de mês/ano; dia 15/16 e 28–31; cache velho após edição; recorrência editada "daqui para frente".
- **Charter**: montar 3 meses de histórico com recorrências e receitas irregulares e conferir se o saldo inicial de cada mês bate com a soma manual.
- **Critério de aceite**: saldo exibido = cálculo independente (planilha) em 100% dos meses do charter.

## Lente UX / copy

- **Tom**: objetivo e de parceiro de trabalho; números primeiro, explicação depois.
- **Vocabulário**: "saldo inicial", "a receber", "recorrência", "quinzena" — ele entende; explicar apenas o que é específico do app.
- **Controle**: confirmações claras para ações em lote ("Excluir esta e as 5 futuras?" mostrando a contagem); desfazer quando possível.
- **Clareza de filtros**: sinalizar visualmente quais filtros estão ativos e que o saldo inicial os respeita.
- **Erros**: informar o que foi salvo e o que não; nunca perder o rascunho.
- **Densidade**: aceita tabela densa em desktop; atalhos e teclado são bem-vindos.

## Lente IA

- **Pode propor** (com confirmação): cadastrar recorrência descrita em texto ("assinatura de R$ 59 todo dia 5, por 12 meses"), resumir o mês ("entraram X, saíram Y, saldo Z"), sugerir meta de colchão com base na média de despesas.
- **Não deve**: prever renda futura como certeza; recomendar produto de investimento; mexer em lote sem mostrar exatamente o que muda.
- **Tom**: conciso, quantitativo; mostra a conta que fez.
- **Perfil (≤ 2000)**: exemplo — "MEI, renda irregular entre 4 e 12 mil, quero colchão de 6 meses, separo 10% para impostos."
- **Casos de borda**: "exclua tudo do cliente X" (ação em lote → confirmar com lista), período ambíguo ("mês passado" na virada de mês), valores com ponto/vírgula (1.200,50).
