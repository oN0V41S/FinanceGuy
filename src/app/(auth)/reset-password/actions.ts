"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/features/auth/services/password-reset.service";
import { passwordSchema } from "@/features/auth/schemas/auth.schema";

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido"),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme sua senha"),
});

export async function resetPasswordAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = ResetPasswordSchema.safeParse({
    token: raw.token,
    password: raw.password,
    confirmPassword: raw.confirmPassword,
  });

  if (!parsed.success) {
    return { error: "Dados inválidos" };
  }

  const { token, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem" };
  }

  const service = new PasswordResetService(prisma);

  try {
    await service.validateResetToken(token);
    await service.consumeResetToken(token, password);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao redefinir senha";
    if (/expirado|invalido|utilizado/i.test(msg)) {
      return { error: msg };
    }
    return { error: "Token inválido ou expirado" };
  }
}
