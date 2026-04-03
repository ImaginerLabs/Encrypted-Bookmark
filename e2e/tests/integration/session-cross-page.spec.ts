import {
  test,
  expect,
  createPopupPage,
  createOptionsPage,
} from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * 集成测试 - 跨页面会话恢复
 * 验证 Popup 解锁后，Options 导入导出面板能通过 SessionService 自动恢复会话，
 * 无需再次输入密码。
 */
test.describe("跨页面会话恢复 - Popup 解锁后 Options 自动恢复", () => {
  test("Popup 解锁后打开 Options 导入导出面板，应自动显示完整面板", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    // 第一步：在 Popup 中设置密码并解锁
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "CrossPage123!";
    popup.on("dialog", (dialog) => dialog.accept());

    await popup.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup.click('button:has-text("设置密码")');
    await expect(popup.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：打开 Options 页面，切换到导入导出 Tab
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    const importExportTab = optionsPage.locator(
      'button.sidebar-item:has-text("导入导出")',
    );
    if ((await importExportTab.count()) > 0) {
      await importExportTab.first().click();
    }

    // 验证：应自动恢复，显示完整的导入导出面板（包含使用提示）
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 },
    );

    // 验证：不显示解锁表单
    await expect(
      optionsPage.locator('.info-box:has-text("请先登录")'),
    ).not.toBeVisible();

    await popup.close();
    await optionsPage.close();
  });

  test("Popup 锁定后打开 Options 导入导出面板，应显示解锁表单", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    // 第一步：设置密码并解锁
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "LockCross123!";
    popup.on("dialog", (dialog) => dialog.accept());

    await popup.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup.click('button:has-text("设置密码")');
    await expect(popup.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：锁定
    await popup.click('.popup-titlebar-btn[aria-label="锁定"]');
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 第三步：打开 Options 导入导出面板
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    const importExportTab = optionsPage.locator(
      'button.sidebar-item:has-text("导入导出")',
    );
    if ((await importExportTab.count()) > 0) {
      await importExportTab.first().click();
    }

    // 验证：应显示解锁表单
    await expect(
      optionsPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible({ timeout: 10000 });

    await popup.close();
    await optionsPage.close();
  });

  test("Options 导入导出面板解锁后，新 Popup 也能自动恢复", async ({
    extensionContext,
    extensionId,
    optionsUrl,
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

    const testPassword = "OptionsUnlock1!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');
    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：锁定
    await popup1.click('.popup-titlebar-btn[aria-label="锁定"]');
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await popup1.close();

    // 第三步：在 Options 导入导出面板中解锁
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    const importExportTab = optionsPage.locator(
      'button.sidebar-item:has-text("导入导出")',
    );
    if ((await importExportTab.count()) > 0) {
      await importExportTab.first().click();
    }

    await optionsPage.fill('input[placeholder="输入密码"]', testPassword);
    await optionsPage.click('button.btn-primary:has-text("解锁")');

    // 等待解锁成功
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 },
    );

    // 第四步：打开新 Popup，验证也能自动恢复
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 验证：Popup 应自动恢复已解锁状态
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await optionsPage.close();
    await popup2.close();
  });
});

test.describe("跨页面会话恢复 - 会话超时影响所有页面", () => {
  test("会话超时后 Popup 和 Options 都需要重新解锁", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    // 第一步：设置密码并解锁
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "TimeoutAll12!";
    popup.on("dialog", (dialog) => dialog.accept());

    await popup.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup.click('button:has-text("设置密码")');
    await expect(popup.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：模拟超时
    await popup.evaluate(async () => {
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

    await popup.close();

    // 第三步：打开新 Popup，验证需要解锁
    const popup2 = await createPopupPage(extensionContext, extensionId);
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible({
      timeout: 10000,
    });

    // 第四步：打开 Options 导入导出面板，也需要解锁
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    const importExportTab = optionsPage.locator(
      'button.sidebar-item:has-text("导入导出")',
    );
    if ((await importExportTab.count()) > 0) {
      await importExportTab.first().click();
    }

    await expect(
      optionsPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible({ timeout: 10000 });

    await popup2.close();
    await optionsPage.close();
  });
});
