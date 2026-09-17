/**
 * @jest-environment node
 *
 * TDD — FASE RED (Issue #9 — Verificacao de E-mail apos Cadastro)
 *
 * Contrato testado (src/features/auth/services/email-verification.service.ts — ainda NÃO implementado):
 * 1. `generateVerificationToken(email: string)` cria um token no VerificationToken
 *    com identifier prefixado como "verify:<email>".
 * 2. `validateVerificationToken(token: string)` verifica se o token existe,
 *    não expirou e pertence ao formato de verificação.
 * 3. `consumeVerificationToken(token: string)` marca o emailVerified do usuário
 *    e invalida o token após uso.
 * 4. Tokens expirados ou inválidos lançam exceções tratáveis.
 * 5. Nenhum dado sensível (token, link) é logado.
 *
 * Esperado nesta fase: falha de módulo (implementação ainda não existe).
 */

import { PrismaClient } from "@prisma/client";

const validToken = "valid-verify-token-abc123";
const testEmail = "newuser@example.com";
const validExpires = new Date(Date.now() + 3600000);
const pastExpires = new Date(Date.now() - 3600000);

const mockVerificationToken = {
  findUnique: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

const mockUser = {
  update: jest.fn(),
  findUnique: jest.fn(),
};

const mockPrisma = {
  verificationToken: mockVerificationToken,
  user: mockUser,
} as unknown as PrismaClient;

describe("src/features/auth/services/email-verification.service — Verificacao de E-mail", () => {
  let EmailVerificationService: any;
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await jest.isolateModulesAsync(() =>
      import("./email-verification.service")
    );
    EmailVerificationService = mod.EmailVerificationService;
    service = new EmailVerificationService(mockPrisma);
  });

  describe("generateVerificationToken", () => {
    it("deve criar um token de verificacao com identifier prefixado como 'verify:<email>'", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      const result = await service.generateVerificationToken(testEmail);

      // Assert
      expect(mockVerificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: `verify:${testEmail}`,
          token: expect.any(String),
          expires: expect.any(Date),
        },
      });
      expect(result.token).toBe(validToken);
      expect(result.identifier).toBe(`verify:${testEmail}`);
    });

    it("deve retornar token com expiracao", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      const result = await service.generateVerificationToken(testEmail);

      // Assert
      expect(result.expires).toBeInstanceOf(Date);
      expect(result.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it("nao deve logar o token de verificacao", async () => {
      // Arrange
      mockVerificationToken.create.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      await service.generateVerificationToken(testEmail);

      // Assert
      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain(validToken);
      expect(allLogs).not.toContain("verify:");
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe("validateVerificationToken", () => {
    it("deve validar um token de verificacao existente e nao expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act
      const result = await service.validateVerificationToken(validToken);

      // Assert
      expect(mockVerificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(result.identifier).toBe(`verify:${testEmail}`);
    });

    it("deve lancar erro quando o token nao existe", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateVerificationToken("nonexistent-token")).rejects.toThrow(
        /token.*invalido|n.*encontrado/i
      );
    });

    it("deve lancar erro quando o token esta expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: pastExpires,
      });

      // Act & Assert
      await expect(service.validateVerificationToken(validToken)).rejects.toThrow(
        /expirado|invalido/i
      );
    });

    it("deve lancar erro quando o token nao pertence ao formato de verificacao", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `reset:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });

      // Act & Assert
      await expect(service.validateVerificationToken(validToken)).rejects.toThrow(
        /invalido|tipo/i
      );
    });
  });

  describe("consumeVerificationToken", () => {
    it("deve marcar emailVerified do usuario e invalidar o token apos uso", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({
        id: "user-id-1",
        email: testEmail,
        emailVerified: null,
      });
      mockUser.update.mockResolvedValue({
        id: "user-id-1",
        email: testEmail,
        emailVerified: new Date(),
      });
      mockVerificationToken.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.consumeVerificationToken(validToken);

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: "user-id-1" },
        data: { emailVerified: expect.any(Date) },
      });
      expect(mockVerificationToken.delete).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.emailVerified).toBeInstanceOf(Date);
    });

    it("deve lancar erro ao consumir um token ja utilizado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.consumeVerificationToken(validToken)).rejects.toThrow(
        /invalido|utilizado|n.*encontrado/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it("deve lançar erro ao consumir um token expirado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: pastExpires,
      });

      // Act & Assert
      await expect(service.consumeVerificationToken(validToken)).rejects.toThrow(
        /expirado|invalido/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
      expect(mockVerificationToken.delete).not.toHaveBeenCalled();
    });
  });

  describe("Tratamento de erros", () => {
    it("deve lançar excecao tratavel para erros de banco", async () => {
      // Arrange
      mockVerificationToken.create.mockRejectedValue(new Error("DB connection failed"));

      // Act & Assert
      await expect(service.generateVerificationToken(testEmail)).rejects.toThrow(
        /falha ao gerar|erro|db/i
      );
    });

    it("nunca deve logar o token de verificacao ou dados sensíveis", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      await service.validateVerificationToken(validToken);

      // Assert
      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain(validToken);
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("deve lançar erro genérico quando findUnique lança erro inesperado", async () => {
      mockVerificationToken.findUnique.mockRejectedValue(new Error("Unexpected DB error"));

      await expect(service.validateVerificationToken("some-token")).rejects.toThrow(
        /Token inválido/i
      );
    });
  });

  describe("consumeVerificationToken — casos adicionais", () => {
    it("deve lançar erro quando usuario nao é encontrado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.consumeVerificationToken(validToken)).rejects.toThrow(
        /Usuário não encontrado/i
      );
      expect(mockUser.update).not.toHaveBeenCalled();
      expect(mockVerificationToken.delete).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando usuario.update falha", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({ id: "user-id-1", email: testEmail, emailVerified: null });
      mockUser.update.mockRejectedValue(new Error("DB update failed"));

      // Act & Assert
      await expect(service.consumeVerificationToken(validToken)).rejects.toThrow(
        /Erro ao consumir token|DB update/i
      );
      expect(mockVerificationToken.delete).not.toHaveBeenCalled();
    });

    it("deve deletar token apos consumo bem-sucedido com usuario encontrado", async () => {
      // Arrange
      mockVerificationToken.findUnique.mockResolvedValue({
        identifier: `verify:${testEmail}`,
        token: validToken,
        expires: validExpires,
      });
      mockUser.findUnique.mockResolvedValue({ id: "user-id-1", email: testEmail, emailVerified: null });
      mockUser.update.mockResolvedValue({ id: "user-id-1", email: testEmail, emailVerified: new Date() });
      mockVerificationToken.delete.mockResolvedValue(undefined);

      // Act
      await service.consumeVerificationToken(validToken);

      // Assert
      expect(mockVerificationToken.delete).toHaveBeenCalled();
    });

    it("deve lançar erro genérico quando consume lança erro inesperado", async () => {
      mockVerificationToken.findUnique.mockRejectedValue(new Error("Unexpected"));

      await expect(service.consumeVerificationToken("bad-token")).rejects.toThrow(
        /Erro ao consumir token/i
      );
    });
  });
});
