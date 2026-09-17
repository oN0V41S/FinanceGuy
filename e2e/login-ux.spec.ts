import { test, expect } from "@playwright/test";

/**
 * E2E — FING-9 — Bugs de UX reportados em staging (fase RED):
 * 1. Botão "Fazer Login por E-mail" desestilizado (deve parecer um botão, não um link solto)
 * 2. Ao ativar o login por e-mail, o formulário de senha deve sumir (só o campo de e-mail + botão de envio)
 * 3. Falta o link "Esqueci minha senha" no formulário de login
 */

test.describe("Página de login — UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("botão 'Fazer Login por E-mail' deve ter estilo de botão, não de link solto", async ({
    page,
  }) => {
    const toggle = page.getByRole("button", { name: /Fazer Login por E-mail/i });
    await expect(toggle).toBeVisible();

    const box = await toggle.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    expect(box?.width ?? 0).toBeGreaterThan(200);

    const borderWidth = await toggle.evaluate(
      (el) => getComputedStyle(el).borderTopWidth
    );
    expect(parseFloat(borderWidth)).toBeGreaterThan(0);
  });

  test("ao clicar em 'Fazer Login por E-mail', o formulário de senha deve desaparecer", async ({
    page,
  }) => {
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Fazer Login por E-mail/i }).click();

    await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Enviar link de acesso/i })
    ).toBeVisible();
  });

  test("deve exibir o link 'Esqueci minha senha' apontando para /forgot-password", async ({
    page,
  }) => {
    const forgotLink = page.getByRole("link", { name: /Esqueci minha senha/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });
});
