# Diário de Bordo: `authentication`

**Branch**: `feat/authentication` (deletada — conteúdo em `main`)  
**Criado em**: Abril 2026  
**Objetivo**: Implementar autenticação completa (API + UI) e integrar com CRUD de transações.

---

## Autenticação

### API
- [x] Schema Zod para Login/Registro
- [x] UserRepository (Prisma + PostgreSQL)
- [x] Server Actions (`loginAction`, `registerAction`)
- [x] API Routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`)
- [x] Testes unitários para actions e repositório

### UI
- [x] Página de Login (`/login`)
- [x] Página de Registro (`/register`)
- [x] Componente `LoginForm` com validação e feedback visual
- [x] Componente `RegisterForm` com validação e feedback visual
- [x] Componente `PasswordRequirements`
- [x] Componentes UI compartilhados (`FormAlert`, `FormError`, `FormInput`, `AuthButton`)
- [x] Proteção de rotas com middleware de autenticação
- [ ] Redirecionamento pós-login (dashboard)
- [ ] Sessão/Contexto de usuário no frontend

---

## Notas de Implementação

### Decisões Técnicas
- **Autenticação**: Optamos por Server Actions + Cookies em vez de NextAuth.js para maior controle sobre o fluxo e menor overhead.
- **Repository Pattern**: Mantido para facilitar testes e possível troca de ORM no futuro.
- **UI**: Componentes shadcn-ui customizados com a paleta "Balance" do projeto.

### Bugs/Problemas Conhecidos
- *(Adicionar aqui conforme surgirem)*

### Lembretes
- [ ] Rotacionar API keys antes de ir para produção
- [ ] Configurar CORS restritivo em produção
- [ ] Implementar rate limiting no middleware
- [ ] Adicionar Row-Level Security (RLS) no PostgreSQL

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04 | Criação do diário de bordo | oN0V41S |

---

*Este arquivo serve como registro de progresso e contexto para esta branch. Ao finalizar, as decisões arquiteturais definitivas devem ser migradas para `TECHNICAL_DOCS.md`.*