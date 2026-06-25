/**
 * @jest-environment node
 */
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { authService } from "@/core/container";

// Mock the container to isolate the test
jest.mock("@/core/container", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
  },
}));

describe("Authentication Flow (E2E simulation)", () => {
  const registerUrl = "http://localhost/api/auth/register";
  const loginUrl = "http://localhost/api/auth/login";
  const mockedAuthService = authService as jest.Mocked<typeof authService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve realizar o fluxo completo de registro e login com sucesso", async () => {
    // Dados de teste
    const userData = {
      name: "João Silva",
      nickname: "joaosilva",
      email: "joao@example.com",
      password: "password123"
    };

    const mockCreatedUser = { 
      id: "user_123", 
      name: "João Silva", 
      nickname: "joaosilva", 
      email: "joao@example.com" 
    };

    const mockToken = "mock-jwt-token";

    // 1. Setup mocks
    mockedAuthService.register.mockResolvedValue(mockCreatedUser);
    mockedAuthService.login.mockResolvedValue({ 
      ...mockCreatedUser, 
      token: mockToken 
    });

    // 2. Call register
    const registerReq = new NextRequest(registerUrl, {
      method: "POST",
      body: JSON.stringify(userData),
    });
    const registerRes = await registerPOST(registerReq);
    expect(registerRes.status).toBe(201);
    expect(mockedAuthService.register).toHaveBeenCalledTimes(1);

    // 3. Call login with same credentials
    const loginReq = new NextRequest(loginUrl, {
      method: "POST",
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      }),
    });
    const loginRes = await loginPOST(loginReq);
    
    // 4. Verify login results
    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    expect(body.user.email).toBe(userData.email);
    
    // Verify cookie
    const authCookie = loginRes.cookies.get("auth_token");
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBe(mockToken);
    expect(authCookie?.httpOnly).toBe(true);

    expect(mockedAuthService.login).toHaveBeenCalledTimes(1);
  });
});
