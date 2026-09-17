"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/features/auth/services/password-reset.service";
import { sendEmail } from "@/lib/email/resend-client";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export async function forgotPasswordAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = ForgotPasswordSchema.safeParse({ email: raw.email });

  if (!parsed.success) {
    return { error: "Email inválido" };
  }

  const { email } = parsed.data;
  const service = new PasswordResetService(prisma);

  try {
    const { token } = await service.generateResetToken(email);
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
    await sendEmail(
      email,
      "Redefinir sua senha - FinanceGuy",
      `<p>Para redefinir sua senha, clique no link abaixo:</p><a href="${resetUrl}">${resetUrl}</a>`
    );
    return { success: true };
  } catch {
    return { error: "Não foi possível enviar o link de reset" };
  }
}
