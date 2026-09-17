import { test, expect } from "@playwright/test";

/**
 * E2E — FING-9 — Página de login.
 *
 * Login por e-mail (magic link) e recuperação de senha dependem de envio de
 * e-mail via Resend, que exige domínio verificado. Enquanto não houver um
 * domínio próprio, essas funcionalidades ficam ocultas via feature flag
 * (EMAIL_AUTH_ENABLED em src/features/auth/config.ts). Estes testes cobrem
 * o comportamento padrão (desativado).
 */

test.describe("Página de login — funcionalidades de e-mail desativadas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("não deve exibir o botão 'Fazer Login por E-mail'", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Fazer Login por E-mail/i })
    ).toHaveCount(0);
  });

  test("não deve exibir o link 'Esqueci minha senha'", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Esqueci minha senha/i })
    ).toHaveCount(0);
  });

  test("deve exibir apenas o formulário de login com senha", async ({ page }) => {
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Entrar na conta/i })
    ).toBeVisible();
  });
});
