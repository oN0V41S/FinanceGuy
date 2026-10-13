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
RESEND_API_KEY=chave_api_resend
EMAIL_FROM=remetente@exemplo.com
```

- `RESEND_API_KEY`: credencial para o serviço de envio de e-mails Resend (usado pelo provider magic link e pelos fluxos de recuperação de senha e verificação de e-mail).
- `EMAIL_FROM`: e-mail remetente padrão para todos os e-mails transacionais enviados pelo sistema.

---

## Configuração de Sessão

Para o Credentials Provider, use estratégia JWT:

```typescript
session: { strategy: "jwt" }
```

---

## Providers de Autenticação

O sistema utiliza dois providers no NextAuth v5 (`src/auth.ts`):

### 1. Credentials Provider
Autenticação tradicional por e-mail e senha via `signIn("credentials", { email, password })`.

### 2. Resend Provider (Magic Link)
Autenticação por e-mail sem senha usando o provider `Resend` do NextAuth v5:

```typescript
Resend({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
}),
```

Uso no client-side (ex.: `src/features/auth/components/MagicLinkLogin.tsx`):

```typescript
await signIn("resend", { email: data.email, redirect: false });
```

O fluxo é:
1. Usuário informa o e-mail no formulário de Magic Link.
2. `signIn("resend")` dispara o envio de um e-mail com link mágico via Resend.
3. O link direciona para a página de login com o token de autenticação.
4. NextAuth valida o token e cria a sessão automaticamente.

---

## Fluxo de Recuperação de Senha

### Diagrama do fluxo

```
Usuário pede reset → generateResetToken(email) → Token criado (identifier: "reset:<email>", exp: 1h)
  → sendEmail() envia e-mail com link → Usuário clica no link
  → Página /auth/reset-password?token=<token> → validateResetToken(token)
  → Se válido: consumeResetToken(token, newPassword) → Senha atualizada no Prisma User
  → Token deletado do VerificationToken (uso único)
```

### Componentes envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(auth)/forgot-password/page.tsx` | Formulário de entrada de e-mail |
| `src/app/(auth)/forgot-password/actions.ts` | Server Action que gera token e envia e-mail |
| `src/app/(auth)/reset-password/page.tsx` | Formulário de nova senha (recebe token via URL) |
| `src/app/(auth)/reset-password/actions.ts` | Server Action que valida e consome o token |
| `src/features/auth/services/password-reset.service.ts` | Lógica de geração, validação e consumo do token |
| `src/lib/email/resend-client.ts` | Envio de e-mails via API Resend |

### Regras

- **Expiração**: Tokens de reset expiram em **1 hora** (3.600.000 ms) a partir da geração.
- **Uso único**: Após consumo, o token é **permanentemente deletado** do banco (tabela `VerificationToken`).
- **Política de senha**: A nova senha deve seguir a política definida em `passwordSchema` (mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo).
- **Mensagem genérica**: O fluxo de forgot-password **nunca revela se o e-mail existe** no sistema — retorna sempre mensagem genérica de sucesso ou erro genérico.

---

## Verificação de E-mail (Pós-Cadastro)

### Quando é disparada

Após o registro de um novo usuário, o sistema gera um token de verificação para confirmar o endereço de e-mail.

### Fluxo

```
Cadastro → generateVerificationToken(email) → Token criado (identifier: "verify:<email>", exp: 1h)
  → E-mail de verificação enviado → Usuário clica no link
  → consumeVerificationToken(token) → Marca emailVerified = NOW() no Prisma User
  → Token deletado do VerificationToken (uso único)
```

### Componentes envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/features/auth/services/email-verification.service.ts` | Geração, validação e consumo do token de verificação |
| `src/lib/email/resend-client.ts` | Envio do e-mail de verificação |

### Regras

- **Expiração**: Tokens de verificação expiram em **1 hora**.
- **Uso único**: Após consumo, o token é deletado.
- **Marcação**: Ao consumir o token, o campo `emailVerified` do usuário é atualizado com a data/hora atual (`new Date()`).
- **Prefixo**: O identificador no banco usa o prefixo `verify:<email>` para diferenciar de tokens de reset.

---

## Segurança

### Tokens

- Todos os tokens (reset e verificação) usam o modelo Prisma `VerificationToken` existente, com o campo `identifier` prefixado (`reset:<email>` ou `verify:<email>`) para diferenciar tipos.
- Tokens são de **uso único**: após serem consumidos ou expirados, não podem ser reutilizados.
- Todos os tokens possuem expiração de **1 hora**.

### Proteção contra Enumeração de E-mail

- O fluxo de recuperação de senha (`forgot-password`) sempre retorna **mensagens genéricas**, independentemente de o e-mail existir ou não no banco de dados. Isso impede que atacantes descubram quais e-mails estão registrados.

### Rate Limiting

- **Risco conhecido**: Atualmente **não há rate limiting** nos endpoints de forgot-password, reset-password ou magic link. Esse é um risco conhecido documentado na auditoria de segurança do projeto e deve ser tratado em uma fase futura.

### Referências

- [docs/security.md](docs/security.md) — Diretrizes gerais de segurança
- [docs/BACKEND.md](docs/BACKEND.md) — Endpoints e estratégia de segurança

---

## Referências

- [docs/security.md](docs/security.md) — Diretrizes de segurança do projeto
- [docs/BACKEND.md](docs/BACKEND.md) — Documentação da API de autenticação
- [NextAuth.js](https://next-auth.js.org/) — Documentação oficial
