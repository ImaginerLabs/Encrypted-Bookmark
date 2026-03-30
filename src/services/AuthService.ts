import type {
  StoredPassword,
  AuthResult,
  FailedAttemptRecord
} from '@/types/auth';
import { PasswordHasher } from '@/utils/passwordHasher';
import { PasswordValidator } from '@/utils/passwordValidator';

/**
 * 认证服务
 * 负责密码设置、验证和防爆破保护
 */
export class AuthService {
  /** 存储键: 密码数据 */
  private static readonly STORAGE_KEY_PASSWORD = 'auth_password';
  /** 存储键: 失败记录 */
  private static readonly STORAGE_KEY_FAILED_ATTEMPTS = 'auth_failed_attempts';

  /** 连续失败次数阈值 (3次失败 → 锁定) */
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  /** 锁定时长 (毫秒) */
  private static readonly LOCK_DURATION_MS = 30 * 1000; // 30 秒

  /**
   * 检查是否已设置密码
   * @returns 是否已设置
   */
  static async isPasswordSet(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(
        this.STORAGE_KEY_PASSWORD
      );
      return Boolean(result[this.STORAGE_KEY_PASSWORD]);
    } catch (error) {
      console.error('Failed to check password status:', error);
      return false;
    }
  }

  /**
   * 获取失败尝试记录
   * @returns 失败记录
   */
  private static async getFailedAttemptRecord(): Promise<FailedAttemptRecord> {
    try {
      const result = await chrome.storage.local.get(
        this.STORAGE_KEY_FAILED_ATTEMPTS
      );
      const record = result[this.STORAGE_KEY_FAILED_ATTEMPTS] as
        | FailedAttemptRecord
        | undefined;

      return (
        record || {
          count: 0,
          lockedUntil: 0,
          firstFailedAt: 0
        }
      );
    } catch (error) {
      console.error('Failed to get failed attempt record:', error);
      return {
        count: 0,
        lockedUntil: 0,
        firstFailedAt: 0
      };
    }
  }

  /**
   * 保存失败尝试记录
   * @param record 失败记录
   */
  private static async saveFailedAttemptRecord(
    record: FailedAttemptRecord
  ): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY_FAILED_ATTEMPTS]: record
      });
    } catch (error) {
      console.error('Failed to save failed attempt record:', error);
    }
  }

  /**
   * 检查是否处于锁定状态
   * @returns 锁定信息 { isLocked, remainingSeconds }
   */
  static async checkLockStatus(): Promise<{
    isLocked: boolean;
    remainingSeconds: number;
  }> {
    const record = await this.getFailedAttemptRecord();
    const now = Date.now();

    if (record.lockedUntil > now) {
      const remainingMs = record.lockedUntil - now;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return {
        isLocked: true,
        remainingSeconds
      };
    }

    // 锁定已过期，重置失败次数
    if (record.lockedUntil > 0 && record.lockedUntil <= now) {
      await this.saveFailedAttemptRecord({
        count: 0,
        lockedUntil: 0,
        firstFailedAt: 0
      });
    }

    return {
      isLocked: false,
      remainingSeconds: 0
    };
  }

  /**
   * 记录密码验证失败
   * @returns 更新后的失败记录
   */
  private static async recordFailedAttempt(): Promise<FailedAttemptRecord> {
    const record = await this.getFailedAttemptRecord();
    const now = Date.now();

    const newCount = record.count + 1;
    let lockedUntil = 0;

    // 达到失败阈值 → 锁定
    if (newCount >= this.MAX_FAILED_ATTEMPTS) {
      lockedUntil = now + this.LOCK_DURATION_MS;
    }

    const newRecord: FailedAttemptRecord = {
      count: newCount,
      lockedUntil,
      firstFailedAt: record.firstFailedAt || now
    };

    await this.saveFailedAttemptRecord(newRecord);
    return newRecord;
  }

  /**
   * 重置失败记录
   */
  private static async resetFailedAttempts(): Promise<void> {
    await this.saveFailedAttemptRecord({
      count: 0,
      lockedUntil: 0,
      firstFailedAt: 0
    });
  }

  /**
   * 设置主密码 (首次设置)
   * @param password 密码
   * @returns 操作结果
   */
  static async setPassword(password: string): Promise<AuthResult> {
    try {
      // 1. 检查是否已设置密码
      const isSet = await this.isPasswordSet();
      if (isSet) {
        return {
          success: false,
          error: '密码已设置，无法重复设置',
          errorCode: 'PASSWORD_ALREADY_SET'
        };
      }

      // 2. 验证密码强度
      const validation = PasswordValidator.evaluate(password);
      if (!PasswordValidator.isValidLength(password)) {
        return {
          success: false,
          error: validation.feedback.join('; '),
          errorCode: 'INVALID_PASSWORD_LENGTH'
        };
      }

      // 3. 哈希密码
      const storedPassword = await PasswordHasher.hash(password);

      // 4. 保存到 storage
      await chrome.storage.local.set({
        [this.STORAGE_KEY_PASSWORD]: storedPassword
      });

      // 5. 重置失败记录
      await this.resetFailedAttempts();

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to set password:', error);
      return {
        success: false,
        error: '设置密码失败',
        errorCode: 'SET_PASSWORD_FAILED'
      };
    }
  }

  /**
   * 验证密码
   * @param password 用户输入的密码
   * @returns 验证结果
   */
  static async verifyPassword(password: string): Promise<AuthResult<boolean>> {
    try {
      // 1. 检查锁定状态
      const lockStatus = await this.checkLockStatus();
      if (lockStatus.isLocked) {
        return {
          success: false,
          error: `账户已锁定，请等待 ${lockStatus.remainingSeconds} 秒后重试`,
          errorCode: 'ACCOUNT_LOCKED',
          data: false
        };
      }

      // 2. 获取存储的密码
      const result = await chrome.storage.local.get(
        this.STORAGE_KEY_PASSWORD
      );
      const storedPassword = result[this.STORAGE_KEY_PASSWORD] as
        | StoredPassword
        | undefined;

      if (!storedPassword) {
        return {
          success: false,
          error: '密码未设置',
          errorCode: 'PASSWORD_NOT_SET',
          data: false
        };
      }

      // 3. 验证密码
      const isValid = await PasswordHasher.verify(password, storedPassword);

      if (isValid) {
        // 验证成功：重置失败记录
        await this.resetFailedAttempts();
        return {
          success: true,
          data: true
        };
      } else {
        // 验证失败：记录失败次数
        const failedRecord = await this.recordFailedAttempt();
        const remainingAttempts = Math.max(
          0,
          this.MAX_FAILED_ATTEMPTS - failedRecord.count
        );

        let errorMsg = '密码错误';
        if (failedRecord.lockedUntil > Date.now()) {
          const remainingSeconds = Math.ceil(
            (failedRecord.lockedUntil - Date.now()) / 1000
          );
          errorMsg = `连续输入错误 ${this.MAX_FAILED_ATTEMPTS} 次，账户已锁定 ${remainingSeconds} 秒`;
        } else if (remainingAttempts > 0) {
          errorMsg = `密码错误，剩余 ${remainingAttempts} 次尝试机会`;
        }

        return {
          success: false,
          error: errorMsg,
          errorCode: 'INVALID_PASSWORD',
          data: false
        };
      }
    } catch (error) {
      console.error('Failed to verify password:', error);
      return {
        success: false,
        error: '密码验证失败',
        errorCode: 'VERIFY_PASSWORD_FAILED',
        data: false
      };
    }
  }

  /**
   * 修改密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @returns 操作结果
   */
  static async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // 1. 验证旧密码
      const verifyResult = await this.verifyPassword(oldPassword);
      if (!verifyResult.success) {
        return {
          success: false,
          error: verifyResult.error,
          errorCode: verifyResult.errorCode
        };
      }

      // 2. 验证新密码强度
      const validation = PasswordValidator.evaluate(newPassword);
      if (!PasswordValidator.isValidLength(newPassword)) {
        return {
          success: false,
          error: validation.feedback.join('; '),
          errorCode: 'INVALID_PASSWORD_LENGTH'
        };
      }

      // 3. 哈希新密码
      const storedPassword = await PasswordHasher.hash(newPassword);

      // 4. 保存到 storage
      await chrome.storage.local.set({
        [this.STORAGE_KEY_PASSWORD]: storedPassword
      });

      // 5. 重置失败记录
      await this.resetFailedAttempts();

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to change password:', error);
      return {
        success: false,
        error: '修改密码失败',
        errorCode: 'CHANGE_PASSWORD_FAILED'
      };
    }
  }

  /**
   * 获取剩余尝试次数
   * @returns 剩余次数
   */
  static async getRemainingAttempts(): Promise<number> {
    const record = await this.getFailedAttemptRecord();
    return Math.max(0, this.MAX_FAILED_ATTEMPTS - record.count);
  }
}
