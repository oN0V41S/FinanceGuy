/**
 * Login por e-mail (magic link) e recuperação de senha dependem de envio de
 * e-mail via Resend, que exige um domínio verificado. Enquanto não houver um
 * domínio próprio configurado, essas funcionalidades ficam ocultas na UI.
 * Reative definindo NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true no ambiente.
 */
export const EMAIL_AUTH_ENABLED = process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED === "true";
