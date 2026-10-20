---
name: codebase-memory
description: Gerencia memória de longo prazo da codebase usando MCP para indexação e busca de padrões arquiteturais e contextos.
---

# Codebase Memory Skill

Esta skill fornece instruções para interagir com o servidor MCP `codebase-memory`.

## Quando usar
- Para consultar padrões arquiteturais documentados no passado.
- Para buscar contextos históricos de refatoração ou decisões de design.
- Após alterações significativas no código, para atualizar o índice de memória.

## Comandos Principais
- `memory:sync`: Sincroniza o estado atual do código com o índice de memória.
- `memory:query <consulta>`: Busca informações no índice de memória.

## Diretrizes de Uso
- Sempre mantenha o índice atualizado (`sync`) antes de realizar buscas complexas.
- Ao identificar um padrão arquitetural novo, utilize `memory:add-pattern <descrição>` para documentar.
- Não indexe segredos ou dados sensíveis do projeto.
