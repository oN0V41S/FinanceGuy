---
name: init-pr
description: Executa o pipeline de automação para preparação e validação de Pull Requests (docs, testes, build, segurança, review).
---

# Init-PR Pipeline Skill

Esta skill automatiza o checklist obrigatório para submissão de código conforme definido em `AGENTS.md`.

## Quando usar
- Sempre antes de abrir um PR para a branch `main`.

## O que o pipeline faz (ordem sequencial)
1. **Docs**: Valida documentação técnica e atualiza specs.
2. **QA**: Executa `pnpm test` e `pnpm test:coverage`.
3. **Build**: Executa `pnpm build`.
4. **Security**: Audita secrets e dependências.
5. **Review**: Executa auditoria de Clean Architecture.
6. **PR**: Prepara o ambiente para submissão.

## Como executar
- Execute via terminal: `pnpm run init-pr`

## Regras de Resiliência
- Se qualquer passo falhar, o pipeline interrompe a execução imediatamente e reporta o erro.
- Não abra o PR até que todos os passos passem com sucesso.
