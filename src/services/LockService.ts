import type { LockSettings } from '@/types/auth';
import { SessionService } from './SessionService';

/**
 * 自动锁定服务
 * 负责自动锁定计时器和用户活动监听
 */
export class LockService {
  /** 存储键: 锁定设置 */
  private static readonly STORAGE_KEY_LOCK_SETTINGS = 'lock_settings';

  /** 默认自动锁定时间 (分钟) */
  private static readonly DEFAULT_LOCK_MINUTES = 30;

  /** 定时器 ID */
  private static timerId: number | null = null;
  /** 提醒定时器 ID 列表 */
  private static reminderTimers: number[] = [];

  /** 锁定回调函数 */
  private static onLockCallback: (() => void) | null = null;
  /** 提醒回调函数 */
  private static onReminderCallback:
    | ((remainingSeconds: number) => void)
    | null = null;

  /**
   * 获取锁定设置
   * @returns 锁定设置
   */
  static async getLockSettings(): Promise<LockSettings> {
    try {
      const result = await chrome.storage.local.get(
        this.STORAGE_KEY_LOCK_SETTINGS
      );
      const settings = result[this.STORAGE_KEY_LOCK_SETTINGS] as
        | LockSettings
        | undefined;

      return (
        settings || {
          autoLockMinutes: this.DEFAULT_LOCK_MINUTES,
          lockOnBrowserClose: true,
          reminderSeconds: [300, 60, 30] // 5分钟、1分钟、30秒前提醒
        }
      );
    } catch (error) {
      console.error('Failed to get lock settings:', error);
      return {
        autoLockMinutes: this.DEFAULT_LOCK_MINUTES,
        lockOnBrowserClose: true,
        reminderSeconds: [300, 60, 30]
      };
    }
  }

  /**
   * 保存锁定设置
   * @param settings 锁定设置
   */
  static async saveLockSettings(settings: LockSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY_LOCK_SETTINGS]: settings
      });
    } catch (error) {
      console.error('Failed to save lock settings:', error);
    }
  }

  /**
   * 设置自动锁定时间
   * @param minutes 锁定时间(分钟), 0 表示永不锁定
   */
  static async setLockTimeout(minutes: number): Promise<void> {
    const settings = await this.getLockSettings();
    settings.autoLockMinutes = minutes;
    await this.saveLockSettings(settings);

    // 重启定时器
    await this.restartTimer();
  }

  /**
   * 获取当前锁定时间设置
   * @returns 锁定时间(分钟)
   */
  static async getLockTimeout(): Promise<number> {
    const settings = await this.getLockSettings();
    return settings.autoLockMinutes;
  }

  /**
   * 启动锁定计时器
   */
  static async startTimer(): Promise<void> {
    // 清除现有计时器
    this.stopTimer();

    const settings = await this.getLockSettings();
    const minutes = settings.autoLockMinutes;

    // 0 表示永不锁定
    if (minutes === 0) {
      return;
    }

    const timeoutMs = minutes * 60 * 1000;

    // 设置主锁定计时器
    this.timerId = window.setTimeout(async () => {
      await this.triggerLock();
    }, timeoutMs);

    // 设置提醒计时器
    for (const reminderSeconds of settings.reminderSeconds) {
      const reminderMs = reminderSeconds * 1000;
      // 只设置在超时时间之前的提醒
      if (reminderMs < timeoutMs) {
        const triggerTime = timeoutMs - reminderMs;
        const reminderId = window.setTimeout(() => {
          this.triggerReminder(reminderSeconds);
        }, triggerTime);
        this.reminderTimers.push(reminderId);
      }
    }
  }

  /**
   * 停止锁定计时器
   */
  static stopTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    // 清除所有提醒计时器
    for (const reminderId of this.reminderTimers) {
      clearTimeout(reminderId);
    }
    this.reminderTimers = [];
  }

  /**
   * 重置计时器 (用户活动时调用)
   */
  static async resetTimer(): Promise<void> {
    // 更新最后活动时间
    await SessionService.updateLastActivity();

    // 重启计时器
    await this.startTimer();
  }

  /**
   * 重启计时器 (设置更改时调用)
   */
  private static async restartTimer(): Promise<void> {
    const isLocked = await SessionService.isLocked();
    if (!isLocked) {
      await this.startTimer();
    }
  }

  /**
   * 触发锁定
   */
  private static async triggerLock(): Promise<void> {
    await SessionService.lock();
    if (this.onLockCallback) {
      this.onLockCallback();
    }
  }

  /**
   * 触发提醒
   * @param remainingSeconds 剩余秒数
   */
  private static triggerReminder(remainingSeconds: number): void {
    if (this.onReminderCallback) {
      this.onReminderCallback(remainingSeconds);
    }
  }

  /**
   * 注册锁定回调函数
   * @param callback 锁定时的回调
   */
  static onLock(callback: () => void): void {
    this.onLockCallback = callback;
  }

  /**
   * 注册提醒回调函数
   * @param callback 提醒时的回调 (参数: 剩余秒数)
   */
  static onReminder(callback: (remainingSeconds: number) => void): void {
    this.onReminderCallback = callback;
  }

  /**
   * 监听用户活动事件
   * 在页面/popup 中调用，用于重置计时器
   */
  static startActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      void this.resetTimer();
    };

    for (const event of events) {
      document.addEventListener(event, handleActivity, { passive: true });
    }
  }

  /**
   * 检查是否应该在浏览器启动时锁定
   * @returns 是否应该锁定
   */
  static async shouldLockOnStartup(): Promise<boolean> {
    const settings = await this.getLockSettings();
    return settings.lockOnBrowserClose;
  }

  /**
   * 浏览器启动时初始化
   * 如果设置了 lockOnBrowserClose，则自动锁定
   */
  static async initOnStartup(): Promise<void> {
    const shouldLock = await this.shouldLockOnStartup();
    if (shouldLock) {
      await SessionService.lock();
    }
  }

  /**
   * 检查会话是否已超时
   * 用于页面加载时检查是否应该锁定
   */
  static async checkSessionTimeout(): Promise<void> {
    const settings = await this.getLockSettings();
    const isExpired = await SessionService.isSessionExpired(
      settings.autoLockMinutes
    );

    if (isExpired) {
      await SessionService.lock();
    }
  }

  /**
   * 获取距离锁定的剩余时间(秒)
   * @returns 剩余秒数, -1 表示永不锁定
   */
  static async getRemainingTime(): Promise<number> {
    const settings = await this.getLockSettings();
    const minutes = settings.autoLockMinutes;

    if (minutes === 0) {
      return -1; // 永不锁定
    }

    const lastActivity = await SessionService.getLastActivityTime();
    const now = Date.now();
    const elapsedMs = now - lastActivity;
    const timeoutMs = minutes * 60 * 1000;
    const remainingMs = timeoutMs - elapsedMs;

    return Math.max(0, Math.floor(remainingMs / 1000));
  }
}
