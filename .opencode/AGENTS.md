# OpenCode Agents - FinanceGuy

Este arquivo serve como índice central de todos os sub-agents disponíveis para o projeto.

## Estrutura de Agents

```
.opencode/agents/
├── frontend/                    # ✅ Configurado com shadcn-ui + VISUAL_IDENTITY.md
├── quality-assurance-analyst/    # ✅ Testes Jest, coverage
├── docs-architect/              # ✅ Documentação técnica
├── project-review/             # ✅ Clean Architecture validation
├── security-secret-auditor/     # ✅ Auditoria de segurança
```

## Visão Geral dos Agents

### 🔴 Alta Prioridade

| Agent | Propósito | Especialização |
|-------|-----------|----------------|
| **frontend** | UI/UX Development | shadcn-ui, React, Tailwind |
| **quality-assurance-analyst** | Quality Assurance | Jest, RTL, E2E |
| **security-secret-auditor** | Security | Secrets detection, CVEs |

### 🟡 Média Prioridade

| Agent | Propósito | Especialização |
|-------|-----------|----------------|
| **docs-architect** | Documentation | Markdown, API docs |
| **project-review** | Architecture Review | Clean Architecture, FinOps |
| **builder** | Build & Deploy | Next.js, optimization |

### 🟢 Baixa Prioridade

| Agent | Propósito | Especialização |
|-------|-----------|----------------|
| **opencode-skill-architect** | Skill Management | Skill creation, validation |

---

## Como Usar

Os sub-agents podem ser invocados via Task tool:

```typescript
// Exemplo de uso
task(subagent_type="frontend", prompt="Crie um componente de cards...")
```

---

## Integração com Skills

Os agents usam as skills do projeto para executar tarefas específicas:

| Agent | Skills Utilizadas |
|-------|-------------------|
| **frontend** | `shadcn-ui`, `react-components`, `design-md`, `taste-design` |
| **quality-assurance-analyst** | `quality-assurance-analyst` skill |
| **docs-architect** | `documentation-architect`, `design-md` |
| **project-review** | `project-review` skill, `prisma-scaffold` |
| **security-secret-auditor** | Nenhuma (usa ferramentas nativas) |
| **builder** | Nenhuma (executa comandos) |
| **opencode-skill-architect** | Nenhuma (gere skills) |

---

## Configurações por Agent

### Frontend Agent (Especial)
O agent `frontend` está configurado para seguir:
- **Design System**: `@docs/VISUAL_IDENTITY.md`
- **Componentes Base**: shadcn-ui
- **Paleta de Cores**:
  - Primary: #2563EB (Trust Blue)
  - Secondary: #8B5CF6 (Insight Violet)
  - Income: #10B981
  - Expense: #E11D48
  - Background: #131315 (Deep Ink)
- **Tipografia**: Inter, Space Grotesk, JetBrains Mono

---

## Criando Novos Agents

Para criar um novo agent, use a estrutura:
```bash
mkdir -p .opencode/agents/<agent-name>/
```

Crie um arquivo `AGENT.md` seguindo o template em `opencode-skill-architect/AGENT.md`.