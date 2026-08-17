# Autenticação (NextAuth v5) – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Configuração do NextAuth

O arquivo principal é `src/auth.ts` que deve exportar:

- `handlers` - para as rotas API (`GET` e `POST`)
- `signIn`, `signOut`, `auth` - para uso em Server Actions e componentes

---

## Rotas API

Crie o arquivo `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
export { GET, POST } from "@/auth"
```

---

## Variáveis de Ambiente

```
AUTH_SECRET=gerado com npx auth secret
AUTH_TRUST_HOST=true
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://...
```

---

## Configuração de Sessão

Para o Credentials Provider, use estratégia JWT:

```typescript
session: { strategy: "jwt" }
```

---

## Server Actions

Use `signIn` e `signOut` diretamente nas Server Actions:

```typescript
import { signIn } from "@/auth";

await signIn("credentials", {
  email,
  password,
  redirect: false,
});
```

---

## Configuração do Next.js para Server Actions

Para ambientes com proxy (Vercel, Codespaces), adicione em `next.config.ts`:

```typescript
experimental: {
  serverActions: {
    allowedOrigins: ["seu-dominio.vercel.app", "localhost:3000"],
  },
},
```

---

## Referências

- [docs/security.md](docs/security.md) — Diretrizes de segurança do projeto
- [docs/BACKEND.md](docs/BACKEND.md) — Documentação da API de autenticação
- [NextAuth.js](https://next-auth.js.org/) — Documentação oficial
