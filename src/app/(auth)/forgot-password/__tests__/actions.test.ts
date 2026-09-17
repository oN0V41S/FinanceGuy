/**
 * @jest-environment node
 */
import { forgotPasswordAction } from "../actions";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/features/auth/services/password-reset.service";
import { sendEmail } from "@/lib/email/resend-client";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/features/auth/services/password-reset.service", () => {
  return {
    PasswordResetService: jest.fn().mockImplementation(() => ({
      generateResetToken: jest.fn(),
    })),
  };
});

jest.mock("@/lib/email/resend-client", () => ({
  sendEmail: jest.fn(),
}));

describe("forgotPasswordAction", () => {
  const mockGenerateResetToken = jest.fn();
  const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockService = {
      generateResetToken: mockGenerateResetToken,
    };
    (PasswordResetService as jest.Mock).mockReturnValue(mockService);
    (prisma as any).verificationToken.create = jest.fn();
    (prisma as any).user.findUnique = jest.fn();
  });

  describe("Validação de entrada", () => {
    it("deve retornar erro quando email é inválido", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ error: "Email inválido" });
    });

    it("deve retornar erro quando email está vazio", async () => {
      const formData = new FormData();
      formData.append("email", "");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ error: "Email inválido" });
    });
  });

  describe("Processamento", () => {
    it("deve retornar sucesso quando email é válido e token é gerado", async () => {
      mockGenerateResetToken.mockResolvedValue({ token: "test-token" });
      mockSendEmail.mockResolvedValue({ id: "msg_123", url: "https://resend.com" });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ success: true });
    });

    it("deve chamar generateResetToken com o email correto", async () => {
      mockGenerateResetToken.mockResolvedValue({ token: "test-token" });
      mockSendEmail.mockResolvedValue({ id: "msg_123", url: "https://resend.com" });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      await forgotPasswordAction(formData);
      expect(mockGenerateResetToken).toHaveBeenCalledWith("test@example.com");
    });

    it("deve chamar sendEmail com os parâmetros corretos", async () => {
      mockGenerateResetToken.mockResolvedValue({ token: "test-token" });
      mockSendEmail.mockResolvedValue({ id: "msg_123", url: "https://resend.com" });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      await forgotPasswordAction(formData);
      expect(mockSendEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Redefinir sua senha - FinanceGuy",
        expect.any(String)
      );
    });
  });

  describe("Tratamento de erros", () => {
    it("deve retornar erro quando generateResetToken falha", async () => {
      mockGenerateResetToken.mockRejectedValue(new Error("DB error"));

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ error: "Não foi possível enviar o link de reset" });
    });

    it("deve retornar erro quando sendEmail falha", async () => {
      mockGenerateResetToken.mockResolvedValue({ token: "test-token" });
      mockSendEmail.mockRejectedValue(new Error("Network failure"));

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ error: "Não foi possível enviar o link de reset" });
    });

    it("deve retornar erro para erros inesperados", async () => {
      mockGenerateResetToken.mockRejectedValue(new Error("Unexpected error"));

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const result = await forgotPasswordAction(formData);
      expect(result).toEqual({ error: "Não foi possível enviar o link de reset" });
    });
  });
});
