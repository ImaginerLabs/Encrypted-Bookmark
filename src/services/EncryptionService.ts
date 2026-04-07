import type { EncryptedData } from '@/types';
import { EncryptionError, DataCorruptionError, PasswordError } from '@/types';

/**
 * 加密服务
 * 基于 Web Crypto API 实现 AES-256-GCM 加密
 * 使用 PBKDF2 进行密钥派生（迭代 100000 次）
 */
export class EncryptionService {
  /** 加密算法 */
  private static readonly ALGORITHM = 'AES-GCM';
  /** 密钥长度（256 位） */
  private static readonly KEY_LENGTH = 256;
  /** PBKDF2 迭代次数 */
  private static readonly PBKDF2_ITERATIONS = 100000;
  /** 盐值长度（字节） */
  private static readonly SALT_LENGTH = 16;
  /** IV 长度（字节） */
  private static readonly IV_LENGTH = 12;
  /** 当前数据版本 */
  private static readonly CURRENT_VERSION = 1;

  /**
   * 生成随机字节数组
   */
  private static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * 将字符串转换为 Uint8Array
   */
  private static stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  /**
   * 将 BufferSource 转换为字符串
   */
  private static bufferToString(buffer: BufferSource): string {
    return new TextDecoder().decode(buffer);
  }

  /**
   * 将 BufferSource 转换为 Base64
   */
  private static bufferToBase64(buffer: BufferSource): string {
    const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 转换为 Uint8Array
   */
  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * 使用 PBKDF2 派生密钥
   * @param password 用户密码
   * @param salt 盐值
   * @returns 派生的 CryptoKey
   */
  private static async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    try {
      // 先将密码导入为基础密钥材料
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        this.stringToBuffer(password) as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // 使用 PBKDF2 派生最终密钥
      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations: this.PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        passwordKey,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH
        },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new EncryptionError('密钥派生失败', error);
    }
  }

  /**
   * 计算数据的 SHA-256 校验和
   */
  private static async calculateChecksum(data: string): Promise<string> {
    try {
      const buffer = this.stringToBuffer(data) as BufferSource;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return this.bufferToBase64(hashBuffer);
    } catch (error) {
      throw new EncryptionError('校验和计算失败', error);
    }
  }

  /**
   * AES-256-GCM 加密
   * @param plaintext 明文（JSON 字符串或普通字符串）
   * @param password 密码
   * @returns 加密数据对象
   */
  static async encrypt(
    plaintext: string,
    password: string
  ): Promise<EncryptedData> {
    // P1-002: 检查密码是否为空
    if (!password || password.trim().length === 0) {
      throw new PasswordError('密码不能为空');
    }

    try {
      // 生成随机盐值和 IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH);
      const iv = this.generateRandomBytes(this.IV_LENGTH);

      // 派生密钥
      const key = await this.deriveKey(password, salt);

      // 加密数据
      const plaintextBuffer = this.stringToBuffer(plaintext) as BufferSource;
      const ciphertextBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv as BufferSource
        },
        key,
        plaintextBuffer
      );

      // 计算原始明文的校验和（用于解密后验证）
      const checksum = await this.calculateChecksum(plaintext);

      // 返回加密数据结构
      return {
        version: this.CURRENT_VERSION,
        salt: this.bufferToBase64(salt as BufferSource),
        iv: this.bufferToBase64(iv as BufferSource),
        ciphertext: this.bufferToBase64(ciphertextBuffer),
        checksum
      };
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError('加密失败', error);
    }
  }

  /**
   * AES-256-GCM 解密
   * @param encryptedData 加密数据对象
   * @param password 密码（必须使用 PasswordService.getMasterKey() 获取的主密钥）
   * @returns 解密后的明文
   * @throws {PasswordError} 密码为空或应用未解锁
   * @throws {DataCorruptionError} 数据校验失败或Base64解码失败
   * @throws {EncryptionError} 解密失败（通常是密码错误）
   * 
   * @security 调用方必须确保传入的 password 来自 PasswordService.getMasterKey()
   * 不应使用任意字符串进行解密尝试，否则存在安全风险
   */
  static async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<string> {
    // P1-002: 检查密码是否为空
    if (!password || password.trim().length === 0) {
      throw new PasswordError('密码不能为空');
    }

    try {
      // 检查版本兼容性
      if (encryptedData.version !== this.CURRENT_VERSION) {
        throw new EncryptionError(
          `不支持的数据版本: ${encryptedData.version}`
        );
      }

      // 解析 Base64 数据 - 添加异常捕获
      let salt: Uint8Array;
      let iv: Uint8Array;
      let ciphertext: Uint8Array;

      try {
        salt = this.base64ToBuffer(encryptedData.salt);
        iv = this.base64ToBuffer(encryptedData.iv);
        ciphertext = this.base64ToBuffer(encryptedData.ciphertext);
      } catch (error) {
        throw new DataCorruptionError('数据格式错误: Base64解码失败', { error });
      }

      // 派生密钥
      const key = await this.deriveKey(password, salt);

      // 解密数据
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv as BufferSource
        },
        key,
        ciphertext as BufferSource
      );

      const plaintext = this.bufferToString(plaintextBuffer);

      // 验证数据完整性（兼容旧版本：checksum 为空时跳过校验）
      if (encryptedData.checksum) {
        const checksum = await this.calculateChecksum(plaintext);
        if (checksum !== encryptedData.checksum) {
          throw new DataCorruptionError('数据校验和不匹配，数据可能已损坏');
        }
      }

      return plaintext;
    } catch (error) {
      if (error instanceof DataCorruptionError || error instanceof EncryptionError) {
        throw error;
      }
      // Web Crypto API 解密失败通常意味着密码错误
      throw new EncryptionError('解密失败：密码错误或数据损坏', error);
    }
  }

  /**
   * 计算密码的 SHA-256 哈希
   * 用于密码验证（不可逆）
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const buffer = this.stringToBuffer(password) as BufferSource;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return this.bufferToBase64(hashBuffer);
    } catch (error) {
      throw new EncryptionError('密码哈希失败', error);
    }
  }

  /**
   * 验证密码哈希
   */
  static async verifyPasswordHash(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      const computedHash = await this.hashPassword(password);
      return computedHash === hash;
    } catch (error) {
      throw new EncryptionError('密码验证失败', error);
    }
  }
}
