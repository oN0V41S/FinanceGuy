import { prisma } from "@/lib/prisma";
import { PostgresUserRepository } from "../postgresUser.repository";
import { RegisterInput } from "../schemas/auth.schema";

// Mock do prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("PostgresUserRepository", () => {
  let repository: PostgresUserRepository;
  let mockPrismaUser: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PostgresUserRepository();
    mockPrismaUser = prisma.user as unknown as { findUnique: jest.Mock; create: jest.Mock };
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findByEmail("john@test.com");

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: "john@test.com" },
      });
      expect(result).toEqual({
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: null,
      });
    });

    it("deve retornar null quando usuário não encontrado", async () => {
      // Arrange
      mockPrismaUser.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail("notfound@test.com");

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: "notfound@test.com" },
      });
      expect(result).toBeNull();
    });

    it("deve preservar emailVerified quando retornar usuário", async () => {
      // Arrange
      const emailVerified = new Date("2024-01-01");
      const mockUser = {
        id: "1",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: emailVerified,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findByEmail("john@test.com");

      // Assert
      expect(result?.emailVerified).toEqual(emailVerified);
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findById("123");

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: "123" },
      });
      expect(result).toEqual({
        id: "123",
        name: "John Doe",
        nickname: "john",
        email: "john@test.com",
        password: "hashed_password",
        emailVerified: null,
      });
    });

    it("deve retornar null quando id não encontrado", async () => {
      // Arrange
      mockPrismaUser.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById("non-existent-id");

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await repository.findById(uuid);

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
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
        confirmPassword: "Password123!",
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

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, hashedPassword);

      // Assert
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
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

    it("deve criar usuário usando senha original quando hash não fornecido", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      const mockCreatedUser = {
        id: "2",
        name: "Jane Doe",
        nickname: "jane",
        email: "jane@test.com",
        password: "Password123!",
        emailVerified: null,
      };

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          name: "Jane Doe",
          nickname: "jane",
          email: "jane@test.com",
          password: "Password123!", // Usa a senha original
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

    it("deve criar usuário com emailVerified definido", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "Verified User",
        nickname: "verified",
        email: "verified@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
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

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, "hashed");

      // Assert
      expect(result.emailVerified).toEqual(emailVerified);
    });

    it("deve criar usuário com name null se não fornecido", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "",
        nickname: "nick",
        email: "nick@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      const mockCreatedUser = {
        id: "5",
        name: "",
        nickname: "nick",
        email: "nick@test.com",
        password: "hashed",
        emailVerified: null,
      };

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, "hashed");

      // Assert
      expect(mockPrismaUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "",
          }),
        })
      );
      expect(result).toBeDefined();
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
        confirmPassword: "MySecureP@ss1",
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

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData, bcryptHash);

      // Assert
      expect(mockPrismaUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: bcryptHash,
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("deve usar a senha original quando hashedPassword for undefined", async () => {
      // Arrange
      const userData: RegisterInput = {
        name: "No Hash Test",
        nickname: "nohash",
        email: "nohash@test.com",
        password: "OriginalPass123!",
        confirmPassword: "OriginalPass123!",
      };

      const mockCreatedUser = {
        id: "6",
        name: "No Hash Test",
        nickname: "nohash",
        email: "nohash@test.com",
        password: "OriginalPass123!",
        emailVerified: null,
      };

      mockPrismaUser.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(mockPrismaUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: "OriginalPass123!",
          }),
        })
      );
      expect(result).toBeDefined();
    });
  });
});
