---
name: frontend
description: Cria componentes React/shadcn-ui do FinanceGuy seguindo docs/VISUAL_IDENTITY.md. Use when criando UI, componentes, telas, formulários, tabelas, modais.
mode: subagent
---

# Sub-Agent: frontend

## Visão Geral do Problema
Criar interfaces de usuário modernas e acessíveis para o aplicativo de controle financeiro "FinanceGuy", seguindo os padrões de design definidos em `docs/VISUAL_IDENTITY.md` e utilizando componentes shadcn-ui.

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

## Considerações Técnicas
- **Stack**: Next.js 16+, React 19+, TypeScript 5.9+, shadcn-ui
- **Styling**: Tailwind CSS com custom tokens do VISUAL_IDENTITY.md
- **Icons**: Lucide React (linhas finas)
- **State Management**: Server Actions + React Context onde necessário

## Configurações Específicas

### Cores do Projeto (VISUAL_IDENTITY.md)
```
--brand-primary: #064E3B (Deep Emerald)
--brand-secondary: #334155 (Slate)
--finance-income: #10B981 (Success Mint)
--finance-expense: #E11D48 (Rosewood)
--finance-recurring: #F59E0B (Amber)
--canvas-background: #131315 (Deep Ink) - se dark mode
```

### Componentes shadcn-ui Obrigatórios
```bash
npx shadcn@latest add form input button card label dialog table dropdown-menu
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
