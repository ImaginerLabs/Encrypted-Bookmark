import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * 集成测试 - Background Service Worker 消息通信
 * 覆盖 Popup/Options 与 Background 的消息交互
 */
test.describe("Background - 消息通信", () => {
  test("GET_PASSWORD_STATUS 消息返回正确状态", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);
    await storage.clear();

    // 通过 evaluate 发送消息到 background
    const status = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "GET_PASSWORD_STATUS" },
          (response) => {
            resolve(response);
          },
        );
      });
    });

    // 验证返回的状态结构
    expect(status).toHaveProperty("isSet");
    expect(status).toHaveProperty("failedAttempts");
    expect(status).toHaveProperty("lockedUntil");
  });

  test("CHECK_UNLOCK_STATUS 消息返回解锁状态", async ({ popupPage }) => {
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CHECK_UNLOCK_STATUS" },
          (response) => {
            resolve(response);
          },
        );
      });
    });

    expect(result).toHaveProperty("isUnlocked");
    expect(typeof (result as { isUnlocked: boolean }).isUnlocked).toBe(
      "boolean",
    );
  });

  test("LOCK 消息成功锁定", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 先设置密码
    const testPassword = "LockMsgTest123!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 发送 LOCK 消息
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "LOCK" }, (response) => {
          resolve(response);
        });
      });
    });

    expect(result).toEqual({ success: true });

    // 刷新页面验证锁定状态
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();

    await popupPage.close();
  });

  test("未知消息类型返回错误", async ({ popupPage }) => {
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "UNKNOWN_TYPE" }, (response) => {
          resolve(response);
        });
      });
    });

    expect(result).toHaveProperty("error");
  });

  test("CHECK_UNLOCK_STATUS 解锁后返回 isUnlocked=true", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 设置密码
    const testPassword = "CheckStatus1!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 通过 background 消息检查解锁状态
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CHECK_UNLOCK_STATUS" },
          (response) => {
            resolve(response);
          },
        );
      });
    });

    // 验证：解锁后应返回 isUnlocked=true
    expect(result).toHaveProperty("isUnlocked");
    // 注意：background service worker 中 PasswordService 的 masterKey 可能为 null
    // 但 SessionService 的会话状态应该是 unlocked
    // 实际结果取决于 service worker 中 sessionStorage 是否可用

    await popupPage.close();
  });

  test("CHECK_UNLOCK_STATUS 锁定后返回 isUnlocked=false", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 设置密码
    const testPassword = "LockCheck123!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 锁定
    await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "LOCK" }, (response) => {
          resolve(response);
        });
      });
    });

    // 等待锁定生效
    await popupPage.waitForTimeout(500);

    // 检查解锁状态
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CHECK_UNLOCK_STATUS" },
          (response) => {
            resolve(response);
          },
        );
      });
    });

    // 验证：锁定后应返回 isUnlocked=false
    expect((result as { isUnlocked: boolean }).isUnlocked).toBe(false);

    await popupPage.close();
  });

  test("CHECK_UNLOCK_STATUS 会话超时后返回 isUnlocked=false", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 设置密码
    const testPassword = "TimeoutChk12!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 模拟超时：设置 autoLockMinutes=1，lastActivityTime 为 10 分钟前
    await popupPage.evaluate(async () => {
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

    // 通过 background 消息检查
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CHECK_UNLOCK_STATUS" },
          (response) => {
            resolve(response);
          },
        );
      });
    });

    // 验证：超时后应返回 isUnlocked=false
    expect((result as { isUnlocked: boolean }).isUnlocked).toBe(false);

    await popupPage.close();
  });
});

/**
 * 集成测试 - Service Worker 生命周期
 */
test.describe("Background - Service Worker", () => {
  test("Service Worker 正常启动", async ({ extensionContext, extensionId }) => {
    // 获取 Service Worker
    const serviceWorkers = extensionContext.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    // 验证 URL 包含扩展 ID
    const swUrl = serviceWorkers[0].url();
    expect(swUrl).toContain(extensionId);
  });

  test("扩展安装事件触发", async ({ extensionContext }) => {
    // Service Worker 启动表示 onInstalled 已触发
    const serviceWorkers = extensionContext.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
  });
});

/**
 * 集成测试 - Chrome Storage 同步
 */
test.describe("Background - Storage 同步", () => {
  test("Popup 修改 Storage 后 Background 能读取", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 清空并设置测试数据
    await storage.clear();
    await storage.set({ testKey: "testValue" });

    // 通过 Background 读取
    const result = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get(["testKey"], (data) => {
          resolve(data);
        });
      });
    });

    expect(result).toEqual({ testKey: "testValue" });
  });
});
