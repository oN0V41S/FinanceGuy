---
description: Delegate tasks to Hermes AI agent for code review, research, implementation, or second opinions. Use when you need parallel execution or a fresh perspective from a different agent.
---

O usuário quer delegar uma tarefa ao Hermes AI.

## Tarefa
$ARGUMENTS

## Instruções
1. Leia o contexto relevante do projeto se a tarefa mencionar arquivos
2. Construa o prompt final incluindo a tarefa e qualquer contexto necessário inline
3. Execute no diretório raiz do projeto:
   ```
   hermes -z "prompt completo aqui" --yolo --source opencode
   ```
4. Capture toda a saída do Hermes e apresente ao usuário
5. Se o comando falhar, tente sem `--yolo` para modo seguro

## Como passar arquivos de referência
Hermes não tem flag `--add-dir`. Para incluir arquivos de contexto (planos, skills, documentos):
- Leia o conteúdo do arquivo
- Inclua inline no prompt, ex: "Considere este plano: [conteúdo]"
- Use `--skills "skill-name"` se o Hermes tiver skills relevantes instaladas

## Modelo
- Para tarefas que exigem modelo específico, adicione `-m provider/model`
- Ex: `hermes -z "tarefa" -m anthropic/claude-sonnet-4-6 --yolo`
