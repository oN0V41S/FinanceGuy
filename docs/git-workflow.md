# GitHub Flow (Estratégia de Branches) – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Modelo](#modelo)
2. [Nomenclatura de Branches](#nomenclatura-de-branches)
3. [Ciclo de Vida de uma Branch](#ciclo-de-vida-de-uma-branch)
4. [Regras do GitHub Flow](#regras-do-github-flow)
5. [Fluxo de Desenvolvimento Recomendado](#fluxo-de-desenvolvimento-recomendado)

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

- **Toda branch nasce de `main`** e mergeia de volta em `main` via PR.
- **Squash merge** para manter histórico linear.
- **Branches são temporárias**: deletar após merge (local + remoto).
- Sempre manter `main` deployável (testes + build passando).
- **Conventional Commits** obrigatório: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

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
