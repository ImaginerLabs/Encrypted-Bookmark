import type { SessionState, UnlockResult } from '@/types/auth';
import { AuthService } from './AuthService';

/**
 * 会话管理服务
 * 负责解锁/锁定状态管理和内存密钥存储
 */
export class SessionService {
  /** 存储键: 会话状态 */
  private static readonly STORAGE_KEY_SESSION = 'session_state';

  /** 内存中的加密密钥 (使用 WeakMap 提高安全性) */
  private static encryptionKeyStore = new WeakMap<object, string>();
  /** WeakMap 的引用对象 */
  private static keyReference = {};

  /**
   * 获取当前会话状态
   * @returns 会话状态
   */
  static async getSessionState(): Promise<SessionState> {
    try {
      // 使用 chrome.storage.session (浏览器重启自动清除)
      const result = await chrome.storage.session.get(
        this.STORAGE_KEY_SESSION
      );
      const state = result[this.STORAGE_KEY_SESSION] as
        | SessionState
        | undefined;

      return (
        state || {
          isLocked: true,
          lastActivityTime: Date.now(),
          unlockedAt: null
        }
      );
    } catch (error) {
      console.error('Failed to get session state:', error);
      return {
        isLocked: true,
        lastActivityTime: Date.now(),
        unlockedAt: null
      };
    }
  }

  /**
   * 保存会话状态
   * @param state 会话状态
   */
  private static async saveSessionState(state: SessionState): Promise<void> {
    try {
      await chrome.storage.session.set({
        [this.STORAGE_KEY_SESSION]: state
      });
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  /**
   * 检查是否已锁定
   * @returns 是否锁定
   */
  static async isLocked(): Promise<boolean> {
    const state = await this.getSessionState();
    return state.isLocked;
  }

  /**
   * 解锁会话
   * @param password 用户输入的密码
   * @returns 解锁结果
   */
  static async unlock(password: string): Promise<UnlockResult> {
    try {
      // 1. 验证密码
      const verifyResult = await AuthService.verifyPassword(password);

      if (!verifyResult.success) {
        // 验证失败
        const remainingAttempts = await AuthService.getRemainingAttempts();
        const lockStatus = await AuthService.checkLockStatus();

        return {
          success: false,
          remainingAttempts,
          lockedUntil: lockStatus.isLocked
            ? Date.now() + lockStatus.remainingSeconds * 1000
            : undefined,
          error: verifyResult.error
        };
      }

      // 2. 验证成功：存储密钥到内存
      this.encryptionKeyStore.set(this.keyReference, password);

      // 3. 更新会话状态为已解锁
      const now = Date.now();
      await this.saveSessionState({
        isLocked: false,
        lastActivityTime: now,
        unlockedAt: now
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to unlock session:', error);
      return {
        success: false,
        error: '解锁失败'
      };
    }
  }

  /**
   * 锁定会话
   */
  static async lock(): Promise<void> {
    try {
      // 1. 清除内存中的加密密钥
      this.clearEncryptionKey();

      // 2. 更新会话状态为已锁定
      await this.saveSessionState({
        isLocked: true,
        lastActivityTime: Date.now(),
        unlockedAt: null
      });
    } catch (error) {
      console.error('Failed to lock session:', error);
    }
  }

  /**
   * 获取内存中的加密密钥
   * @returns 加密密钥 (已解锁) 或 null (未解锁)
   */
  static getEncryptionKey(): string | null {
    return this.encryptionKeyStore.get(this.keyReference) || null;
  }

  /**
   * 清除内存中的加密密钥
   */
  private static clearEncryptionKey(): void {
    // 创建新的引用对象，旧的密钥会被垃圾回收
    this.keyReference = {};
  }

  /**
   * 更新最后活动时间
   * 用于自动锁定计时器重置
   */
  static async updateLastActivity(): Promise<void> {
    try {
      const state = await this.getSessionState();
      if (!state.isLocked) {
        state.lastActivityTime = Date.now();
        await this.saveSessionState(state);
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * 获取最后活动时间
   * @returns 最后活动时间戳
   */
  static async getLastActivityTime(): Promise<number> {
    const state = await this.getSessionState();
    return state.lastActivityTime;
  }

  /**
   * 检查会话是否已超时
   * @param timeoutMinutes 超时时间(分钟)
   * @returns 是否超时
   */
  static async isSessionExpired(timeoutMinutes: number): Promise<boolean> {
    if (timeoutMinutes === 0) {
      return false; // 永不超时
    }

    const lastActivity = await this.getLastActivityTime();
    const now = Date.now();
    const elapsedMinutes = (now - lastActivity) / 1000 / 60;

    return elapsedMinutes >= timeoutMinutes;
  }
}
