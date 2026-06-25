# 🏦 Governança Técnica: FinanceGuy

Você é um agente especializado em sistemas financeiros operando sob os princípios de **Clean Architecture**. Sua execução é monitorada por diretrizes de **FinOps** para garantir eficiência de custo e precisão técnica.

## 🏗️ Princípios Arquiteturais
- **Clean Architecture**: Mantenha uma separação clara de camadas (`domain`, `use-cases`, `repositories`, `components`, `services`).
- **Tecnologias**: Next.js 16+, React 19+, TypeScript 5.9+, Prisma 5.22+, Jest 30+.
- **Consistência**: Use Prisma 5.22 e Zod para todas as interações de banco de dados e validações.
- **Princípio da Responsabilidade Única**: Cada arquivo/função deve ter uma única responsabilidade clara.

## 🛠️ Comandos de Fluxo de Trabalho (CLI)
Utilize estes comandos para operações diárias.

### Desenvolvimento
- `pnpm run dev`: Inicia o ambiente de desenvolvimento (com Turbo).
- `pnpm run build`: Compila a aplicação para produção.
- `pnpm run lint`: Executa a verificação de estilo e erros.

### Banco de Dados
- `npx prisma generate`: Gera o cliente do Prisma.
- `npx prisma db push`: Atualiza o esquema do banco de dados (usar com cuidado, evite em produção).
- `npx prisma studio`: Abre a interface de gerenciamento de dados.

### Testes (Jest)
Toda funcionalidade nova ou alteração deve ter cobertura de testes.
- `npm run test`: Executa todos os testes.
- `npx jest <caminho_do_arquivo>`: Executa um arquivo de teste específico (recomendado para ciclos rápidos).
- `npx jest -t "<nome_do_teste>"`: Executa um único teste por nome (filtro).
- `npm run test:watch`: Executa testes em modo de observação.
- `npm run test:coverage`: Gera relatório de cobertura de testes.

## 🎨 Diretrizes de Estilo de Código
- **Imports**: Utilize caminhos absolutos (`@/features/...`, `@/lib/...`) em vez de relativos.
- **Naming Conventions**:
  - `PascalCase` para componentes, classes, interfaces e tipos.
  - `camelCase` para funções, variáveis e métodos.
  - `SCREAMING_SNAKE_CASE` apenas para constantes globais.
- **Tipagem**: Evite o uso de `any`. Defina interfaces ou tipos (`type`) explícitos para todos os objetos de dados e parâmetros de funções.
- **Formatação**: Siga a configuração definida pelo ESLint e Prettier do projeto.
- **Tratamento de Erros**: Utilize `try...catch` em operações assíncronas (como banco de dados ou chamadas de API) e retorne erros tratados (ex: `Result` pattern ou `Either` se aplicável).
- **Prisma**: Sempre utilize uma instância única (singleton) do `PrismaClient` para evitar esgotamento de conexões. Não instancie `new PrismaClient()` dentro de repositórios.
- **Componentes**: Utilize componentes funcionais com Hooks. Prefira compor componentes menores a criar um grande componente.

## 🔒 Segurança
- O acesso a arquivos `.env` e segredos é proibido.
- Validação de entrada: Utilize Zod para validar todos os dados de entrada antes de processá-los na camada de domínio.
- Nunca faça log de dados sensíveis ou tokens de autenticação.
- Sanitização de dados: Garanta que entradas do usuário sejam tratadas para evitar XSS e SQL Injection.

## 📉 Protocolos de FinOps (Otimização)
- **Granularidade**: Quebre tarefas complexas em subtarefas pequenas.
- **Context Management**: Otimize o uso da janela de contexto; mantenha apenas os arquivos e logs relevantes.
- **Resiliência**: Se ocorrer um erro recorrente, pare a execução, analise o log e solicite feedback. Evite loops de erro.
- **Performance**: Evite renderizações desnecessárias. Use `memo` ou otimizações do React quando necessário para componentes pesados.

## 🤖 Automação e Workflow (Skills & Commands)
- **Proatividade**: O agente DEVE utilizar automaticamente as Skills (`domain-scaffold`, `prisma-verify`, `jest-test-gen`, `shadcn-integrator`) e Commands (`verify-full`, `db-safe-push`, `feature-audit`) para garantir a conformidade arquitetural, caso o usuário não os invoque explicitamente.
- **Governança Automatizada**: Antes de finalizar qualquer feature, execute `feature-audit` e `verify-full` para garantir que o código cumpre os padrões estabelecidos antes do commit.

- Sempre pesquise links de documentações oficiais, e caso não saiba a versão que o usuário está usando da ferramenta pergunte.
- SEMPRE utilize sub-agents para tarefas extensas. Quebre tarefas complexas em subtarefas menores se o usuário não o fizer.
- Sempre verifique a existência de um arquivo antes de editá-lo.
- Sempre rode `npm run lint` antes de propor um commit.
- Garanta que os testes passem após qualquer alteração (rodar `npx jest <teste_relacionado>`).
- Em caso de dúvida sobre a implementação, procure exemplos similares no diretório `src/features`.
- Siga estritamente as convenções de commits do repositório (ex: `feat:`, `fix:`, `refactor:`, `test:`).

## 🐛 Depuração
- Em caso de falha, verifique `src/features/.../__tests__` para entender como a funcionalidade é testada.
- Adicione logs apenas se necessário e garanta que não sejam permanentes.
- Verifique `TECHNICAL_DOCS.md` para decisões arquiteturais documentadas.
- Utilize o modo debug do Jest com `node --inspect-brk node_modules/.bin/jest --runInBand <teste>` para investigar falhas complexas.
- Documente padrões de erro recorrentes encontrados em `src/shared/utils.ts` ou similares.
- Se necessário, refatore o código para torná-lo mais testável, seguindo princípios de injeção de dependência.
- Use `console.log` com cautela em ambientes de teste; prefira assertions e mocks.
- Mantenha mocks atualizados com o contrato real do serviço ou repositório.
- Em caso de bugs persistentes no frontend, utilize as ferramentas de desenvolvimento do navegador (simuladas se possível) ou os relatórios de erro do sistema.
- Se um teste falhar devido a alterações no banco, verifique se a migration necessária foi aplicada.
- Sempre limpe o ambiente de teste após execução (Mocks devem ser resetados ou limpos).
- Em caso de dúvidas, consulte o `TECHNICAL_DOCS.md` e procure por decisões de design anteriores.
- Reporte problemas estruturais através do fluxo `/bug` ou via issue no GitHub.
- Mantenha a documentação atualizada conforme refatora o código.

## 🧩 Diretrizes Específicas do Projeto

### Componentes de UI com base em shadcn-ui
- Utilize os componentes do shadcn-ui como base para todos os elementos de interface.
- Siga rigorosamente o guia definido em `@docs/VISUAL_IDENTITY.md` para padronização visual.
- Para formulários de autenticação, utilize exatamente as estruturas definidas na seção 8 do VISUAL_IDENTITY.md.
- Cores da palette "Linear Financial" devem ser utilizadas conforme definidas:
  - Primária: Trust Blue `#2563EB`
  - Secundária: Insight Violet `#8B5CF6`
  - Fundo: Deep Ink `#131315`
  - Sucesso: Success Mint `#10B981`
- Componentes shadcn-ui essenciais para este projeto: `form`, `input`, `button`, `card`, `label`, `form-field`, `form-item`, `form-control`, `form-message`.

### Criar Testes Antes de Criar Funções (TDD)
- Antes de implementar qualquer função ou componente, escreva os testes unitários correspondentes.
- Siga a estrutura de testes existente em `src/features/*/__tests__` ou `src/app/*/__tests__`.
- Utilize Jest como framework de teste e React Testing Library para componentes React.
- Para funções puras, teste casos de borda e valores esperados.
- Para componentes, teste renderização, interações e estados.
- Nomeie os arquivos de teste seguindo a convensão: `[nome-do-arquivo].test.ts` ou `[nome-do-arquivo].spec.ts`.

### Middleware / Proxy (Next.js 16+)
- **Localização**: `src/proxy.ts` (NÃO use `middleware.ts` na raiz).
- **Funcionamento**: No Next.js 16+, o arquivo de interceptação de rotas deve estar em `src/proxy.ts` e ser exportado como `default`.
- **Regra**: Sempre utilize `src/proxy.ts` para proteção de rotas, redirecionamentos e injeção de headers. Nunca crie `middleware.ts` na raiz do projeto.
- **Configuração**: O `matcher` deve excluir rotas de API, arquivos estáticos e server actions:
  ```typescript
  export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
  };
  ```

### Arquitetura Atual do Projeto
A aplicação segue Clean Architecture com estas camadas principais:
```
src/
├── app/
│   ├── api/                # Handlers proxy que invocam serviços das features
│   │   ├── auth/
│   │   └── transactions/
│   ├── (auth)/             # Rotas de autenticação
│   ├── dashboard/          # Rotas do dashboard
│   └── ...                 # Outras rotas
├── core/
│   └── container.ts        # Injeção de dependência (DI)
├── features/               # Domínio (Clean Architecture)
│   ├── auth/
│   │   ├── components/     # Componentes de UI
│   │   ├── actions/        # Server actions
│   │   ├── __tests__/      # Testes
│   │   ├── schemas/        # Schemas Zod
│   │   └── ...             # Services, repositories
│   └── transactions/
│       ├── components/     # Componentes de transação
│       ├── __tests__/      # Testes
│       └── ...             # Services, repositories, validations
├── lib/
│   ├── prisma.ts           # Singleton PrismaClient
│   └── auth-middleware.ts  # Segurança JWT
├── shared/                 # Tipos e utilitários globais
│   ├── hooks/              # Custom hooks
│   ├── utils.ts            # Utilitários compartilhados
│   └── types.ts            # Tipos globais
└── proxy.ts                # Proteção de rotas e injeção de x-user-id (Next.js 16+)
```

### Integração com VISUAL_IDENTITY.md
Este documento define a identidade visual completa do projeto e deve ser seguido rigorosamente:
- **Paleta de Cores**: Utilize as cores definidas na seção 2 para todos os elementos UI.
- **Tipografia**: Siga as especificações da seção 3 para headings, body e valores monetários.
- **Elementos Visuais**: Implemente as especificações de seção 5 (bordas, sombras, iconografia, empty states).
- **Formulários**: Siga exatamente as estruturas definidas na seção 8 para formulários de autenticação.
- **Estados de Carregamento**: Implemente os spinners e estados de loading conforme seção 8.9.
- **Feedback Visual**: Utilize os indicadores de validação em tempo real da seção 8.7 e indicadores de força de senha da seção 8.8.

## 🌿 GitHub Flow (Estratégia de Branches)

O projeto segue **GitHub Flow** — modelo simples, linear e ideal para deployment contínuo.

### Modelo
```
main ── feat/nova-feature ──► PR ──► main ── feat/outra ──► PR ──► main
```

- **`main`**: única branch permanente. Sempre deployável.
- **Feature branches**: criadas de `main`, nomeadas com prefixo semântico + descrição curta.
- **Hotfix**: também branch de `main` → PR → merge (idêntico a feature, sem `hotfix/` especial).

### Nomenclatura de Branches
| Prefixo | Uso | Exemplo |
|---------|-----|---------|
| `feat/` | Nova funcionalidade | `feat/dashboard-cards` |
| `fix/` | Correção de bug | `fix/login-redirect` |
| `refactor/` | Refatoração sem mudança de comportamento | `refactor/auth-service` |
| `chore/` | Tarefa de infra/setup | `chore/update-deps` |
| `docs/` | Documentação | `docs/api-endpoints` |

### Ciclo de Vida de uma Branch
```
1. git checkout -b feat/minha-feature   ← nasce de main
2. Commits atômicos com Conventional Commits
3. git push origin feat/minha-feature
4. Abrir Pull Request para main
   ├─ CI roda: lint → test → build
   └─ Code review (se houver colaboradores)
5. Squash merge em main
6. git branch -d feat/minha-feature     ← deletar local
7. git push origin --delete feat/minha-feature  ← deletar remoto
```

### Regras do GitHub Flow
- **Toda branch nasce de `main`** e mergeia de volta em `main` via PR.
- **Squash merge** para manter histórico linear.
- **Branches são temporárias**: deletar após merge (local + remoto).
- Sempre manter `main` deployável (testes + build passando).
- **Conventional Commits** obrigatório: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

### Por que GitHub Flow?
- Simplicidade: uma única branch permanente vs 5 do Git Flow.
- Ideal para time solo ou pequeno.
- CI/CD contínuo (cada merge em main pode gerar deploy).
- Preparado para futuro multi-repo (cada repo opera independente).

### Fluxo de Desenvolvimento Recomendado
1. Crie uma feature branch de `main`: `git checkout -b feat/nome-descritivo`
2. Antes de escrever qualquer código, escreva os testes que definem o comportamento esperado.
3. Implemente a funcionalidade mínima para passar nos testes (TDD).
4. Refatore o código seguindo as diretrizes de estilo e arquitetura.
5. Execute `npm run lint` para verificar problemas de estilo.
6. Execute os testes novamente para garantir que nada foi quebrado.
7. Commit usando Conventional Commits (`feat:`, `fix:`, etc.).
8. Push e abra PR para `main`.
9. Após merge, delete a branch (local + remoto).

## 📚 Autenticação (NextAuth v5)

### Configuração do NextAuth
O arquivo principal é `src/auth.ts` que deve exportar:
- `handlers` - para as rotas API (`GET` e `POST`)
- `signIn`, `signOut`, `auth` - para uso em Server Actions e componentes

### Rotas API
Crie o arquivo `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
export { GET, POST } from "@/auth"
```

### Variáveis de Ambiente
```
AUTH_SECRET=gerado com npx auth secret
AUTH_TRUST_HOST=true
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://...
```

### Configuração de Sessão
Para o Credentials Provider, use estratégia JWT:
```typescript
session: { strategy: "jwt" }
```

### Server Actions
Use `signIn` e `signOut` diretamente nas Server Actions:
```typescript
import { signIn } from "@/auth";

await signIn("credentials", {
  email,
  password,
  redirect: false,
});
```

### Configuração do Next.js para Server Actions
Para ambientes com proxy (Vercel, Codespaces), adicione em `next.config.ts`:
```typescript
experimental: {
  serverActions: {
    allowedOrigins: ["seu-dominio.vercel.app", "localhost:3000"],
  },
},
```

## 🤖 Invocação Automática de Sub-Agents

O OpenCode DEVE invocar automaticamente os sub-agents listados abaixo SEMPRE que as condições forem atendidas. O usuário NÃO precisa pedir explicitamente.

### Invocação Automática Obrigatória

| Sub-Agent | Quando Invocar Automaticamente |
|-----------|--------------------------------|
| **frontend** | • Criar/modificar componentes React<br>• Desenvolver UI para features<br>• Implementar formulários (login, registro, transações)<br>• Criar tabelas com filtros/ordenação<br>• Desenvolver modais e dialogs |
| **quality-assurance-analyst** | • Antes de qualquer commit<br>• Ao criar novas funções/services<br>• Ao modificar fluxos existentes<br>• Precisar de testes unitários, integração ou E2E<br>• Precisar de coverage report |
| **security-secret-auditor** | • Ao criar novos arquivos de configuração<br>• Ao integrar APIs externas<br>• Ao lidar com dados sensíveis (transações, auth)<br>• Ao adicionar dependências externas<br>• Ao fazer deploy |
| **project-review** | • Ao completar uma feature completa<br>• Antes de PRs/commits importantes<br>• Ao refatorar código existente<br>• Ao adicionar nova dependência<br>• Para validar Clean Architecture |
| **docs-architect** | • Ao criar novas APIs/routes<br>• Ao adicionar nova feature<br>• Ao modificar arquitetura<br>• Precisar gerar documentação técnica<br>• Criar ADRs |
| **builder** | • Ao executar `pnpm run build`<br>• Ao preparar deploy<br>• Ao verificar build errors<br>• Ao otimizar bundle |
| **opencode-skill-architect** | • Ao criar nova skill<br>• Ao auditar skills existentes<br>• Ao definir novos workflows |

### Fluxos de Automação Recomendados

#### 1. Nova Feature
```
1. quality-assurance-analyst → Escrever testes
2. frontend → Desenvolver UI
3. project-review → Validar arquitetura
4. docs-architect → Documentar
5. security-secret-auditor → Auditar código
```

#### 2. Modificação de Backend
```
1. quality-assurance-analyst → Testes unitários
2. project-review → Clean Architecture check
3. security-secret-auditor → Verify no hardcoded secrets
```

#### 3. Modificação de Frontend
```
1. frontend → Implementar componente
2. quality-assurance-analyst → Testes de componente
3. builder → Verificar build
```

#### 4. Deploy/Build
```
1. builder → Executar build
2. security-secret-auditor → Auditar dependências
3. project-review → Validar última verificação
```

### Invocação via Task Tool

```typescript
// Exemplos de como o OpenCode deve chamar automaticamente:

// Ao criar UI:
task(subagent_type="frontend", prompt="Crie o componente de TransactionTable...")

// Ao criar testes:
task(subagent_type="quality-assurance-analyst", prompt="Escreva testes para TransactionService...")

// Ao auditar segurança:
task(subagent_type="security-secret-auditor", prompt="Verifique patterns de injeção no código...")

// Ao fazer review:
task(subagent_type="project-review", prompt="Valide conformidade com Clean Architecture...")

// Ao documentar:
task(subagent_type="docs-architect", prompt="Gere documentação para a API de transações...")

// Ao fazer build:
task(subagent_type="builder", prompt="Execute pnpm run build e verifique erros...")

// Ao gerenciar skills:
task(subagent_type="opencode-skill-architect", prompt="Crie uma nova skill para..."
```

### Checklist de Automação

Antes de finalizar qualquer tarefa, o OpenCode DEVE verificar:
- [ ] Todos os testes passaram? → quality-assurance-analyst
- [ ] UI segue VISUAL_IDENTITY.md? → frontend
- [ ] Código seguro (sem secrets)? → security-secret-auditor
- [ ] Arquitetura válida? → project-review
- [ ] Documentação atualizada? → docs-architect
- [ ] Build funciona? → builder
