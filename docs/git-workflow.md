# GitHub Flow (Estratégia de Branches) – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Modelo](#modelo)
2. [Nomenclatura de Branches](#nomenclatura-de-branches)
3. [Branches de Tarefa (`FING-N`)](#branches-de-tarefa-fing-n)
4. [Ciclo de Vida de uma Branch](#ciclo-de-vida-de-uma-branch)
5. [Regras do GitHub Flow](#regras-do-github-flow)
6. [Fluxo de Desenvolvimento Recomendado](#fluxo-de-desenvolvimento-recomendado)

---

## Modelo

O projeto segue **GitHub Flow** — modelo simples, linear e ideal para deployment contínuo.

```
main ── feat/nova-feature ──► PR ──► main ── feat/outra ──► PR ──► main
```

- **`main`**: única branch permanente. Sempre deployável.
- **Feature branches**: criadas de `main`, nomeadas com prefixo semântico + descrição curta.
- **Hotfix**: também branch de `main` → PR → merge (idêntico a feature, sem `hotfix/` especial).

## Nomenclatura de Branches

| Prefixo | Uso | Exemplo |
|---------|-----|---------|
| `feat/` | Nova funcionalidade | `feat/dashboard-cards` |
| `fix/` | Correção de bug | `fix/login-redirect` |
| `refactor/` | Refatoração sem mudança de comportamento | `refactor/auth-service` |
| `chore/` | Tarefa de infra/setup | `chore/update-deps` |
| `docs/` | Documentação | `docs/api-endpoints` |
| `FING-N` | Branch de tarefa da pipeline `fg-pipeline` (apenas o código do Notion) | `FING-12` |

## Branches de Tarefa (`FING-N`)

Regra da skill `fg-pipeline` (ver `docs/specs/FING-26-fg-pipeline.md`):

- Branch de tarefa é nomeada **apenas pelo código do Notion**, em **maiúsculas**: `FING-N` (ex.: `FING-12`). Sem prefixo semântico, sem sufixo descritivo.
- É criada a partir de **`origin/main`** atualizado (`git fetch origin main`), nunca da `main` local desatualizada.
- O trabalho acontece em uma **worktree irmã** `../FinanceGuy-FING-N` (`git worktree add ../FinanceGuy-FING-N -b FING-N origin/main`), deixando o checkout principal intocado.
- Commits seguem Conventional Commits com o código: `feat(transactions): ... (FING-12)`.
- O **CI também dispara em `FING-*`** (o `push.branches` do workflow inclui `main`, `feat/**`, `fix/**`, `refactor/**` e `'FING-*'`).

## Ciclo de Vida de uma Branch

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

## Regras do GitHub Flow

- **Toda branch nasce de `main`** e mergeia de volta em `main` via PR (passando por `staging` — ver abaixo).
- **Squash merge** para manter histórico linear.
- **Branches são temporárias**: deletar após merge (local + remoto).
- Sempre manter `main` deployável (testes + build passando).
- **Conventional Commits** obrigatório: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

## Gate de `staging`

Feature branches abrem PR contra **`staging`** (não direto em `main`). Depois de validado em staging (CI verde + preview Vercel), abre-se um PR `staging` → `main` para promover para produção.

```
feat/minha-feature ──► PR ──► staging ──► PR ──► main
```

## Exclusão de branches após merge

O repositório tem **`delete_branch_on_merge: false`**: a exclusão automática foi desativada porque apagava a `staging` quando o PR `staging` → `main` era mergeado. Apague as branches de feature manualmente após o merge (`git push origin --delete <branch>` e `git branch -d <branch>`). **Nunca apague `staging` nem `main`.**

## Fluxo de Desenvolvimento Recomendado

1. Crie uma feature branch de `main`: `git checkout -b feat/nome-descritivo`
2. Antes de escrever qualquer código, escreva os testes que definem o comportamento esperado.
3. Implemente a funcionalidade mínima para passar nos testes (TDD).
4. Refatore o código seguindo as diretrizes de estilo e arquitetura.
5. Execute `npm run lint` para verificar problemas de estilo.
6. Execute os testes novamente para garantir que nada foi quebrado.
7. Commit usando Conventional Commits (`feat:`, `fix:`, etc.).
8. Push e abra PR para `main`.
9. Após merge, delete a branch (local + remoto).
