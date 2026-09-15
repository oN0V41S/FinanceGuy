# GitHub Flow + Homologação (Estratégia de Branches) – FinanceGuy

**Versão**: 2.0 | **Status**: Ativo

---

## Índice

1. [Modelo](#modelo)
2. [Nomenclatura de Branches](#nomenclatura-de-branches)
3. [Ciclo de Vida de uma Branch](#ciclo-de-vida-de-uma-branch)
4. [Regras do Fluxo](#regras-do-fluxo)
5. [Ambientes Vercel](#ambientes-vercel)
6. [Fluxo de Desenvolvimento Recomendado](#fluxo-de-desenvolvimento-recomendado)

---

## Modelo

O projeto segue **GitHub Flow com um portão de homologação** — mais leve que GitFlow clássico (sem `release/*` nem `develop` permanente com regras de merge complexas), mas com uma branch estável para testar antes de produção.

```
main (produção)
 └── staging (homologação)
       ├── feat/FING-142-metas-financeiras ──► PR ──► staging
       ├── fix/FING-118-login-redirect     ──► PR ──► staging
       └── ...
staging ──► PR ──► main   (quando homologação está estável)
```

- **`main`**: branch de produção. Sempre deployável. Só recebe merge vindo de `staging` (exceto hotfix crítico).
- **`staging`**: branch de homologação, permanente. Recebe as branches de tarefa.
- **Branches de tarefa**: nascem de `staging`, nomeadas com prefixo semântico + código do card do Kanban (Notion).
- **Hotfix crítico de produção**: nasce de `main` → PR direto para `main` → depois back-merge (`main` → `staging`) para manter as branches sincronizadas.

## Nomenclatura de Branches

Prefixo semântico + código do card do Kanban no Notion (para rastreabilidade tarefa ↔ branch ↔ PR):

| Prefixo | Uso | Exemplo |
|---------|-----|---------|
| `feat/` | Nova funcionalidade | `feat/FING-142-metas-financeiras` |
| `fix/` | Correção de bug | `fix/FING-118-login-redirect` |
| `refactor/` | Refatoração sem mudança de comportamento | `refactor/FING-130-auth-service` |
| `chore/` | Tarefa de infra/setup | `chore/FING-101-update-deps` |
| `docs/` | Documentação | `docs/FING-99-api-endpoints` |

## Ciclo de Vida de uma Branch

```
1. git checkout -b feat/FING-142-metas-financeiras   ← nasce de staging
2. Commits atômicos com Conventional Commits
3. git push origin feat/FING-142-metas-financeiras
4. Abrir Pull Request para staging
   ├─ CI roda: lint → test → build
   ├─ Vercel gera Preview Deployment automático do PR (URL efêmera)
   └─ Code review (se houver colaboradores)
5. Squash merge em staging
6. git branch -d feat/FING-142-metas-financeiras     ← deletar local
7. git push origin --delete feat/FING-142-metas-financeiras  ← deletar remoto
8. Vercel atualiza o Preview Deployment fixo de staging (homolog.financeguy.*)
9. QA/usuário testa em homologação
10. Quando staging está estável → PR de staging para main → squash merge → deploy de produção
```

## Regras do Fluxo

- **Branches de tarefa nascem de `staging`** e mergeiam de volta em `staging` via PR.
- **`main` só recebe merge de `staging`** (nunca direto de uma branch de tarefa), exceto hotfix crítico.
- **Squash merge** em ambos os pontos (tarefa→staging e staging→main), para manter histórico linear.
- **Branches de tarefa são temporárias**: deletar após merge (local + remoto).
- Sempre manter `main` e `staging` deployáveis (testes + build passando).
- **Conventional Commits** obrigatório: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

## Ambientes Vercel

O Vercel não tem um terceiro tipo nativo de deployment "staging" — ele gera **Production** (branch de produção) ou **Preview** (qualquer outra branch/PR). Homologação é, na prática, um Preview Deployment da branch `staging`.

**Estado atual do projeto** (plano Hobby, sem domínio customizado):

| Branch | Tipo de deployment | URL |
|---|---|---|
| `main` | Production | `financeguy.vercel.app` |
| `staging` | Preview | `financeguy-git-staging-on0v41s-projects.vercel.app` (URL fixa, gerada automaticamente — sem custo, sem configuração extra) |
| `feat/*`, `fix/*` | Preview (efêmero) | `financeguy-git-<branch>-on0v41s-projects.vercel.app` (some ao deletar a branch) |

A branch `staging` foi criada a partir de `main` e já está no repositório remoto — o deployment acima é gerado automaticamente pela integração Git existente, sem passos manuais no dashboard.

### Limitações do plano Hobby (verificadas em 15/09/2026)

- **Custom Environments** (isolar `staging` como ambiente próprio, com domínio fixo e variáveis dedicadas) é recurso **pago do plano Pro** ($50/mês a cada 5 ambientes). No Hobby, `staging` cai no ambiente genérico **Preview**, junto com qualquer `feat/*`/`fix/*`.
- **Sem domínio customizado**: não há `app.financeguy.com`/`homolog.financeguy.com` — apenas subdomínios `*.vercel.app`.

### ⚠️ Pendência crítica: variáveis de ambiente compartilhadas

`DATABASE_URL`, `AUTH_SECRET`, `JWT_SECRET` e `NEXTAUTH_URL` estão hoje configuradas como **"All Environments"** no projeto Vercel — ou seja, **Production e Preview (incluindo `staging` e qualquer `feat/*`) usam o mesmo banco de dados e os mesmos segredos**. Não há isolamento entre homologação e produção.

Decisão registrada (15/09/2026): manter assim por ora, como risco aceito temporariamente — **qualquer teste em `staging` ou em Preview de PR opera sobre dados reais de produção**. Antes de usar `staging` para testes de fato, avaliar:

1. Provisionar um banco de homologação separado (ex: outro projeto no provedor de banco atual).
2. Criar `DATABASE_URL`/`AUTH_SECRET`/`JWT_SECRET`/`NEXTAUTH_URL` com escopo **apenas "Preview"** apontando para esse banco, sem alterar as variáveis de Production.
3. Sem isso, evitar em `staging` qualquer ação destrutiva ou que grave dados de teste (ex: criação de contas, transações fictícias) — elas cairiam no banco real.

## Fluxo de Desenvolvimento Recomendado

1. Crie uma branch de tarefa a partir de `staging`: `git checkout -b feat/FING-xxx-nome-descritivo`
2. Antes de escrever qualquer código, escreva os testes que definem o comportamento esperado.
3. Implemente a funcionalidade mínima para passar nos testes (TDD).
4. Refatore o código seguindo as diretrizes de estilo e arquitetura.
5. Execute `npm run lint` para verificar problemas de estilo.
6. Execute os testes novamente para garantir que nada foi quebrado.
7. Commit usando Conventional Commits (`feat:`, `fix:`, etc.).
8. Push e abra PR para `staging`.
9. Após merge, delete a branch (local + remoto) e valide em homologação.
10. Quando `staging` estiver estável, abra PR de `staging` para `main` e faça o deploy de produção.
