jest.mock("bcryptjs");
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export class PasswordResetService {
  constructor(private readonly prisma: PrismaClient) {}

  async generateResetToken(email: string): Promise<{ token: string; identifier: string }> {
    try {
      const token = randomUUID();
      const expires = new Date(Date.now() + 3600000);

      const verificationToken = await this.prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token,
          expires,
        },
      });

      return { token: verificationToken.token, identifier: verificationToken.identifier };
    } catch (error) {
      throw new Error(`Falha ao gerar token de reset: ${(error as Error).message}`);
    }
  }

  async validateResetToken(token: string): Promise<{ identifier: string; token: string; expires: Date }> {
    try {
      const verificationToken = await this.prisma.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        throw new Error("Token inválido ou não encontrado");
      }

      if (verificationToken.expires < new Date()) {
        throw new Error("Token expirado");
      }

      if (!verificationToken.identifier.startsWith("reset:")) {
        throw new Error("Token de tipo inválido");
      }

      return verificationToken;
    } catch (error) {
      if (error instanceof Error && /expirado|tipo|invalido|não encontrado/i.test(error.message)) {
        throw error;
      }
      throw new Error("Token inválido");
    }
  }

  async consumeResetToken(token: string, newPassword: string): Promise<{ identifier: string; token: string; expires: Date }> {
    try {
      const verificationToken = await this.prisma.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        throw new Error("Token inválido ou já utilizado");
      }

      if (verificationToken.expires < new Date()) {
        throw new Error("Token expirado");
      }

      if (!verificationToken.identifier.startsWith("reset:")) {
        throw new Error("Token de tipo inválido");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const email = verificationToken.identifier.replace("reset:", "");

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      const userId = user.id;

      await this.prisma.user.update({
        where: { id: userId as string },
        data: { password: hashedPassword },
      });

      await this.prisma.verificationToken.delete({
        where: { token },
      });

      return verificationToken;
    } catch (error) {
      if (error instanceof Error && /expirado|invalido|utilizado|falha ao/i.test(error.message)) {
        throw error;
      }
      throw new Error(`Erro ao consumir token de reset: ${(error as Error).message}`);
    }
  }
}
