import { RegisterInput, LoginInput } from "./schemas/auth.schema";
import { UserRecord, IUserRepository } from "./IUser.repository";
import bcrypt from "bcryptjs";

export class AuthService {
  // Injeção de dependência do repositório
  constructor(private readonly userRepository: IUserRepository) {}

  async register(data: RegisterInput): Promise<Omit<UserRecord, 'password'> | null> {
    // Validação já feita pela camada de schema
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Este email já está em uso.");
    }

    // Hash da senha usando bcryptjs
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Persistência via repositório
    // O método create do repositório pode precisar ser adaptado para aceitar `hashedPassword`
    return this.userRepository.create(data, hashedPassword);
  }

  async login(data: LoginInput): Promise<Omit<UserRecord, 'password'> & { token?: string }> {
    // Validação já feita pela camada de schema
    const user = await this.userRepository.findByEmail(data.email);

    // Retorno genérico para segurança (OWASP Top 10 - Injection/Authentication)
    if (!user || !user.password) {
      throw new Error("Credenciais inválidas.");
    }

    // Validação da senha com bcrypt
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error("Credenciais inválidas.");
    }

    // Se a senha for válida, retornamos o usuário (sem a senha) e um placeholder para o token.
    // A geração do token será feita pelo NextAuth.js.
    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword };
  }

  // Método auxiliar para buscar usuário (pode ser útil para o middleware)
  async getUserById(id: string): Promise<Omit<UserRecord, 'password'> | null> {
      const user = await this.userRepository.findById(id);
      if (!user) {
          return null;
      }
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
  }

  async updateNickname(id: string, nickname: string): Promise<Omit<UserRecord, 'password'>> {
    return this.userRepository.updateNickname(id, nickname);
  }
}

// Exportar uma instância configurada para ser usada
// Você precisará ter uma implementação concreta do IUserRepository (ex: PrismaUserRepository)
// Exemplo: export const authService = new AuthService(new PrismaUserRepository(prisma));
// Por enquanto, vamos deixar comentado até que o repositório concreto seja definido.

// Para este exemplo, vamos supor que você tenha uma instância de repositório concreta
// import { PrismaUserRepository } from './PrismaUserRepository'; // Exemplo
// export const authService = new AuthService(new PrismaUserRepository(prisma));

// Se o PrismaUserRepository não existir, você pode criar uma instância com os métodos necessários
// ou usar um mock para testes

// Nota: A geração de JWT foi removida pois será tratada pelo NextAuth.js.
