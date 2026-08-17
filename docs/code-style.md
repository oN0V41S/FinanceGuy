# Estilo de Código – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Imports](#imports)
2. [Naming Conventions](#naming-conventions)
3. [Tipagem](#tipagem)
4. [Formatação](#formatação)
5. [Tratamento de Erros](#tratamento-de-erros)
6. [Prisma](#prisma)
7. [Componentes](#componentes)

---

## Diretrizes de Estilo de Código

### Imports

Utilize caminhos absolutos (`@/features/...`, `@/lib/...`) em vez de relativos.

### Naming Conventions

- `PascalCase` para componentes, classes, interfaces e tipos.
- `camelCase` para funções, variáveis e métodos.
- `SCREAMING_SNAKE_CASE` apenas para constantes globais.

### Tipagem

Evite o uso de `any`. Defina interfaces ou tipos (`type`) explícitos para todos os objetos de dados e parâmetros de funções.

### Formatação

Siga a configuração definida pelo ESLint e Prettier do projeto.

### Tratamento de Erros

Utilize `try...catch` em operações assíncronas (como banco de dados ou chamadas de API) e retorne erros tratados (ex: `Result` pattern ou `Either` se aplicável).

### Prisma

Sempre utilize uma instância única (singleton) do `PrismaClient` para evitar esgotamento de conexões. Não instancie `new PrismaClient()` dentro de repositórios.

### Componentes

Utilize componentes funcionais com Hooks. Prefira compor componentes menores a criar um grande componente.
