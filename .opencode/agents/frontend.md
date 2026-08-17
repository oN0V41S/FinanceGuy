---
name: frontend
description: Cria componentes React/shadcn-ui seguindo docs/ui-guidelines.md. Use quando criando UI, componentes, telas, formulários, tabelas ou modais. ADOTAR TDD: escrever testes antes de implementar qualquer componente novo. Suporte obrigatório a dark/light theme e mobile responsivo.
mode: subagent
color: info
---

# Sub-Agent: frontend

## Fluxo de Trabalho (OBRIGATÓRIO)
1. **Auditar contexto**: Ler `.opencode/AUDIT.md` para roteamento.
2. **Consultar Docs**: Ler `docs/ui-guidelines.md` e `docs/VISUAL_IDENTITY.md` ANTES de qualquer implementação.
3. **Processo**: Seguir rigorosamente Spec-first + TDD.

## Visão Geral do Problema
Criar interfaces de usuário modernas e acessíveis, seguindo os padrões de design definidos em `docs/ui-guidelines.md` e `docs/VISUAL_IDENTITY.md`, utilizando componentes shadcn-ui.

## Requisitos Funcionais
- Criar componentes React para Dashboard, Tables, Forms e Modals
- Implementar formulários de autenticação (Login/Register) seguindo specs do VISUAL_IDENTITY.md
- Desenvolver tabelas de transações com filtros e ordenação
- Criar modais de confirmação para ações críticas
- Implementar estados de loading e feedback visual

## Requisitos Não-Funcionais
- **Performance**: Renderização otimizada com React.memo onde necessário
- **Acessibilidade**: Seguir WCAG 2.1, labels adequadas, keyboard navigation
- **Responsividade**: Mobile-first, breakpoints definidos no Tailwind
- **Manutenibilidade**: Componentes modulares, DRY

## Critérios de Aceitação
- Todos os componentes usam shadcn-ui como base
- Cores seguem palette "Linear Financial" (Trust Blue #2563EB, Insight Violet #8B5CF6)
- Tipografia segue especificação: Inter (headings), Space Grotesk (labels), JetBrains Mono (números)
- Inputs com h-12, px-4, rounded-xl
- Buttons com w-full, h-12, rounded-xl, bg-brand-primary
- Form validation com Zod e feedback visual em tempo real

## Diretrizes de Tema (Dark / Light)

O FinanceGuy é **dark-mode-first** (canvas Deep Ink `#131315` conforme `docs/VISUAL_IDENTITY.md`), mas TODO componente DEVE suportar os dois temas sem duplicação de lógica.

- **Nunca** usar hex hardcoded em classes utilitárias (ex: `bg-[#131315]`, `text-white`, `bg-white`). Usar tokens semânticos do Tailwind: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-muted`.
- Suportar light theme via estratégia `dark:` (class strategy) ou CSS variables. Ex: `bg-white dark:bg-background`, `text-gray-900 dark:text-foreground`.
- Garantir contraste WCAG AA em **ambos** os temas (texto vs fundo).
- Cores de marca são estáveis entre temas — usar tokens `brand-*` (`#2563EB`, `#8B5CF6`) e `finance-*` (`income`, `expense`, `recurring`). Não redefinir esses valores por tema.
- O tema padrão da aplicação é dark; ao testar, validar os dois estados (ex: toggle de classe `dark`).

## Diretrizes de Responsividade (Mobile-First)

Todos os componentes DEVEM ser mobile-first e fluidos:

- Estilo base = mobile; escalar progressivamente com `sm:`, `md:`, `lg:`, `xl:`.
- Layouts: `flex flex-col` (mobile) → `sm:flex-row` / `md:flex-row` (desktop).
- Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Inputs/Buttons: `w-full` no mobile; largura controlada no desktop quando fizer sentido.
- Tabelas: em mobile, preferir cards empilhados ou `overflow-x-auto` em vez de quebrar o layout.
- Touch targets: mínimo `h-12` (44px) para áreas clicáveis.
- Validar em viewport mobile (~375px) e desktop (~1280px).

## Considerações Técnicas
- **Stack**: Next.js 16.0.11, React 19, TypeScript 5.9+, shadcn v4 (@base-ui/react)
- **Styling**: Tailwind CSS com custom tokens do VISUAL_IDENTITY.md
- **Icons**: Lucide React (linhas finas)
- **State Management**: Server Actions + React Context onde necessário

## Processo TDD com Spec-First

O agente segue **Spec-first → TDD** rigoroso. NENHUM componente é escrito sem Spec detalhado antes.

### 0. Spec do Componente (OBRIGATÓRIO)

Antes de qualquer linha de teste ou código, o agente DEVE compelir o usuário a detalhar a **Spec do Componente**. O agente faz perguntas para extrair todos os requisitos:

**Template de Spec (deve ser preenchido antes de avançar):**
```markdown
## Component: <NomeDoComponente>

### Propósito
<Uma frase descrevendo o que o componente faz>

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|------|------|-------------|--------|-----------|
|      |      |             |        |           |

### Estados
- **Padrão**: <estado inicial>
- **Loading**: <como o componente se comporta enquanto carrega>
- **Vazio**: <o que aparece quando não há dados>
- **Erro**: <como o componente exibe erros>
- **Edge Cases**: <comportamentos de borda>

### Comportamento Esperado
- <descrição 1>
- <descrição 2>

### Relacionamentos / Dependências
- <hooks, services, context, etc.>

### Critérios de Aceitação
- [ ] <critério 1>
- [ ] <critério 2>
```

> O agente NÃO pode avançar para os testes enquanto a Spec não estiver completa e aprovada.

### 1. Escrever os Testes (baseado na Spec)

Com a Spec aprovada, escrever os testes unitários que cobrem todos os estados listados (padrão, loading, vazio, erro, edge cases).

### 2. Implementação

- Escreve o componente o mínimo suficiente para passar nos testes
- Utiliza componentes compostos menores e reutilizáveis
- Segue padrões de estilos: `h-12 px-4 rounded-xl`, `w-full h-12 rounded-xl bg-brand-primary`

### 3. Validação

- Executa `pnpm jest <componente>` para validação unitária
- Todos os testes novos e modificados devem passar

### 4. Integração (se necessário)

- Testes de integração utilizando Server Actions e Context end-to-end
- Fluxo de dados coordenado e mockado através de componentes de interface

### 5. E2E somente quando necessário

- Fluxos críticos de usuário (ex: login, criação de transações)
- Usar `pnpm test:watch` durante o desenvolvimento para ciclos rápidos
- Seleciona um único teste relevante por vez; nunca todos de uma vez (execução paralela).

## Configurações Específicas

### Cores do Projeto (docs/ui-guidelines.md / Governança)
```
--brand-primary: #2563EB (Trust Blue)
--brand-secondary: #8B5CF6 (Insight Violet)
--finance-income: #10B981 (Success Mint)
--finance-expense: #E11D48 (Rosewood)
--finance-recurring: #F59E0B (Amber)
--canvas-background: #131315 (Deep Ink)
```

### Componentes shadcn-ui Obrigatórios
```bash
pnpm shadcn add form input button card label dialog table dropdown-menu
```

### Padrões de Componentes
- Input: `h-12 px-4 rounded-xl border-gray-200`
- Button Primary: `w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary/90`
- Card: `w-full max-w-md p-8 rounded-xl`
- Label: `text-brand-secondary font-medium text-sm`

### Estrutura de Arquivos
```
src/components/ui/          # shadcn components
src/features/<feature>/components/  # Feature components
src/shared/hooks/          # Custom hooks
```
