import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * 集成测试 - 会话超时
 * 验证 autoLockMinutes 配置生效：
 * - 超时后重新打开 Popup 需要重新输入密码
 * - autoLockMinutes=0 时永不超时
 * - 不同超时时间配置正确应用
 */
test.describe("会话超时 - autoLockMinutes 超时后需重新解锁", () => {
  test("会话超时后重新打开 Popup 应显示解锁界面", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "TimeoutTest12!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：模拟会话超时 —— 将 lastActivityTime 设置为很久以前
    // 同时设置 autoLockMinutes 为 1 分钟
    await popup1.evaluate(async () => {
      // 设置 autoLockMinutes 为 1 分钟
      await chrome.storage.local.set({
        lock_settings: {
          autoLockMinutes: 1,
          lockOnBrowserClose: true,
          reminderSeconds: [30],
        },
      });

      // 将 lastActivityTime 设置为 10 分钟前（远超 1 分钟超时）
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      await chrome.storage.session.set({
        session_state: {
          isLocked: false,
          lastActivityTime: tenMinutesAgo,
          unlockedAt: tenMinutesAgo,
        },
      });
    });

    await popup1.close();

    // 第三步：重新打开 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：由于会话已超时，应显示解锁界面
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    await popup2.close();
  });

  test("会话未超时时重新打开 Popup 应自动恢复", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "NotExpired123!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：设置 autoLockMinutes 为 60 分钟（远未超时）
    await popup1.evaluate(async () => {
      await chrome.storage.local.set({
        lock_settings: {
          autoLockMinutes: 60,
          lockOnBrowserClose: true,
          reminderSeconds: [300, 60, 30],
        },
      });
    });

    await popup1.close();

    // 第三步：重新打开 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：会话未超时，应自动恢复
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await popup2.close();
  });
});

test.describe("会话超时 - 永不超时场景", () => {
  test("autoLockMinutes=0 时会话永不过期", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "NeverExpire1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：设置 autoLockMinutes=0（永不超时），并将 lastActivityTime 设为很久以前
    await popup1.evaluate(async () => {
      await chrome.storage.local.set({
        lock_settings: {
          autoLockMinutes: 0,
          lockOnBrowserClose: true,
          reminderSeconds: [],
        },
      });

      // 将 lastActivityTime 设置为 1 小时前
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      await chrome.storage.session.set({
        session_state: {
          isLocked: false,
          lastActivityTime: oneHourAgo,
          unlockedAt: oneHourAgo,
        },
      });
    });

    await popup1.close();

    // 第三步：重新打开 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：autoLockMinutes=0 时永不超时，应自动恢复
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await popup2.close();
  });

  test("autoLockMinutes 默认值 15 分钟生效", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "DefaultTime1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：不设置 lock_settings（使用默认值 15 分钟），
    // 将 lastActivityTime 设为 20 分钟前（超过默认 15 分钟）
    await popup1.evaluate(async () => {
      // 清除 lock_settings，使用默认值
      await chrome.storage.local.remove("lock_settings");

      const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;
      await chrome.storage.session.set({
        session_state: {
          isLocked: false,
          lastActivityTime: twentyMinutesAgo,
          unlockedAt: twentyMinutesAgo,
        },
      });
    });

    await popup1.close();

    // 第三步：重新打开 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：默认 15 分钟超时，20 分钟前的活动已超时，应显示解锁界面
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    await popup2.close();
  });
});

test.describe("会话超时 - 超时后 SessionService 状态更新", () => {
  test("超时检查后 session_state 应被标记为 locked", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "StateUpdate1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：模拟超时
    await popup1.evaluate(async () => {
      await chrome.storage.local.set({
        lock_settings: {
          autoLockMinutes: 1,
          lockOnBrowserClose: true,
          reminderSeconds: [30],
        },
      });

      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      await chrome.storage.session.set({
        session_state: {
          isLocked: false,
          lastActivityTime: tenMinutesAgo,
          unlockedAt: tenMinutesAgo,
        },
      });
    });

    await popup1.close();

    // 第三步：打开新 Popup 触发超时检查
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 等待超时检查完成
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    // 验证 session_state 已被标记为 locked
    const sessionState = await popup2.evaluate(async () => {
      const result = await chrome.storage.session.get("session_state");
      return result.session_state;
    });

    expect(sessionState).toBeDefined();
    expect((sessionState as { isLocked: boolean }).isLocked).toBe(true);

    await popup2.close();
  });
});
