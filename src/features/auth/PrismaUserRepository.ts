import { PrismaClient } from '@prisma/client';
import { IUserRepository, UserRecord } from './IUser.repository';
import { RegisterInput } from './schemas/auth.schema';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user ? { ...user } : null;
  }

  async create(data: RegisterInput, hashedPassword?: string): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        nickname: data.nickname,
        email: data.email,
        password: hashedPassword, // Armazena o hash da senha
      },
    });

    // Remove a senha do objeto retornado por segurança
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateNickname(id: string, nickname: string): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.prisma.user.update({ where: { id }, data: { nickname } });
    const { password, ...rest } = user;
    return rest;
  }
}
