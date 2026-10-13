import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export class EmailVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async generateVerificationToken(email: string): Promise<{ token: string; identifier: string; expires: Date }> {
    try {
      const token = randomUUID();
      const expires = new Date(Date.now() + 3600000);

      const verificationToken = await this.prisma.verificationToken.create({
        data: {
          identifier: `verify:${email}`,
          token,
          expires,
        },
      });

      return { token: verificationToken.token, identifier: verificationToken.identifier, expires: verificationToken.expires };
    } catch (error) {
      throw new Error(`Falha ao gerar token de verificação: ${(error as Error).message}`);
    }
  }

  async validateVerificationToken(token: string): Promise<{ identifier: string; token: string; expires: Date }> {
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

      if (!verificationToken.identifier.startsWith("verify:")) {
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

  async consumeVerificationToken(token: string): Promise<{ identifier: string; token: string; expires: Date; emailVerified: Date }> {
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

      if (!verificationToken.identifier.startsWith("verify:")) {
        throw new Error("Token de tipo inválido");
      }

      const email = verificationToken.identifier.replace("verify:", "");

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      await this.prisma.verificationToken.delete({
        where: { token },
      });

      return { ...verificationToken, emailVerified: updatedUser.emailVerified! };
    } catch (error) {
      if (error instanceof Error && /expirado|invalido|utilizado|não encontrado|falha ao/i.test(error.message)) {
        throw error;
      }
      throw new Error(`Erro ao consumir token de verificação: ${(error as Error).message}`);
    }
  }
}
