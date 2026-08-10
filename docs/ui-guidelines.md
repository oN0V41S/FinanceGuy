# Diretrizes de UI – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Componentes de UI com base em shadcn-ui](#componentes-de-ui-com-base-em-shadcn-ui)
2. [Palette "Linear Financial"](#palette-linear-financial)
3. [Componentes shadcn-ui Essenciais](#componentes-shadcn-ui-essenciais)
4. [Integração com VISUAL_IDENTITY.md](#integração-com-visual_identitymd)
5. [Padrões de Componentes](#padrões-de-componentes)
6. [Tokens de Cor do Projeto](#tokens-de-cor-do-projeto)
7. [Referências Cruzadas](#referências-cruzadas)

---

## Componentes de UI com base em shadcn-ui

- Utilize os componentes do shadcn-ui como base para **todos** os elementos de interface.
- Siga rigorosamente o guia definido em [`docs/VISUAL_IDENTITY.md`](VISUAL_IDENTITY.md) para padronização visual.
- Para formulários de autenticação, utilize **exatamente** as estruturas definidas na **seção 8** do VISUAL_IDENTITY.md.
- Nunca utilize hex hardcoded em classes utilitárias (ex: `bg-[#131315]`, `text-white`, `bg-white`). Prefira tokens semânticos do Tailwind: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-muted`.
- Cores de marca são estáveis entre temas — use tokens `brand-*` e `finance-*`. Não redefinir esses valores por tema.

## Palette "Linear Financial"

As cores da palette "Linear Financial" devem ser utilizadas conforme definidas:

| Função | Cor | Hex |
| :--- | :--- | :--- |
| **Primária** | Trust Blue | `#2563EB` |
| **Secundária** | Insight Violet | `#8B5CF6` |
| **Fundo** | Deep Ink | `#131315` |
| **Sucesso** | Success Mint | `#10B981` |

> **Regra de marca**: a cor de *marca* é o Insight Violet; a cor de *ação* é o Trust Blue. Não inverta as funções — o Violet nunca deve ser usado como fundo de botão primário, e o Blue nunca deve ser usado como cor de título de seção (ver seção 2 do VISUAL_IDENTITY.md).

## Componentes shadcn-ui Essenciais

Componentes shadcn-ui essenciais para este projeto:

`form`, `input`, `button`, `card`, `label`, `form-field`, `form-item`, `form-control`, `form-message`.

Instalação:

```bash
pnpm shadcn add form input button card label dialog table dropdown-menu
```

## Integração com VISUAL_IDENTITY.md

O documento `docs/VISUAL_IDENTITY.md` define a identidade visual completa do projeto e deve ser seguido rigorosamente:

- **Paleta de Cores**: Utilize as cores definidas na **seção 2** para todos os elementos UI.
- **Tipografia**: Siga as especificações da **seção 3** para headings, body e valores monetários.
  - Headings/Body: `Inter`.
  - Labels/UI Elements: `Space Grotesk`.
  - Monospaced (Finance): `JetBrains Mono`.
- **Elementos Visuais**: Implemente as especificações da **seção 5** (bordas, sombras, iconografia, empty states).
- **Formulários**: Siga exatamente as estruturas definidas na **seção 8** para formulários de autenticação.
- **Estados de Carregamento**: Implemente os spinners e estados de loading conforme a **seção 8.9**.
- **Feedback Visual**: Utilize os indicadores de validação em tempo real da **seção 8.7** e os indicadores de força de senha da **seção 8.8**.

## Padrões de Componentes

Padrões de estilo adotados pelos componentes (sub-agente `frontend`):

| Componente | Classes Tailwind |
| :--- | :--- |
| **Input** | `h-12 px-4 rounded-xl border-gray-200` |
| **Button Primary** | `w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary/90` |
| **Card** | `w-full max-w-md p-8 rounded-xl` |
| **Label** | `text-brand-secondary font-medium text-sm` |

Regras complementares:

- **Touch targets**: mínimo `h-12` (44px) para áreas clicáveis.
- **Responsividade**: mobile-first — `flex flex-col` (mobile) → `sm:flex-row` / `md:flex-row` (desktop); grids `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; inputs/buttons `w-full` no mobile.
- **Tema**: dark-mode-first (canvas Deep Ink `#131315`), mas todo componente deve suportar dark/light sem duplicação de lógica.

## Tokens de Cor do Projeto

Tokens semânticos definidos na governança (ver `.opencode/agents/frontend.md` — Cores do Projeto):

| Token | Valor | Nome |
| :--- | :--- | :--- |
| `--brand-primary` | `#2563EB` | Trust Blue |
| `--brand-secondary` | `#8B5CF6` | Insight Violet |
| `--finance-income` | `#10B981` | Success Mint |
| `--finance-expense` | `#E11D48` | Rosewood |
| `--finance-recurring` | `#F59E0B` | Amber |
| `--canvas-background` | `#131315` | Deep Ink |

> Esses tokens devem ser usados em substituição a qualquer hex hardcoded em componentes, garantindo suporte a dark/light theme e consistência com o VISUAL_IDENTITY.md.

## Referências Cruzadas

| Documento | Descrição |
| :--- | :--- |
| [`docs/VISUAL_IDENTITY.md`](VISUAL_IDENTITY.md) | Identidade visual completa: paleta de cores (seção 2), tipografia (seção 3), elementos visuais (seção 5), formulários de autenticação (seção 8), estados de carregamento (8.9), feedback visual (8.7, 8.8). |
| [`.opencode/agents/frontend.md`](../.opencode/agents/frontend.md) | Sub-agente de frontend com TDD + Spec-first: cores do projeto (tokens `--brand-*`, `--finance-*`, `--canvas-background`), padrões de componentes (Input `h-12 px-4 rounded-xl`, Button Primary `w-full h-12 rounded-xl bg-brand-primary`, Card `w-full max-w-md p-8 rounded-xl`, Label `text-brand-secondary font-medium text-sm`), diretrizes de tema dark/light e responsividade mobile-first. |

---

**Mantainer**: Time de Desenvolvimento | **Última atualização**: Agosto 2026
