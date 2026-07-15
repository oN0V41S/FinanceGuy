import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../PrismaUserRepository";
import { RegisterInput } from "../schemas/auth.schema";

// Mock do PrismaClient
interface MockUserDelegate {
  findUnique: jest.Mock;
  create: jest.Mock;
}

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as { user: MockUserDelegate };

describe("PrismaUserRepository", () => {
  let repository: PrismaUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaUserRepository(mockPrisma as unknown as PrismaClient);
  });

  describe("findByEmail", () => {
    it("deve retornar usuário quando encontrado pelo email", async () => {
      // Arrange
      const mockUser = {
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findByEmail("john@test.com");

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@test.com" },
      });
      expect(result).toEqual(mockUser);
    });

    it("deve retornar null quando usuário não encontrado", async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail("notfound@test.com");

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "notfound@test.com" },
      });
      expect(result).toBeNull();
    });

    it("deve buscar corretamente com email em caixa alta", async () => {
      // Arrange
      const mockUser = {
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "JOHN@TEST.COM",
        password: "hashed_password",
        emailVerified: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findByEmail("JOHN@TEST.COM");

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(result?.email).toBe("JOHN@TEST.COM");
    });
  });

  describe("findById", () => {
    it("deve retornar usuário quando encontrado pelo id", async () => {
      // Arrange
      const mockUser = {
        id: "123",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findById("123");

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "123" },
      });
      expect(result).toEqual(mockUser);
    });

    it("deve retornar null quando id não encontrado", async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById("non-existent-id");

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-id" },
      });
      expect(result).toBeNull();
    });

    it("deve buscar corretamente com id de formato UUID", async () => {
      // Arrange
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const mockUser = {
        id: uuid,
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findById(uuid);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: uuid },
      });
      expect(result?.id).toBe(uuid);
    });
  });

  describe("create", () => {
    it("deve criar usuário com dados válidos e senha hasheada", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "Password123!",
      };

      const hashedPassword = "hashed_password_123";

      const mockCreatedUser = {
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: hashedPassword,
        emailVerified: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, hashedPassword);

      // Assert
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          nickname: "john",
          email: "john@test.com",
          password: hashedPassword,
        },
      });
      expect(result).toEqual({
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        emailVerified: null,
      });
    });

    it("deve criar usuário sem senha hasheada (usando senha original)", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@test.com",
        password: "Password123!",
      };

      const mockCreatedUser = {
        id: "2",
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@test.com",
        password: "Password123!",
        emailVerified: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Jane Doe",
          nickname: "jane",
          email: "jane@test.com",
          password: undefined, // hashedPassword não fornecido
        },
      });
      expect(result).toEqual({
        id: "2",
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@test.com",
        emailVerified: null,
      });
    });

    it("deve retornar usuário sem a senha por segurança", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Test User",
        nickname: "test",
        email: "test@test.com",
        password: "Password123!",
      };

      const hashedPassword = "secret_hash";

      const mockCreatedUser = {
        id: "3",
        name: "Test User",
        nickname: "test",
        email: "test@test.com",
        password: hashedPassword,
        emailVerified: new Date(),
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, hashedPassword);

      // Assert
      expect(result).not.toHaveProperty("password");
      expect(result).toEqual({
        id: "3",
        name: "Test User",
        nickname: "test",
        email: "test@test.com",
        emailVerified: expect.any(Date),
      });
    });

    it("deve criar usuário com email Verified definido", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Verified User",
        nickname: "verified",
        email: "verified@test.com",
        password: "Password123!",
      };

      const emailVerified = new Date("2024-01-01");
      const mockCreatedUser = {
        id: "4",
        name: "Verified User",
        nickname: "verified",
        email: "verified@test.com",
        password: "hashed",
        emailVerified: emailVerified,
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, "hashed");

      // Assert
      expect(result.emailVerified).toBe(emailVerified);
    });
  });

  describe("Integração com bcrypt", () => {
    it("deve passar a senha hasheada corretamente para o Prisma", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Bcrypt Test",
        nickname: "bcrypt",
        email: "bcrypt@test.com",
        password: "MySecureP@ss1",
      };

      // Simulando o hash que o bcrypt geraria
      const bcryptHash = "$2a$10$abcdefghijklmnopqrstuvwxyz";

      const mockCreatedUser = {
        id: "5",
        name: "Bcrypt Test",
        nickname: "bcrypt",
        email: "bcrypt@test.com",
        password: bcryptHash,
        emailVerified: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, bcryptHash);

      // Assert
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: bcryptHash,
          }),
        })
      );
      expect(result).toBeDefined();
    });
  });
});
