import { Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async getByPhone(phone: string) {
    return await this.usersRepository.findOneByPhone(phone);
  }

  async getByEmail(email: string) {
    return await this.usersRepository.findOneByEmail(email);
  }

  async getById(id: string) {
    return await this.usersRepository.findOneById(id);
  }

  async create(user: User) {
    return await this.usersRepository.createOne(user);
  }

  async update(user: User, update: User) {
    return await this.usersRepository.updateOne(user, update);
  }

  async setRefreshToken(guid: string, digest: string | null) {
    return this.usersRepository.setRefreshToken(guid, digest);
  }

  async rotateRefreshToken(
    guid: string,
    previousDigest: string,
    nextDigest: string,
  ) {
    return this.usersRepository.rotateRefreshToken(
      guid,
      previousDigest,
      nextDigest,
    );
  }
}
