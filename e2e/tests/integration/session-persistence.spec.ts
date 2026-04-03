import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * 集成测试 - 会话持久化
 * 验证 Popup 解锁后，通过 SessionService（chrome.storage.session）持久化会话状态，
 * 重新打开 Popup 时能自动恢复解锁状态，无需再次输入密码。
 */
test.describe("会话持久化 - 解锁后重新打开自动恢复", () => {
  test("Popup 解锁后关闭再打开，应自动恢复已解锁状态", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：在 Popup 中设置密码并解锁
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "SessionPersist1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');

    // 等待进入书签管理界面
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：关闭 Popup
    await popup1.close();

    // 第三步：重新打开 Popup，应自动恢复已解锁状态
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：直接进入书签管理界面，无需再次输入密码
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 验证：不显示解锁输入框
    await expect(
      popup2.locator('input[placeholder="输入密码"]'),
    ).not.toBeVisible();

    await popup2.close();
  });

  test("通过密码验证解锁后关闭再打开，也能自动恢复", async ({
    extensionContext,
    extensionId,
  }) => {
    // 第一步：设置密码
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "VerifyRestore1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：锁定
    await popup1.click(PopupSelectors.lockBtn);
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(popup1.locator('input[placeholder="输入密码"]')).toBeVisible();

    // 第三步：通过密码验证解锁
    await popup1.fill('input[placeholder="输入密码"]', testPassword);
    await popup1.click('button:has-text("解锁")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第四步：关闭并重新打开
    await popup1.close();
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：自动恢复已解锁状态
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await popup2.close();
  });
});

test.describe("会话持久化 - 手动锁定后会话失效", () => {
  test("手动锁定后关闭再打开，应显示解锁界面", async ({
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

    const testPassword = "ManualLock123!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：手动锁定
    await popup1.click(PopupSelectors.lockBtn);
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 第三步：关闭并重新打开
    await popup1.close();
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：显示解锁界面，不会自动恢复
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    // 验证：不显示书签管理界面
    await expect(popup2.locator(".popup-container")).not.toBeVisible();

    await popup2.close();
  });

  test("通过 LOCK 消息锁定后，新 Popup 应显示解锁界面", async ({
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

    const testPassword = "MsgLockTest1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：通过 background 消息锁定
    await popup1.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "LOCK" }, (response) => {
          resolve(response);
        });
      });
    });

    // 等待锁定生效
    await popup1.waitForTimeout(500);

    // 第三步：打开新 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：显示解锁界面
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    await popup1.close();
    await popup2.close();
  });
});

test.describe("会话持久化 - SessionService 状态验证", () => {
  test("解锁后 chrome.storage.session 中会话状态为 unlocked", async ({
    extensionContext,
    extensionId,
  }) => {
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "SessionState1!";
    popup.on("dialog", (dialog) => dialog.accept());

    await popup.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup.click('button:has-text("设置密码")');
    await expect(popup.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 验证 chrome.storage.session 中的会话状态
    const sessionState = await popup.evaluate(async () => {
      const result = await chrome.storage.session.get("session_state");
      return result.session_state;
    });

    expect(sessionState).toBeDefined();
    expect((sessionState as { isLocked: boolean }).isLocked).toBe(false);
    expect(
      (sessionState as { lastActivityTime: number }).lastActivityTime,
    ).toBeGreaterThan(0);
    expect((sessionState as { unlockedAt: number }).unlockedAt).toBeGreaterThan(
      0,
    );

    await popup.close();
  });

  test("锁定后 chrome.storage.session 中会话状态为 locked", async ({
    extensionContext,
    extensionId,
  }) => {
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "LockState1234!";
    popup.on("dialog", (dialog) => dialog.accept());

    await popup.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup.click('button:has-text("设置密码")');
    await expect(popup.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 锁定
    await popup.click(PopupSelectors.lockBtn);
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 等待 SessionService.lock() 异步操作完成
    await popup.waitForTimeout(500);

    // 验证 chrome.storage.session 中的会话状态
    const sessionState = await popup.evaluate(async () => {
      const result = await chrome.storage.session.get("session_state");
      return result.session_state;
    });

    expect(sessionState).toBeDefined();
    expect((sessionState as { isLocked: boolean }).isLocked).toBe(true);

    await popup.close();
  });
});
