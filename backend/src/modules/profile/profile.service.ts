import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const { passwordHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: Partial<User>) {
    await this.userRepo.update(userId, data);
    return this.getProfile(userId);
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException('Senha atual incorreta');

    user.passwordHash = await argon2.hash(newPassword);
    await this.userRepo.save(user);

    return { message: 'Senha alterada com sucesso' };
  }

  async updatePix(userId: string, pixKeyType: string, pixKey: string) {
    await this.userRepo.update(userId, { pixKeyType: pixKeyType as any, pixKey });
    return { message: 'Chave PIX atualizada com sucesso' };
  }
}
