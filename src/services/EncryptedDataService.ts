import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import { EncryptionService } from "./EncryptionService";
import { StorageError, DataCorruptionError } from "@/types/errors";
import { XSSProtection } from "@/utils/xssProtection";

/**
 * 加密数据服务抽象基类
 * 提供通用的密钥管理、加密读写功能
 */
export abstract class EncryptedDataService {
  /** 存储适配器 */
  protected storage: IStorageAdapter;
  /** 当前解锁的主密钥 */
  private masterKey: string | null = null;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  /**
   * 设置主密钥
   */
  setMasterKey(key: string): void {
    this.masterKey = key;
  }

  /**
   * 清除主密钥
   */
  clearMasterKey(): void {
    this.masterKey = null;
  }

  /**
   * 检查是否已解锁
   */
  protected ensureUnlocked(): void {
    if (!this.masterKey) {
      throw new StorageError("应用未解锁，请先输入密码");
    }
  }

  /**
   * 读取加密数据并解密
   */
  protected async readEncrypted<T>(storage?: IStorageAdapter): Promise<T[]> {
    const targetStorage = storage || this.storage;
    this.ensureUnlocked();

    const encryptedData = await targetStorage.read();
    if (!encryptedData) {
      return [];
    }

    try {
      const decrypted = await EncryptionService.decrypt(
        encryptedData,
        this.masterKey!
      );
      const data = JSON.parse(decrypted) as T[];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      throw new DataCorruptionError("数据解密失败", error);
    }
  }

  /**
   * 加密并写入数据
   */
  protected async writeEncrypted<T>(
    data: T[],
    storage?: IStorageAdapter
  ): Promise<void> {
    const targetStorage = storage || this.storage;
    this.ensureUnlocked();

    const plaintext = JSON.stringify(data);
    const encrypted = await EncryptionService.encrypt(plaintext, this.masterKey!);
    await targetStorage.write(encrypted);
  }

  /**
   * 生成 UUID v4
   */
  protected generateUuid(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * HTML 转义（使用 XSSProtection）
   */
  protected escapeHtml(text: string): string {
    return XSSProtection.escapeHtml(text);
  }
}
