# Testes – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Comandos de Testes (Jest)](#comandos-de-testes-jest)
2. [Criar Testes Antes de Criar Funções (TDD)](#criar-testes-antes-de-criar-funções-tdd)

---

## Comandos de Testes (Jest)

Toda funcionalidade nova ou alteração deve ter cobertura de testes. Abaixo estão os comandos disponíveis no fluxo de trabalho:

| Comando | Descrição |
|---------|-----------|
| `npm run test` | Executa todos os testes. |
| `npx jest <caminho_do_arquivo>` | Executa um arquivo de teste específico (recomendado para ciclos rápidos). |
| `npx jest -t "<nome_do_teste>"` | Executa um único teste por nome (filtro). |
| `npm run test:watch` | Executa testes em modo de observação. |
| `npm run test:coverage` | Gera relatório de cobertura de testes. |

---

## Criar Testes Antes de Criar Funções (TDD)

### Princípio

Antes de implementar qualquer função ou componente, escreva os testes unitários correspondentes.

### Estrutura de Testes

Siga a estrutura de testes existente em `src/features/*/__tests__` ou `src/app/*/__tests__`.

### Frameworks

Utilize Jest como framework de teste e React Testing Library para componentes React.

### Casos de Teste

- **Funções puras**: teste casos de borda e valores esperados.
- **Componentes**: teste renderização, interações e estados.

### Convenção de Nomes

Nomeie os arquivos de teste seguindo a convenção: `[nome-do-arquivo].test.ts` ou `[nome-do-arquivo].spec.ts`.
