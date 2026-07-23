import { AuthService } from '../auth.service';
import { IUserRepository } from '../IUser.repository';

// Mock the jose library to prevent ESM parsing issues in Jest
jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-token"),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    // Mock completo do repositório de usuário
    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;
    service = new AuthService(mockUserRepo);
  });

  it('deve lançar erro se o email já existir no registro', async () => {
    // Arrange: Simula que o usuário já existe no banco
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1', name: 'Existing User', email: 'test@test.com', nickname: 'test' });
    
    const userData = {
      name: 'Test User',
      nickname: 'test',
      email: 'test@test.com',
      password: 'secret',
      confirmPassword: 'secret',
    };

    // Act & Assert: Espera que o método 'register' rejeite com a mensagem de erro correta
    await expect(service.register(userData)).rejects.toThrow("Este email já está em uso.");
  });

  it('deve criar um novo usuário se o email não existir', async () => {
    // Arrange: Simula que o email está disponível
    mockUserRepo.findByEmail.mockResolvedValue(null); 
    // Simula o usuário retornado pelo método create
    mockUserRepo.create.mockResolvedValue({ id: '2', name: 'New User', email: 'new@test.com', nickname: 'new' });

    const userData = {
      name: 'New User',
      nickname: 'new',
      email: 'new@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    // Act: Chama o método de registro
    const result = await service.register(userData);

    // Assert: Verifica se os métodos corretos foram chamados e o resultado está correto
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('new@test.com');
    expect(mockUserRepo.create).toHaveBeenCalled();
    expect(result!.email).toBe('new@test.com');
    expect(result!.id).toBe('2');
  });
});