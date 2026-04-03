import type { PasswordStatus } from "@/types";
import {
  WeakPasswordError,
  InvalidPasswordError,
  AccountLockedError,
  StorageError,
  PasswordError,
} from "@/types";
import { EncryptionService } from "./EncryptionService";
import { SessionService } from "./SessionService";
import { LockService } from "./LockService";

/**
 * 密码管理服务
 * 负责密码设置、验证、锁定机制和密钥内存管理
 */
export class PasswordService {
  /** 最小密码长度 */
  private static readonly MIN_PASSWORD_LENGTH = 8;
  /** 最大密码长度 */
  private static readonly MAX_PASSWORD_LENGTH = 32;
  /** 锁定阈值 1：3 次错误 → 30 秒锁定 */
  private static readonly LOCK_THRESHOLD_1 = 3;
  private static readonly LOCK_DURATION_1 = 30 * 1000; // 30 秒
  /** 锁定阈值 2：5 次错误 → 5 分钟锁定 */
  private static readonly LOCK_THRESHOLD_2 = 5;
  private static readonly LOCK_DURATION_2 = 5 * 60 * 1000; // 5 分钟

  /** 内存中的密钥缓存（敏感数据） */
  private static masterKey: string | null = null;

  /**
   * 从 chrome.storage.local 读取数据
   */
  private static async getStorageData<T>(
    keys: string[],
  ): Promise<Record<string, T>> {
    try {
      return (await chrome.storage.local.get(keys)) as Record<string, T>;
    } catch (error) {
      throw new StorageError("读取存储数据失败", error);
    }
  }

  /**
   * 写入 chrome.storage.local
   */
  private static async setStorageData(
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      throw new StorageError("写入存储数据失败", error);
    }
  }

  /**
   * 获取密码状态
   */
  static async getPasswordStatus(): Promise<PasswordStatus> {
    const data = await this.getStorageData<PasswordStatus | string>([
      "passwordHash",
      "passwordStatus",
    ]);

    const isSet = Boolean(data.passwordHash);
    const status = data.passwordStatus as PasswordStatus | undefined;

    return {
      isSet,
      failedAttempts: status?.failedAttempts || 0,
      lockedUntil: status?.lockedUntil || 0,
    };
  }

  /**
   * 检查密码强度
   * @throws {WeakPasswordError} 密码不符合强度要求
   */
  static validatePasswordStrength(password: string): void {
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError(
        `密码长度不足：至少需要 ${this.MIN_PASSWORD_LENGTH} 个字符`,
      );
    }
    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new WeakPasswordError(
        `密码长度过长：最多 ${this.MAX_PASSWORD_LENGTH} 个字符`,
      );
    }
    // 可扩展：添加更多强度检查（大小写、数字、特殊字符等）
  }

  /**
   * 检查账户锁定状态
   * @throws {AccountLockedError} 账户已锁定
   */
  private static async checkLockStatus(): Promise<void> {
    const status = await this.getPasswordStatus();
    const now = Date.now();

    if (status.lockedUntil > now) {
      const remainingSeconds = Math.ceil((status.lockedUntil - now) / 1000);
      throw new AccountLockedError(
        `账户已锁定，请在 ${remainingSeconds} 秒后重试`,
        status.lockedUntil,
      );
    }

    // 锁定已过期，重置失败次数
    if (status.lockedUntil > 0 && status.lockedUntil <= now) {
      await this.setStorageData({
        passwordStatus: {
          isSet: status.isSet,
          failedAttempts: 0,
          lockedUntil: 0,
        },
      });
    }
  }

  /**
   * 记录密码验证失败
   */
  private static async recordFailedAttempt(): Promise<void> {
    const status = await this.getPasswordStatus();
    const newFailedAttempts = status.failedAttempts + 1;
    let lockedUntil = 0;

    // 判断锁定策略
    if (newFailedAttempts >= this.LOCK_THRESHOLD_2) {
      lockedUntil = Date.now() + this.LOCK_DURATION_2;
    } else if (newFailedAttempts >= this.LOCK_THRESHOLD_1) {
      lockedUntil = Date.now() + this.LOCK_DURATION_1;
    }

    await this.setStorageData({
      passwordStatus: {
        isSet: status.isSet,
        failedAttempts: newFailedAttempts,
        lockedUntil,
      },
    });
  }

  /**
   * 重置失败次数
   */
  private static async resetFailedAttempts(): Promise<void> {
    const status = await this.getPasswordStatus();
    await this.setStorageData({
      passwordStatus: {
        isSet: status.isSet,
        failedAttempts: 0,
        lockedUntil: 0,
      },
    });
  }

  /**
   * 设置主密码（首次设置）
   * @param password 用户输入的密码
   * @throws {WeakPasswordError} 密码强度不足
   * @throws {PasswordError} 密码已设置
   */
  static async setMasterPassword(password: string): Promise<void> {
    // 检查是否已设置密码
    const status = await this.getPasswordStatus();
    if (status.isSet) {
      throw new PasswordError("主密码已设置，无法重复设置");
    }

    // 验证密码强度
    this.validatePasswordStrength(password);

    // 计算密码哈希
    const passwordHash = await EncryptionService.hashPassword(password);

    // 存储密码哈希
    await this.setStorageData({
      passwordHash,
      passwordStatus: {
        isSet: true,
        failedAttempts: 0,
        lockedUntil: 0,
      },
    });

    // 缓存到内存
    this.masterKey = password;
    // 同步到 sessionStorage，供 Popup 等组件使用（仅页面上下文可用）
    try {
      sessionStorage.setItem("masterKey", password);
    } catch {
      /* service worker 无 sessionStorage */
    }

    // 同步更新 SessionService 会话状态为已解锁
    try {
      await SessionService.markUnlocked(password);
    } catch {
      /* 忽略 SessionService 同步错误 */
    }
  }
  /**
   * 验证主密码
   * @param password 用户输入的密码
   * @returns 验证成功返回 true
   * @throws {AccountLockedError} 账户已锁定
   * @throws {InvalidPasswordError} 密码错误
   */
  static async verifyMasterPassword(password: string): Promise<boolean> {
    // 检查锁定状态
    await this.checkLockStatus();

    // 获取存储的密码哈希
    const data = await this.getStorageData<string>(["passwordHash"]);
    const storedHash = data.passwordHash;

    if (!storedHash) {
      throw new PasswordError("主密码未设置");
    }

    // 验证密码
    const isValid = await EncryptionService.verifyPasswordHash(
      password,
      storedHash,
    );

    if (isValid) {
      // 验证成功：缓存密钥并重置失败次数
      this.masterKey = password;
      try {
        sessionStorage.setItem("masterKey", password);
      } catch {
        /* service worker 无 sessionStorage */
      }
      await this.resetFailedAttempts();

      // 同步更新 SessionService 会话状态为已解锁
      try {
        await SessionService.markUnlocked(password);
      } catch {
        /* 忽略 SessionService 同步错误 */
      }
      return true;
    } else {
      // 验证失败：记录失败次数
      await this.recordFailedAttempt();
      const status = await this.getPasswordStatus();

      // 计算剩余尝试次数
      const remainingAttempts = Math.max(
        0,
        this.LOCK_THRESHOLD_2 - status.failedAttempts,
      );

      throw new InvalidPasswordError("密码错误", remainingAttempts);
    }
  }

  /**
   * 获取内存中的主密钥
   * @returns 主密钥（已解锁）或 null（未解锁）
   */
  static getMasterKey(): string | null {
    return this.masterKey;
  }

  /**
   * 检查是否已解锁（同步，仅检查内存）
   */
  static isUnlocked(): boolean {
    return this.masterKey !== null;
  }

  /**
   * 异步检查并恢复会话状态
   * 通过 SessionService（chrome.storage.session）检查会话是否仍然有效，
   * 并结合 autoLockMinutes 配置判断是否超时。
   * 如果会话有效，尝试从 sessionStorage 恢复 masterKey。
   * @returns 是否已解锁
   */
  static async checkAndRestoreSession(): Promise<boolean> {
    // 1. 内存中已有密钥，直接返回
    if (this.masterKey !== null) {
      return true;
    }

    try {
      // 2. 检查 SessionService 会话状态（chrome.storage.session，跨页面持久化）
      const isLocked = await SessionService.isLocked();
      if (isLocked) {
        return false;
      }

      // 3. 会话未锁定，检查是否已超时（基于 autoLockMinutes 配置）
      const lockSettings = await LockService.getLockSettings();
      const isExpired = await SessionService.isSessionExpired(
        lockSettings.autoLockMinutes,
      );
      if (isExpired) {
        // 会话已超时，执行锁定
        await SessionService.lock();
        return false;
      }

      // 4. 会话有效，尝试从 chrome.storage.session 恢复 masterKey
      const sessionKey = await SessionService.getSessionKey();
      if (sessionKey) {
        this.masterKey = sessionKey;
        // 同步到 sessionStorage（仅当前页面上下文）
        try {
          sessionStorage.setItem("masterKey", sessionKey);
        } catch {
          /* service worker 无 sessionStorage */
        }
        return true;
      }

      // 5. chrome.storage.session 中也没有 masterKey，
      //    但 SessionService 显示未锁定 → 需要用户重新输入密码
      return false;
    } catch (error) {
      console.error("检查会话状态失败:", error);
      return false;
    }
  }

  /**
   * 锁定（清除内存中的密钥）
   */
  static async lock(): Promise<void> {
    this.masterKey = null;
    try {
      sessionStorage.removeItem("masterKey");
    } catch {
      /* service worker 无 sessionStorage */
    }
    // 同步更新 SessionService 会话状态为已锁定
    await SessionService.lock();
  }

  /**
   * 修改主密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @throws {InvalidPasswordError} 旧密码错误
   * @throws {WeakPasswordError} 新密码强度不足
   */
  static async changeMasterPassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 验证旧密码
    await this.verifyMasterPassword(oldPassword);

    // 验证新密码强度
    this.validatePasswordStrength(newPassword);

    // 计算新密码哈希
    const newPasswordHash = await EncryptionService.hashPassword(newPassword);

    // 更新存储
    await this.setStorageData({
      passwordHash: newPasswordHash,
    });

    // 更新内存中的密钥
    this.masterKey = newPassword;

    // TODO: 这里需要重新加密所有数据（使用新密码）
    // 在后续 Task 中实现数据迁移逻辑
  }

  /**
   * 重置所有数据（危险操作）
   * 清除密码和所有加密数据
   */
  static async resetAll(): Promise<void> {
    await chrome.storage.local.clear();
    this.masterKey = null;
  }
}
