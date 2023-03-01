import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BCryptService {
  async hash(pass: string, saltRounds = 10) {
    try {
      const genSaltResult = await bcrypt.genSalt(saltRounds);
      try {
        return await bcrypt.hash(pass, genSaltResult);
      } catch (e: unknown) {
        console.error(e);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }
  async compareWithHash(pass: string, hash: string) {
    try {
      return await bcrypt.compare(pass, hash);
    } catch (err: any) {
      console.error(`compareWithHash: ${err}`);
    }
  }
}
