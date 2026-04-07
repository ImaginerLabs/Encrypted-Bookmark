import type { Page } from "@playwright/test";

/**
 * Chrome Storage 测试辅助类
 * 提供存储操作的便捷方法
 */
export class ChromeStorageHelper {
  constructor(private page: Page) {}

  /**
   * 清空所有存储数据（包括 chrome.storage.local 和 chrome.storage.session）
   */
  async clear(): Promise<void> {
    await this.page.evaluate(async () => {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
    });
  }

  /**
   * 设置存储数据
   */
  async set(data: Record<string, unknown>): Promise<void> {
    await this.page.evaluate((d) => chrome.storage.local.set(d), data);
  }

  /**
   * 获取存储数据
   */
  async get(keys?: string | string[]): Promise<Record<string, unknown>> {
    if (keys) {
      return await this.page.evaluate((k) => chrome.storage.local.get(k), keys);
    }
    return await this.page.evaluate(() => chrome.storage.local.get());
  }

  /**
   * 移除指定键
   */
  async remove(keys: string | string[]): Promise<void> {
    await this.page.evaluate((k) => chrome.storage.local.remove(k), keys);
  }

  /**
   * 只清空书签数据，保留密码设置
   */
  async clearBookmarksOnly(): Promise<void> {
    await this.page.evaluate(async () => {
      // 先保存密码相关数据
      const passwordData = await chrome.storage.local.get([
        "passwordHash",
        "passwordStatus",
      ]);
      // 清空所有数据
      await chrome.storage.local.clear();
      // 恢复密码数据
      if (Object.keys(passwordData).length > 0) {
        await chrome.storage.local.set(passwordData);
      }
    });
  }

  /**
   * 预设密码已设置状态（用于跳过设置流程）
   * @param passwordHash 密码哈希（可选，使用默认测试哈希）
   */
  async setupPasswordSet(passwordHash?: string): Promise<void> {
    const hash = passwordHash || "test-password-hash-for-testing";
    await this.set({
      passwordHash: hash,
      passwordStatus: {
        isSet: true,
        failedAttempts: 0,
        lockedUntil: 0,
      },
    });
  }

  /**
   * 预设账户锁定状态
   * @param failedAttempts 失败次数
   * @param lockedUntilSeconds 锁定时长（秒）
   */
  async setupLockedState(
    failedAttempts: number,
    lockedUntilSeconds: number,
  ): Promise<void> {
    await this.set({
      passwordHash: "test-password-hash",
      passwordStatus: {
        isSet: true,
        failedAttempts,
        lockedUntil: Date.now() + lockedUntilSeconds * 1000,
      },
    });
  }

  /**
   * 获取密码状态
   */
  async getPasswordStatus(): Promise<{
    isSet: boolean;
    failedAttempts: number;
    lockedUntil: number;
  } | null> {
    const data = await this.get(["passwordHash", "passwordStatus"]);
    const status = data.passwordStatus as
      | {
          isSet: boolean;
          failedAttempts: number;
          lockedUntil: number;
        }
      | undefined;

    if (!status) return null;

    return {
      isSet: Boolean(data.passwordHash),
      failedAttempts: status.failedAttempts || 0,
      lockedUntil: status.lockedUntil || 0,
    };
  }
}

/**
 * 创建 Chrome Storage Helper 实例
 */
export function createStorageHelper(page: Page): ChromeStorageHelper {
  return new ChromeStorageHelper(page);
}
