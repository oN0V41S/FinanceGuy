/**
 * @jest-environment node
 */
import { POST } from "./route";
import { NextRequest } from "next/server";
import { authService } from "@/core/container";

// Mock the container to isolate the test from the actual service implementation
jest.mock("@/core/container", () => ({
  authService: {
    register: jest.fn(),
  },
}));

describe("POST /api/auth/register", () => {
  const registerUrl = "http://localhost/api/auth/register";
  // Typecast the mocked service to use jest mock functions
  const mockedAuthService = authService as jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 201 e os dados do usuário quando o registro é bem-sucedido", async () => {
    // Arrange
    const mockCreatedUser = { 
      id: "user_123", 
      name: "João Silva", 
      nickname: "joaosilva", 
      email: "joao@example.com" 
    };
    mockedAuthService.register.mockResolvedValue(mockCreatedUser);

    const req = new NextRequest(registerUrl, {
      method: "POST",
      body: JSON.stringify({
        name: "João Silva",
        nickname: "joaosilva",
        email: "joao@example.com",
        password: "password123"
      }),
    });

    // Act
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body).toEqual(mockCreatedUser);
    expect(mockedAuthService.register).toHaveBeenCalledTimes(1);
        const expectedBody = {
      name: "João Silva",
      nickname: "joaosilva",
      email: "joao@example.com",
      password: "password123"
    };
    expect(mockedAuthService.register).toHaveBeenCalledWith(expectedBody);
  });

  it("deve retornar 400 quando o email já estiver em uso", async () => {
    // Arrange
    mockedAuthService.register.mockRejectedValue(
      new Error("Este email já está em uso.")
    );

    const req = new NextRequest(registerUrl, {
      method: "POST",
      body: JSON.stringify({
        email: "joao@existente.com",
        password: "password123"
      }),
    });

    // Act
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe("Este email já está em uso.");
  });

  it("deve retornar 400 em caso de erro de validação (Zod)", async () => {
    // Arrange
    mockedAuthService.register.mockRejectedValue({
      name: "ZodError",
      message: "Dados inválidos"
    });

    const req = new NextRequest(registerUrl, {
      method: "POST",
      body: JSON.stringify({ email: "email-invalido" }), // Payload inválido
    });

    // Act
    const response = await POST(req);
    const body = await response.json();
    
    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe("Validação falhou");
  });
});