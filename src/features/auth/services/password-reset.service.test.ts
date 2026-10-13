/**
 * @jest-environment node
 *
 * TDD — FASE RED (Issue #9 — Fluxo "Esqueci minha Senha")
 *
 * Contrato testado (src/features/auth/services/password-reset.service.ts — ainda NÃO implementado):
 * 1. `generateResetToken(email: string)` cria um token de uso único no VerificationToken
 *    com identifier prefixado como "reset:<email>" e expires em curta duração.
 * 2. `validateResetToken(token: string)` verifica se o token existe, não expirou e não foi usado.
 * 3. `consumeResetToken(token: string, newPassword: string)` atualiza a senha com hash,
 *    invalida o token após uso e retorna o usuário atualizado.
 * 4. Tokens expirados ou inválidos lançam exceções tratáveis.
 * 5. Nenhum dado sensível (token, link) é logado.
 *
 * Esperado nesta fase: falha de módulo (implementação ainda não existe).
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

jest.mock("bcryptjs");

const validToken = "valid-reset-token-abc123";
const testEmail = "user@example.com";
const validExpires = new Date(Date.now() + 3600000);
const pastExpires = new Date(Date.now() - 3600000);

// Mock do PrismaClient inline
const mockVerificationToken = {
  findUnique: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
};

const mockUser = {
  update: jest.fn(),
  findUnique: jest.fn(),
};

const mockPrisma = {
  verificationToken: mockVerificationToken,
  user: mockUser,
} as unknown as PrismaClient;

describe("src/features/auth/services/password-reset.service — Reset de Senha", () => {
  let PasswordResetService: any;
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await jest.isolateModulesAsync(() =>
      import("./password-reset.service")
    );
    PasswordResetService = mod.PasswordResetService;
    service = new PasswordResetService(mockPrisma);
  });

  describe("generateResetToken", () => {
    it("deve criar um token de reset com identifier prefixado como 'reset:<email>'", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      const result = await service.generateResetToken(testEmail);

      // Assert
      expect(mockVerificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: `reset:${testEmail}`,
          token: expect.any(String),
          expires: expect.any(Date),
        },
      });
      expect(result.token).toBe(validToken);
      expect(result.identifier).toBe(`reset:${testEmail}`);
    });

    it("deve retornar token com expiracao curta (1 hora)", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      await service.generateResetToken(testEmail);

      // Assert
      const createCall = mockVerificationToken.create.mock.calls[0][0];
      const expires = createCall.data.expires;
      const diffMs = expires.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(0);
      expect(diffMs).toBeLessThan(3600000 + 60000);
    });

    it("nao deve logar o token ou o link de reset", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      await service.generateResetToken(testEmail);

      // Assert
      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain(validToken);
      expect(allLogs).not.toContain("reset:");
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe("validateResetToken", () => {
    it("deve validar um token de reset existente e nao expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      const result = await service.validateResetToken(validToken);

      // Assert
      expect(mockVerificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(result).toEqual({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
    });

    it("deve lancar erro quando o token nao existe", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateResetToken("nonexistent-token")).rejects.toThrow(
        /token.*invalido|n.*encontrado/i
      );
    });

    it("deve lancar erro quando o token esta expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: "expired-token",
        expires: pastExpires,
      });

      // Act & Assert
      await expect(service.validateResetToken("expired-token")).rejects.toThrow(
        /expirado|invalido/i
      );
    });

    it("deve lancar erro quando o token nao pertence ao formato de reset", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act & Assert
      await expect(service.validateResetToken(validToken)).rejects.toThrow(
        /invalido|tipo/i
      );
    });
  });

  describe("consumeResetToken", () => {
    it("deve atualizar a senha com hash e invalidar o token apos uso", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({ id: "user-id-1", email: testEmail });
      mockUser.update.mockResolvedValue({
        id: "user-id-1",
        email: testEmail,
        password: "hashed_new_password",
        emailVerified: null,
      });
      mockVerificationToken.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.consumeResetToken(validToken, "NewPassword1!");

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: "user-id-1" },
        data: { password: "hashed_new_password" },
      });
      expect(mockVerificationToken.delete).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("deve lancar erro ao consumir um token ja utilizado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.consumeResetToken("used-token", "NewPassword1!")).rejects.toThrow(
        /invalido|utilizado|n.*encontrado/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it("deve lancar erro ao consumir um token expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: "expired-token",
        expires: pastExpires,
      });

      // Act & Assert
      await expect(service.consumeResetToken("expired-token", "NewPassword1!")).rejects.toThrow(
        /expirado|invalido/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
      expect(mockVerificationToken.delete).not.toHaveBeenCalled();
    });

    it("deve invalidar o token apos consumo bem-sucedido", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({ id: "user-id-1", email: testEmail });
      mockUser.update.mockResolvedValue({
        id: "user-id-1",
        email: testEmail,
        password: "hashed_new_password",
        emailVerified: null,
      });
      mockVerificationToken.delete.mockResolvedValue(undefined);

      // Act
      await service.consumeResetToken(validToken, "NewPassword1!");

      // Assert
      expect(mockVerificationToken.delete).toHaveBeenCalled();
    });
  });

  describe("Tratamento de erros", () => {
    it("deve lançar excecao tratavel para erros de banco", async () => {
      // Arrange
      mockVerificationToken.create.mockRejectedValue(new Error("DB connection failed"));

      // Act & Assert
      await expect(service.generateResetToken(testEmail)).rejects.toThrow(
        /falha ao gerar|erro|db/i
      );
    });

    it("nunca deve logar o token de reset ou dados sensíveis", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      await service.validateResetToken(validToken);

      // Assert
      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain(validToken);
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("deve lançar erro genérico quando findUnique lança erro inesperado", async () => {
      mockVerificationToken.findUnique.mockRejectedValue(new Error("Unexpected DB error"));

      await expect(service.validateResetToken("some-token")).rejects.toThrow(
        /Token inválido|Erro ao consumir token/i
      );
    });
  });

  describe("consumeResetToken — casos adicionais", () => {
    it("deve chamar bcrypt.hash ao consumir token", async () => {
      const mockHash = bcrypt.hash as jest.Mock;
      mockHash.mockResolvedValue("hashed_password");

      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({ id: "user-id-1", email: testEmail });
      mockUser.update.mockResolvedValue({ id: "user-id-1", email: testEmail });
      mockVerificationToken.delete.mockResolvedValue(undefined);

      await service.consumeResetToken(validToken, "NewPassword1!");

      expect(mockHash).toHaveBeenCalledWith("NewPassword1!", 10);
    });

    it("deve lançar erro quando usuario nao é encontrado", async () => {
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue(null);

      await expect(service.consumeResetToken(validToken, "NewPassword1!")).rejects.toThrow(
        /não encontrado/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando usuario.findUnique lança erro inesperado", async () => {
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockRejectedValue(new Error("DB error"));

      await expect(service.consumeResetToken(validToken, "NewPassword1!")).rejects.toThrow(
        /Erro ao consumir token/i
      );
    });

    it("deve lançar erro genérico quando consume lança erro inesperado", async () => {
      mockVerificationToken.findUnique.mockRejectedValue(new Error("Unexpected"));

      await expect(service.consumeResetToken("bad-token", "NewPassword1!")).rejects.toThrow(
        /Erro ao consumir token/i
      );
    });
  });
});
