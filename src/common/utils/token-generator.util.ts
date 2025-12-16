import * as crypto from 'crypto';

export class TokenGenerator {
  static generate(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
