import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async getByPhone(phone: string) {
    return await this.usersRepository.findOneByPhone(phone);
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
}
