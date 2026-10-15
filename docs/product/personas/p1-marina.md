# P1 — Marina Alves

**Status**: hipótese · **Última atualização**: 2026-10-14 · Voltar: [personas](./README.md)

## Núcleo

| | |
|---|---|
| Idade / perfil | 29 anos, analista administrativa CLT, mora de aluguel, renda líquida ~R$ 3.800 fixa |
| Relação com dinheiro | Ansiosa com o fim do mês; "o cartão estoura e eu não sei com quê" |
| Nível financeiro | Iniciante; conhece poupança e cartão, não conhece termos como "preço médio" ou "renda fixa" |
| Dispositivo | Celular (90%); usa em filas e no transporte, em sessões de 1–3 minutos |
| Objetivo principal | Saber para onde o dinheiro vai e montar uma reserva de emergência de R$ 10.000 |
| Objetivos secundários | Acompanhar parcelas do cartão; não esquecer contas |
| Dores | Esquece de lançar gastos; parcelas "escondidas" no futuro; sente culpa ao ver o saldo |
| Gatilhos de uso | Recebeu o salário; fatura chegou; viu a meta atrasada |
| Sucesso | Abre o app 3×/semana e entende o mês em menos de 30 segundos |
| Abandono se | Formulário longo, jargão, mensagem de erro assustadora |

### Jornada típica
1. Lança gastos do dia (valor, categoria, data).
2. Cadastra compra parcelada.
3. Confere o saldo do mês e quanto falta para a meta.
4. (Depois) cadastra o primeiro investimento em Renda Fixa.

## Lente QA

- **Dados típicos**: ~40–60 transações/mês, valores de R$ 5 a R$ 400, 1–3 parcelados ativos (6–12x), 1 meta, 0–1 investimento manual.
- **Cenários prioritários**: T-01, T-02, T-04, T-05, T-12, T-13, T-16, G-01–G-04, G-07, I-01, I-22.
- **Riscos específicos**: erro de digitação de valor (vírgula/ponto); totais errados com parcelas; perder o formulário ao errar; tela pequena (375 px).
- **Charter**: lançar 10 gastos seguidos no celular, em rede lenta, e conferir totais.
- **Critério de aceite de UX**: lançar um gasto em ≤ 3 toques após abrir o formulário.

## Lente UX / copy

- **Tom**: acolhedor, direto, sem julgamento. "Você gastou R$ 320 a mais que em fevereiro" é aceitável; "você gastou demais" não.
- **Vocabulário**: "gasto", "parcela", "sobra do mês", "reserva". Evitar: "preço médio", "alocação", "rentabilidade", "posição" sem explicação curta.
- **Erros**: dizer o que aconteceu e o que fazer ("Não conseguimos salvar agora. Seus dados continuam aqui — tente novamente."). Nunca códigos ou stack.
- **Vazios**: convite, não bronca ("Que tal registrar seu primeiro gasto?").
- **Números**: sempre R$ com vírgula decimal; datas em dd/mm; valores negativos com sinal e cor + texto (não só cor).
- **Densidade**: uma decisão por tela; padrões preenchidos (categoria "Outros", data de hoje).

## Lente IA

- **Pode propor** (com card de confirmação): registrar um gasto descrito em linguagem natural ("gastei 45 no mercado"), criar a meta "Reserva de emergência", sugerir quanto separar por mês com base nas sobras reais.
- **Não deve**: recomendar investimento específico; afirmar o que ela "deve" fazer; ir além do contexto que ela deu no Perfil.
- **Tom**: curto, em português simples; confirma o entendimento antes de propor ("Entendi: despesa de R$ 45, Alimentação, hoje. Confirmar?").
- **Perfil (≤ 2000)**: exemplo — "CLT, renda líquida 3.800, aluguel 1.200, quero juntar 10 mil em 12 meses, evito risco."
- **Casos de borda**: valor ambíguo ("uns 50"), data relativa ("ontem"), pedido fora do escopo ("devo comprar ação X?") → explicar o limite e oferecer alternativa dentro do escopo.
- **Falha da IA**: mensagem calma e a possibilidade de fazer manualmente.
