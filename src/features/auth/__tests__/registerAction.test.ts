import { registerAction } from "../actions/registerAction";
import { RegisterInput } from "../schemas/auth.schema";

// Mock do authService do factory
jest.mock("@/features/auth/auth.factory", () => ({
  authService: {
    register: jest.fn(),
  },
}));

import { authService } from "../auth.factory";

describe("registerAction", () => {
  let mockAuthService: jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = authService as jest.Mocked<typeof authService>;
  });

  describe("Validação de dados", () => {
    it("deve retornar erro para nome muito curto", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "A",
        nickname: "nick",
        email: "test@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para nickname muito curto", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "a",
        email: "test@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para email inválido", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "not-an-email",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para senha sem maiúscula", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "password123!", // Sem maiúscula
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para senha sem minúscula", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "PASSWORD123!", // Sem minúscula
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para senha sem número", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Password!!!", // Sem número
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para senha sem caractere especial", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Password123", // Sem caractere especial
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para senha com menos de 8 caracteres", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Pass1!", // Apenas 6 caracteres
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para objeto vazio", async () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("deve retornar erro para dados ausentes", async () => {
      // Arrange
      const invalidData: Partial<RegisterInput> = {
        name: "John Doe",
        // nickname, email, password ausentes
      };

      // Act
      const result = await registerAction(invalidData as RegisterInput);

      // Assert
      expect(result).toEqual({ error: "Dados inválidos!" });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe("Fluxo de registro bem-sucedido", () => {
    it("deve criar um novo usuário com dados válidos", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "new@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockResolvedValue({
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "new@test.com",
      });

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(validData);
      expect(result).toEqual({
        success: "Conta criada com sucesso! Você já pode fazer login.",
      });
    });

    it("deve criar usuário com dados válidos passando todas as validações", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@example.com",
        password: "SecurePass1@",
        confirmPassword: "SecurePass1@",
      };

      mockAuthService.register.mockResolvedValue({
        id: "2",
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@example.com",
      });

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty("success");
    });
  });

  describe("Tratamento de erros", () => {
    it("deve retornar erro quando o email já está em uso", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "existing@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockRejectedValue(
        new Error("Este email já está em uso.")
      );

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(validData);
      expect(result).toEqual({ error: "Este email já está em uso." });
    });

    it("deve retornar mensagem genérica para erros desconhecidos", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(result).toEqual({ error: "Database connection failed" });
    });

    it("deve retornar mensagem genérica para erros sem mensagem", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      // Create an Error with an empty message
      const errorWithEmptyMessage = new Error("");
      mockAuthService.register.mockRejectedValue(errorWithEmptyMessage);

      // Act
      const result = await registerAction(validData);

      // Assert - empty string is returned as the message
      expect(result).toEqual({ error: "" });
    });

    it("deve tratar erros que não são instâncias de Error", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "test@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockRejectedValue("String error" as any);

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(result).toEqual({ error: "Algo deu errado!" });
    });
  });

  describe("Edge Cases", () => {
    it("deve funcionar com nome contendo acentos", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "João José da Silva",
        nickname: "joao",
        email: "joao@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockResolvedValue({
        id: "3",
        ...validData,
      });

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(result).toHaveProperty("success");
    });

    it("deve funcionar com email de domínio brasileiro", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "Maria Santos",
        nickname: "maria",
        email: "maria@dominio.com.br",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockAuthService.register.mockResolvedValue({
        id: "4",
        ...validData,
      });

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(result).toHaveProperty("success");
    });

    it("deve aceitar senha com diferentes caracteres especiais", async () => {
      // Arrange
      const validData: RegisterInput = {
        name: "Test User",
        nickname: "test",
        email: "test@test.com",
        password: "Pass@word1", // @ como caractere especial (válido conforme regex)
        confirmPassword: "Pass@word1",
      };

      mockAuthService.register.mockResolvedValue({
        id: "5",
        ...validData,
      });

      // Act
      const result = await registerAction(validData);

      // Assert
      expect(result).toHaveProperty("success");
    });
  });
});
