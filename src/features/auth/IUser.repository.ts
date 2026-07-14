import { RegisterInput } from "@validation/auth.schema";

// Substitua pelo tipo correto do seu User, se necessário
export interface UserRecord {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  emailVerified?: Date | null;
  password?: string | null; // Opcional no retorno, obrigatório no banco
}

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(data: RegisterInput, hashedPassword?: string): Promise<Omit<UserRecord, 'password'>>;
  updateNickname(id: string, nickname: string): Promise<Omit<UserRecord, 'password'>>;
}