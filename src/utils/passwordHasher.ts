import type { StoredPassword } from '@/types/auth';

/**
 * 密码哈希工具 (PBKDF2)
 * 使用 Web Crypto API 实现安全的密码存储
 */
export class PasswordHasher {
  /** PBKDF2 迭代次数 */
  private static readonly ITERATIONS = 100000;
  /** 盐值长度 (字节) */
  private static readonly SALT_LENGTH = 16;
  /** 派生密钥长度 (字节) */
  private static readonly KEY_LENGTH = 32;

  /**
   * 生成随机盐值
   */
  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
  }

  /**
   * 将 Uint8Array 转换为 hex 字符串
   */
  private static bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 将 hex 字符串转换为 Uint8Array
   */
  private static hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * 使用 PBKDF2 哈希密码
   * @param password 明文密码
   * @param salt 盐值 (可选, 不提供则自动生成)
   * @returns 哈希结果 (hex)
   */
  private static async hashWithPBKDF2(
    password: string,
    salt: Uint8Array
  ): Promise<string> {
    // 导入密码为基础密钥材料
    const passwordBuffer = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // 使用 PBKDF2 派生密钥
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      this.KEY_LENGTH * 8 // 转换为位数
    );

    return this.bufferToHex(new Uint8Array(derivedBits));
  }

  /**
   * 哈希密码并返回完整的存储结构
   * @param password 明文密码
   * @returns 可存储的密码对象
   */
  static async hash(password: string): Promise<StoredPassword> {
    const salt = this.generateSalt();
    const passwordHash = await this.hashWithPBKDF2(password, salt);

    return {
      passwordHash,
      salt: this.bufferToHex(salt),
      iterations: this.ITERATIONS,
      algorithm: 'PBKDF2',
      createdAt: Date.now()
    };
  }

  /**
   * 验证密码
   * @param password 用户输入的密码
   * @param stored 存储的密码对象
   * @returns 验证是否成功
   */
  static async verify(
    password: string,
    stored: StoredPassword
  ): Promise<boolean> {
    try {
      // 使用存储的盐值重新计算哈希
      const salt = this.hexToBuffer(stored.salt);
      const computedHash = await this.hashWithPBKDF2(password, salt);

      // 时间安全的字符串比较 (防止时序攻击)
      return this.constantTimeEqual(computedHash, stored.passwordHash);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * 时间恒定的字符串比较 (防止时序攻击)
   */
  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
