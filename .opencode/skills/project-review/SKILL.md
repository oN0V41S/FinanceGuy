---
name: project-review
description: Revisa arquitetura, manutenibilidade e simplicidade do FinanceGuy (Clean Architecture, Prisma, Zod, FinOps). Use antes de PRs, releases ou ao auditar uma feature.
---

# Project Review Skill

This skill helps developers analyze complete project structures, identify code patterns and conventions, and provide actionable insights for improving code organization and quality.

## When to Use This Skill
- Verifying adherence to Clean Architecture layers (`domain`, `use-cases`, `repositories`, etc.).
- Ensuring TypeScript version, Prisma, and Zod usage standards.
- Checking for proper error handling, logging avoidance, and security practices.
- Validating FinOps principles: granularity, context management, resiliency, performance.
- Auditing commit messages, branch naming, and CI/CD pipeline health.

## When NOT to Use This Skill
- Writing new features or fixing bugs directly.
- Deploying the project to production or staging environments.
- Modifying runtime configurations or environment variables.
- Performing data migrations or schema changes.

## Workflow Phases
1. **Scope Definition** – Identify which modules, features, or commits are under review.
2. **Static Analysis** – Run `npm run lint`, `npx tsc --noEmit`, and custom scripts for architecture checks.
3. **Dependency & License Check** – Use `bash` to audit `package.json` and license files.
4. **Test Coverage Verification** – Run `npm run test:coverage` and ensure thresholds are met.
5. **FinOps Metrics Collection** – Count lines of code per function, assess context window usage, look for memoization.
6. **Quality Axes Review** – Evaluate **architecture** (dependency direction, repository/DI boundaries, Zod at entry, ownership by `userId`), **maintainability** (cohesion, duplication, naming, testability, visible debt) and **simplicity** (no speculative abstraction, dead code, minimal state and dependencies). The checklist and thresholds live in `.opencode/agents/project-review.md` ("Pontos de Qualidade"); thresholds are alert signals that require justification, not automatic failures.
7. **Report Generation** – Produce a markdown summary with findings (axis, severity, file:line, signal, suggested fix), a per-axis summary and the top 3 highest-return items.
8. **Follow-Up** – Create issues or pull requests for each high-priority finding.

## Tool Usage & Permissions
- Allowed: `read`, `glob`, `grep`, `bash` (to run lint, test, coverage scripts), `write` (to create review reports), `edit` (to fix minor formatting issues if authorized), `webfetch` (to retrieve license texts), `websearch` (to lookup latest TypeScript/Prisma versions).
- Prohibited: Any tool that alters source code beyond formatting/lint fixes, or that triggers builds/deploys without explicit user approval.

## Execution Guidelines
- You must run `npm run lint` before any other check and treat lint errors as findings.
- Always verify that each file uses absolute imports (`@/features/...`) and reports violations.
- Never commit changes to the project unless the user explicitly requests an auto-fix.
- If a test fails, record the failure but do not attempt to fix it unless instructed.
- When reporting FinOps violations, suggest concrete refactorings (e.g., split a function, add `React.memo`).

## Quality Assurance
- Ensure the review report is written in valid markdown and includes a summary table.
- Run a spell-check on the report (`bash` + `codespell` if available).
- Optionally, have a peer agent review the review (meta-review) for completeness.