# P3 — Camila & Diego

**Status**: hipótese · **Última atualização**: 2026-10-14 · Voltar: [personas](./README.md)

## Núcleo

| | |
|---|---|
| Perfil | Casal (33 e 36 anos), união estável, um filho de 3 anos, renda somada ~R$ 11.000 |
| Uso do app | **Uma conta compartilhada** (hoje o produto é por usuário); distinguem quem gastou pelo campo **Responsável** |
| Relação com dinheiro | Camila organiza; Diego lança quando lembra. Já discutiram por "gasto surpresa" |
| Nível financeiro | Intermediário-iniciante; querem planejar a entrada de um apartamento |
| Dispositivo | Camila: celular + notebook; Diego: só celular |
| Objetivo principal | Ver quanto cada um gastou e se estão dentro do combinado do mês |
| Secundários | Meta "Entrada do apartamento"; dividir despesas fixas |
| Dores | Esquecer de lançar; não saber de quem é um gasto; filtro por pessoa confuso |
| Sucesso | Fim do mês sem discussão: números iguais para os dois |
| Abandono se | Dados trocados entre pessoas; sensação de fiscalização |

### Jornada típica
1. Diego lança gastos rapidamente informando "Diego" como responsável.
2. Camila revisa no notebook, filtra por responsável/categoria e marca contas como pagas.
3. Juntos acompanham a meta do apartamento.

## Lente QA

- **Dados típicos**: ~80 transações/mês, 2 valores de `responsible` ("Camila", "Diego", às vezes "Casa"), categorias Casa/Saúde/Educação em peso, 2 metas.
- **Cenários prioritários**: T-11, T-08 (filtro por responsável), T-12, T-14, I-20, G-06.
- **Riscos específicos**: grafia diferente do mesmo responsável ("Diego", "diego", "Diego ") quebrando filtro; **isolamento entre contas** (casal não pode ver dados de outro usuário); totais por responsável.
- **Charter**: dois dispositivos lançando em paralelo na mesma conta e conferindo que as listas convergem (cache).
- **Observação de produto**: contas separadas com compartilhamento são uma **hipótese futura**, fora do escopo atual.

## Lente UX / copy

- **Tom**: neutro e **não acusatório**; mostrar fatos ("Diego: R$ 1.240 · Camila: R$ 2.010"), nunca "quem gastou mais".
- **Vocabulário**: "casa", "nosso", "combinado do mês". Evitar linguagem de controle ("limite do parceiro").
- **Responsável**: oferecer sugestões dos valores já usados (evita variações de grafia).
- **Velocidade**: lançamento em segundos para o Diego; padrões inteligentes (último responsável usado).
- **Privacidade**: avisar claramente que a conta é compartilhada e o que cada pessoa vê.

## Lente IA

- **Pode propor** (com confirmação): lançar gasto atribuindo o responsável citado ("Diego pagou 180 no mercado"), resumir por pessoa e categoria, sugerir meta mensal para a entrada do apartamento com base nas sobras.
- **Não deve**: comparar ou julgar os dois; sugerir quem deve pagar mais; recomendar compra de imóvel/financiamento específico.
- **Tom**: mediador, factual, sem opinião sobre hábitos.
- **Perfil (≤ 2000)**: exemplo — "Casal, 1 filho, renda 11 mil, queremos juntar 60 mil de entrada em 3 anos."
- **Casos de borda**: responsável ambíguo ("o pessoal"), grafia diferente de nome, pedido para "apagar os gastos do Diego" (ação sensível → confirmar com a lista).
