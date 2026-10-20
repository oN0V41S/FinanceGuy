# Card no Notion — mapeamento de propriedades e corpo da página

Banco **"Gestão do Projeto"** (`collection://334d3856-092b-83dc-842f-874864bcd670`), acessível via Notion MCP (`notion-fetch`, `notion-create-pages`, `notion-update-page`, `notion-search`).

## Propriedades ao criar a página

| Propriedade | Valor ao criar | Atualização |
|---|---|---|
| `Nome` | {{TITLE}} — título da tarefa | — |
| `Status` | `Não iniciada` | `Em andamento` ao aprovar a spec (Portão 1) |
| `Prioridade` | `Média` | — |
| `Side` | {{SIDE}} — inferido da área pela routing table: `Front-End` / `Back-End` / `Banco de Dados` / `Integração` | — |
| `Versão` | não preenchido | — |
| `Atribuir` | não preenchido | — |
| `Tempo Gasto` | não preenchido | — |
| `Código` | auto (`auto_increment_id`) — a skill **lê** o valor após criar e monta `FING-<número>` | — |

> Premissa: se o `Código` lido vier sem o prefixo, a skill monta `FING-<número>` (ex.: `26` → `FING-26`).

## Corpo da página

- **Na criação**: vazio.
- **Após o Portão 1 (spec aprovada)**: conteúdo integral da spec (`docs/specs/FING-<N>-<slug>.md`, markdown convertido) + link do caminho da spec.
- **Ao final da pipeline** (estado `committed`): acrescentar o bloco "Execução" abaixo.

### Bloco "Execução" (final da pipeline)

```markdown
## Execução

- **Branch**: {{CODIGO}}
- **Worktree**: {{WORKTREE}}
- **Commits**:
{{COMMITS_LIST}}
- **Achados da revisão**: {{FINDINGS_SUMMARY}}
```

## Regras

1. **Antes de criar** a página, mostrar os campos acima ao usuário e pedir "ok" — a escrita é visível a outras pessoas.
2. `Concluído` **nunca** é definido pela pipeline.
3. Notion indisponível / sem permissão → parar antes de criar a worktree; oferecer seguir com código manual informado pelo usuário.
4. Entrada `FING-N` inexistente no Notion → avisar e perguntar se o usuário quer criar um novo card.
5. Escrita no Notion apenas após o "ok" do usuário (e a spec aprovada para o corpo da página).
