"use server";

import { auth } from "@/auth";
import { authService } from "@/features/auth/auth.factory";
import { z } from "zod";

export async function updateNicknameAction(nickname: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Não autenticado." };

  const parsed = z.string().min(1).max(50).safeParse(nickname);
  if (!parsed.success) return { success: false, error: "Apelido inválido." };

  try {
    await authService.updateNickname(userId, parsed.data);
    return { success: true };
  } catch {
    return { success: false, error: "Falha ao atualizar o apelido." };
  }
}
