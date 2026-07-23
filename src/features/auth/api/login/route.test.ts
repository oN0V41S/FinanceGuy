/**
 * @jest-environment node
 */
import { POST } from "./route";
import { NextRequest } from "next/server";
import { authService } from "@/core/container";

// Mock the container to isolate the test from the actual service implementation
jest.mock("@/core/container", () => ({
  authService: {
    login: jest.fn(),
  },
}));

describe("POST /api/auth/login", () => {
  const loginUrl = "http://localhost/api/auth/login";
  const mockedAuthService = authService as jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 200, os dados do usuário e o cookie de autenticação em caso de sucesso", async () => {
    // Arrange
    const mockUser = { id: "1", name: "Test User", email: "test@test.com", nickname: "tester" };
    const mockToken = "mock-jwt-token";
    mockedAuthService.login.mockResolvedValue({ ...mockUser, token: mockToken });

    const req = new NextRequest(loginUrl, {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "password123" }),
    });

    // Act
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.user).toEqual(mockUser);
    expect(response.cookies.get("auth_token")?.value).toBe(mockToken);
    expect(response.cookies.get("auth_token")?.httpOnly).toBe(true);
    expect(mockedAuthService.login).toHaveBeenCalledTimes(1);
  });

  it("deve retornar 401 para falha na autenticação", async () => {
    // Arrange
    mockedAuthService.login.mockRejectedValue(new Error("Credenciais inválidas."));

    const req = new NextRequest(loginUrl, {
      method: "POST",
      body: JSON.stringify({ email: "wrong@test.com", password: "123" }),
    });

    // Act
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe("Credenciais inválidas.");
  });
});