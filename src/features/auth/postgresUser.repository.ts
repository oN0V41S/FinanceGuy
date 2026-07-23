import { IUserRepository, UserRecord } from "./IUser.repository";
import type { RegisterInput } from "@/features/auth/schemas/auth.schema";
import { prisma } from "@/lib/prisma";

export class PostgresUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      password: user.password,
      emailVerified: user.emailVerified
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      password: user.password,
      emailVerified: user.emailVerified
    };
  }

  async create(data: RegisterInput, hashedPassword?: string): Promise<Omit<UserRecord, 'password'>> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        nickname: data.nickname,
        email: data.email,
        password: hashedPassword || data.password,
      },
    });

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      emailVerified: user.emailVerified
    };
  }

  async updateNickname(id: string, nickname: string): Promise<Omit<UserRecord, 'password'>> {
    const user = await prisma.user.update({ where: { id }, data: { nickname } });
    const { password, ...rest } = user;
    return rest;
  }
}