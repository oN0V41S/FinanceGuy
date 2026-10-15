# Personas — FinanceGuy

**Versão**: 1.0 | **Status**: Hipóteses (Draft) | **Última atualização**: 2026-10-14

> **Aviso importante**: estas personas são **hipóteses de trabalho** construídas a partir da proposta do produto ("um app que leva à estabilidade financeira: um Nubank com IA que conhece seus planos, metas e gastos") e das funcionalidades existentes. **Não são pesquisa com usuários reais.** Devem ser validadas com entrevistas/uso real e revisadas. Nomes e dados são fictícios.

## Para que servem

Dar **perfil de usuário** a três decisões:

| Lente | Pergunta que a persona responde |
|-------|---------------------------------|
| **QA** | Que dados, fluxos e erros esse usuário realmente encontra? (alimenta [cenários](../../qa/scenarios/README.md)) |
| **UX / copy** | Que palavras, ritmo e nível de detalhe ele entende e aceita? |
| **IA** | O que a IA pode propor para ele, com que tom e quais limites? |

## Personas

| ID | Persona | Resumo | Arquivo |
|----|---------|--------|---------|
| P1 | Marina Alves, 29 | CLT, começando a se organizar; parcelas no cartão e primeira reserva | [p1-marina.md](./p1-marina.md) |
| P2 | Rafael Souza, 35 | Autônomo, renda irregular, recorrências e quinzenas | [p2-rafael.md](./p2-rafael.md) |
| P3 | Camila & Diego, 33/36 | Casal que divide contas; usa "Responsável" | [p3-camila-diego.md](./p3-camila-diego.md) |
| P4 | Bruno Teixeira, 41 | Começou a investir em ativos de mercado; quer clareza de custo, lucro e IR | [p4-bruno.md](./p4-bruno.md) |

## Contrato da IA (alinhado às branches `feat/fing-7-ia-mvp` e `feat/fing-18-agente-escrita`)

Vale para todas as personas — a lente de IA de cada arquivo só **detalha** isto:

- A IA **propõe**; o usuário **confirma** por card. Nenhuma escrita sem confirmação.
- Campo **Perfil** do usuário: até 2000 caracteres, é contexto fornecido por ele.
- **Sem recomendação de ativo específico**; não é consultor financeiro licenciado (deixar isso claro no texto).
- Erros e limites sempre explicados com calma, sem culpar o usuário.

Se o contrato mudar nessas branches, atualizar aqui primeiro.

## Como usar

- **Escrevendo cenário**: cite a persona (`P1`…`P4`) e use o dado típico dela.
- **Escrevendo copy**: leia a lente UX/copy da persona afetada; teste o texto com o vocabulário dela.
- **Prompt/fluxo de IA**: leia a lente de IA; verifique o contrato acima antes.
- **Nova feature**: indique na spec qual persona é afetada e qual é o fluxo principal dela.

## Como validar (próximo passo)

1. Entrevistar 5+ pessoas por persona e ajustar objetivos, dores e vocabulário.
2. Cruzar com analytics de uso quando existir (frequência, filtros usados, abandono).
3. Marcar cada afirmação como **[hipótese]** ou **[validado em AAAA-MM]**. Hoje tudo é hipótese.

## Pendências

- Geração/refino complementar por LLM externo (Gemini/ChatGPT) não foi concluída; se feita, tratar a saída como rascunho a validar.
- Conta de teste por persona (dados de seed) ainda não existe; ver [QA README](../../qa/README.md).
