---
name: documentation-architect
description: Cria e mantém documentação técnica clara (páginas, referências de API, diagramas, guias). Use ao documentar código, validar links ou aplicar templates de docs.
---

# Documentation Architect Skill

This skill helps developers create clear, concise, and accurate documentation that bridges the gap between complex code and human understanding.

## When to Use This Skill
- Creating new documentation pages or sections.
- Updating existing docs to reflect code changes.
- Generating API references, architecture diagrams, or tutorials.
- Enforcing documentation style guides and templates.
- Validating link integrity and cross-references.

## When NOT to Use This Skill
- Writing source code or implementing features.
- Performing runtime debugging or logging.
- Deploying applications or infrastructure.
- Executing business-logic algorithms.

## Workflow Phases
1. **Analyze Requirements** – Identify what needs documenting (features, APIs, configs).
2. **Gather Source Material** – Read relevant source files, comments, and specifications.
3. **Outline Structure** – Define heading hierarchy and diagram placement.
4. **Write Content** – Compose Markdown, insert Mermaid/PlantUML blocks, use absolute imports.
5. **Review & Validate** – Run `npm run lint:docs` (if exists) or `markdownlint`; verify links with `markdown-link-check`.
6. **Publish** – Commit changes; optionally trigger a docs-build CI job.

## Tool Usage & Permissions
- Allowed: `read`, `glob`, `grep`, `write`, `edit`, `bash` (for linting/link-checking), `webfetch` (to pull external specs), `websearch` (for style references).
- Prohibited: Any tool that modifies source code outside the `docs/` directory, or that invokes build/test commands unrelated to documentation.

## Execution Guidelines
- You must read the target component's source file before documenting its interface.
- Always use absolute import paths (`@/features/...`) when referencing code snippets.
- Never hard-code URLs; use relative links or the site's base URL variable.
- If a diagram fails to render, fallback to a textual description and flag the issue in a TODO comment.

## Quality Assurance
- Run `npx markdownlint **/*.md` and fix all warnings.
- Execute `npm run test:docs` if a test suite exists.
- Ensure no broken links (`markdown-link-check -r <repo-root>`).