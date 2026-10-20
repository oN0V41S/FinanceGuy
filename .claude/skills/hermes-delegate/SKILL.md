---
name: hermes-delegate
description: Use when user mentions Hermes, wants a second opinion, parallel task execution, or delegating work to Hermes AI agent via CLI. Activates on keywords like hermes, /to-hermes, second opinion, delegate.
---

# Hermes Delegate Skill

Use this skill when delegating tasks to Hermes AI agent via CLI, treating it as a sub-agent for code review, research, implementation, or fresh perspective.

## When to Use
- User explicitly asks to use Hermes (`/to-hermes`, "use hermes", etc.)
- Task benefits from a second opinion or different model perspective
- Task is self-contained and can be parallelized (code review, research, document generation)
- You want to offload work to an autonomous agent while you handle other tasks

## When NOT to Use
- User did not mention Hermes or delegation
- Task requires tight coordination or back-and-forth with the user
- Task involves modifying critical production infrastructure

## How to Use

### Via Command
Use the `/to-hermes` command:
```
/to-hermes <task description>
```

### Via Direct Bash
Run directly:
```bash
hermes -z "your task here" --yolo --source opencode
```

### Including Reference Context
- Read files and inline their content in the prompt
- Use project context (directory structure, relevant code) in the prompt
- Reference existing plans, AGENTS.md, or SKILL.md files inline

### Parallel Delegation Pattern
For independent tasks, you can run multiple Hermes instances:
```bash
# Task 1: Code review
hermes -z "Revise o arquivo src/foo.ts" --yolo &

# Task 2: Research
hermes -z "Pesquise padrões de implementação" --yolo &

# Wait for both
wait
```

## Best Practices
- Be specific and self-contained in task descriptions
- Include file contents inline for reference
- Use `-m model` to specify a model when task requires specific capabilities
- For sensitive operations, omit `--yolo` to let Hermes prompt for approval
- Tag with `--source opencode` for session tracking in Hermes dashboard

## Troubleshooting
| Problem | Solution |
|---------|----------|
| Command hangs | Add timeout to bash execution |
| Permission error | Run without `--yolo` to see prompts |
| Wrong model | Use `-m provider/model` flag |
