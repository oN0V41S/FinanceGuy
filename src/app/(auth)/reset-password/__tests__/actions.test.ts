/**
 * @jest-environment node
 */
import { resetPasswordAction } from "../actions";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/features/auth/services/password-reset.service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/features/auth/services/password-reset.service", () => {
  return {
    PasswordResetService: jest.fn().mockImplementation(() => ({
      validateResetToken: jest.fn(),
      consumeResetToken: jest.fn(),
    })),
  };
});

describe("resetPasswordAction", () => {
  const mockValidateResetToken = jest.fn();
  const mockConsumeResetToken = jest.fn();
  const mockUserUpdate = jest.fn();
  const mockVerificationTokenFindUnique = jest.fn();
  const mockVerificationTokenDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const mockService = {
      validateResetToken: mockValidateResetToken,
      consumeResetToken: mockConsumeResetToken,
    };
    (PasswordResetService as jest.Mock).mockReturnValue(mockService);
    (prisma as any).verificationToken.findUnique = mockVerificationTokenFindUnique;
    (prisma as any).verificationToken.delete = mockVerificationTokenDelete;
    (prisma as any).user.update = mockUserUpdate;
    (prisma as any).user.findUnique = jest.fn();
  });

  describe("Validação de entrada", () => {
    it("deve retornar erro quando token está vazio", async () => {
      const formData = new FormData();
      formData.append("token", "");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Dados inválidos" });
    });

    it("deve retornar erro quando senha tem menos de 8 caracteres", async () => {
      const formData = new FormData();
      formData.append("token", "test-token");
      formData.append("password", "short");
      formData.append("confirmPassword", "short");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Dados inválidos" });
    });

    it("deve retornar erro quando senhas não coincidem", async () => {
      const formData = new FormData();
      formData.append("token", "test-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Different1!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "As senhas não coincidem" });
    });
  });

  describe("Processamento", () => {
    it("deve retornar sucesso quando token é válido e senha é atualizada", async () => {
      mockValidateResetToken.mockResolvedValue(undefined);
      mockConsumeResetToken.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.append("token", "valid-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ success: true });
    });

    it("deve chamar validateResetToken e consumeResetToken", async () => {
      mockValidateResetToken.mockResolvedValue(undefined);
      mockConsumeResetToken.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.append("token", "valid-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      await resetPasswordAction(formData);
      expect(mockValidateResetToken).toHaveBeenCalledWith("valid-token");
      expect(mockConsumeResetToken).toHaveBeenCalledWith("valid-token", "Password123!");
    });
  });

  describe("Tratamento de erros", () => {
    it("deve retornar erro quando token é inválido", async () => {
      mockValidateResetToken.mockRejectedValue(new Error("Token inválido ou expirado"));

      const formData = new FormData();
      formData.append("token", "invalid-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Token inválido ou expirado" });
    });

    it("deve retornar erro quando token está expirado", async () => {
      mockValidateResetToken.mockRejectedValue(new Error("Token expirado"));

      const formData = new FormData();
      formData.append("token", "expired-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Token expirado" });
    });

    it("deve retornar erro quando token já foi utilizado", async () => {
      mockValidateResetToken.mockRejectedValue(new Error("Token inválido ou já utilizado"));

      const formData = new FormData();
      formData.append("token", "used-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Token inválido ou já utilizado" });
    });

    it("deve retornar erro genérico para erros inesperados", async () => {
      mockValidateResetToken.mockRejectedValue(new Error("Unexpected database error"));

      const formData = new FormData();
      formData.append("token", "some-token");
      formData.append("password", "Password123!");
      formData.append("confirmPassword", "Password123!");

      const result = await resetPasswordAction(formData);
      expect(result).toEqual({ error: "Token inválido ou expirado" });
    });
  });
});
