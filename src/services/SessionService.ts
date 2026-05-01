import type { SessionState, UnlockResult } from "@/types/auth";
import { PasswordService } from "./PasswordService";

/**
 * 会话管理服务
 * 负责解锁/锁定状态管理
 * 密钥管理已统一到 PasswordService（Single Source of Truth）
 */
export class SessionService {
  /** 存储键: 会话状态 */
  private static readonly STORAGE_KEY_SESSION = "session_state";
  /** 存储键: 会话密钥（存储在 chrome.storage.session 中，跨页面持久化） */
  private static readonly STORAGE_KEY_SESSION_KEY = "session_key";

  /**
   * 获取当前会话状态
   * @returns 会话状态
   */
  static async getSessionState(): Promise<SessionState> {
    try {
      // 使用 chrome.storage.session (浏览器重启自动清除)
      const result = await chrome.storage.session.get(this.STORAGE_KEY_SESSION);
      const state = result[this.STORAGE_KEY_SESSION] as
        | SessionState
        | undefined;

      return (
        state || {
          isLocked: true,
          lastActivityTime: Date.now(),
          unlockedAt: null,
        }
      );
    } catch (error) {
      console.error("Failed to get session state:", error);
      return {
        isLocked: true,
        lastActivityTime: Date.now(),
        unlockedAt: null,
      };
    }
  }

  /**
   * 保存会话状态
   * @param state 会话状态
   * @throws 如果保存失败则抛出错误
   */
  private static async saveSessionState(state: SessionState): Promise<void> {
    try {
      await chrome.storage.session.set({
        [this.STORAGE_KEY_SESSION]: state,
      });
    } catch (error) {
      console.error("[SessionService] 保存会话状态失败:", error);
      throw new Error("保存会话状态失败");
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
      const isValid = await PasswordService.verifyMasterPassword(password);

      if (!isValid) {
        // 验证失败（verifyMasterPassword 成功返回时不会走到这里，
        // 因为密码错误会抛出 InvalidPasswordError）
        return {
          success: false,
          error: "密码错误",
        };
      }

      // 2. 验证成功：PasswordService 已缓存密钥，无需重复存储

      // 3. 更新会话状态为已解锁
      const now = Date.now();
      await this.saveSessionState({
        isLocked: false,
        lastActivityTime: now,
        unlockedAt: now,
      });

      return {
        success: true,
      };
    } catch (error: unknown) {
      // 处理 AccountLockedError
      const lockStatus = await PasswordService.checkLockStatusPublic();
      if (lockStatus.isLocked) {
        return {
          success: false,
          remainingAttempts: await PasswordService.getRemainingAttempts(),
          lockedUntil: lockStatus.lockedUntil,
          error: error instanceof Error ? error.message : "账户已锁定",
        };
      }

      // 处理 InvalidPasswordError
      const remainingAttempts = await PasswordService.getRemainingAttempts();
      return {
        success: false,
        remainingAttempts,
        error: error instanceof Error ? error.message : "解锁失败",
      };
    }
  }

  /**
   * 直接标记会话为已解锁（跳过密码验证）
   * 用于 PasswordService 已验证密码后同步会话状态
   * @param masterKey 可选，传入时会将密钥存储到 chrome.storage.session 中
   * @throws 如果标记失败则抛出错误
   */
  static async markUnlocked(masterKey?: string): Promise<void> {
    const now = Date.now();
    await this.saveSessionState({
      isLocked: false,
      lastActivityTime: now,
      unlockedAt: now,
    });

    // 将 masterKey 存储到 chrome.storage.session（跨页面持久化，浏览器重启自动清除）
    if (masterKey) {
      try {
        await chrome.storage.session.set({
          [this.STORAGE_KEY_SESSION_KEY]: masterKey,
        });
      } catch (error) {
        console.error("[SessionService] 存储会话密钥失败:", error);
        throw new Error("存储会话密钥失败");
      }
    }
  }

  /**
   * 从 chrome.storage.session 中获取会话密钥
   * 用于跨页面恢复 masterKey
   * @returns masterKey 或 null
   */
  static async getSessionKey(): Promise<string | null> {
    try {
      const result = await chrome.storage.session.get(
        this.STORAGE_KEY_SESSION_KEY,
      );
      return (result[this.STORAGE_KEY_SESSION_KEY] as string) || null;
    } catch (error) {
      console.error("Failed to get session key:", error);
      return null;
    }
  }

  /**
   * 锁定会话
   * @throws 如果锁定失败则抛出错误
   */
  static async lock(): Promise<void> {
    try {
      // 1. 清除 chrome.storage.session 中的会话密钥
      await chrome.storage.session.remove(this.STORAGE_KEY_SESSION_KEY);

      // 2. 更新会话状态为已锁定
      await this.saveSessionState({
        isLocked: true,
        lastActivityTime: Date.now(),
        unlockedAt: null,
      });
    } catch (error) {
      console.error("[SessionService] 锁定会话失败:", error);
      throw new Error("锁定会话失败");
    }
  }

  /**
   * 获取内存中的加密密钥
   * 委托给 PasswordService.getMasterKey()（密钥管理已统一）
   * @returns 加密密钥 (已解锁) 或 null (未解锁)
   */
  static getEncryptionKey(): string | null {
    return PasswordService.getMasterKey();
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
      console.error("Failed to update last activity:", error);
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
