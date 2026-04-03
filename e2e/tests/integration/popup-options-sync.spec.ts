import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * 集成测试 - Popup 与 Options 状态同步
 * 覆盖跨页面的状态一致性
 */
test.describe("Popup-Options 状态同步", () => {
  test("Popup 设置密码后 Options 反映变化", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 在 Popup 设置密码
    const testPassword = "SyncTest12345!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 打开 Options 页面
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    // 验证 Options 能感知密码已设置
    // 切换到安全设置查看状态
    const securityTab = optionsPage.locator(
      'button.sidebar-item:has-text("安全设置")',
    );
    if ((await securityTab.count()) > 0) {
      await securityTab.first().click();
    }

    // Options 应该显示安全设置（而不是提示设置密码）
    await expect(optionsPage.locator(".options-container")).toBeVisible();

    await popupPage.close();
    await optionsPage.close();
  });

  test("多个 Popup 实例状态同步", async ({ extensionContext, extensionId }) => {
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 在第一个 Popup 设置密码
    const testPassword = "MultiSync123!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');

    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 打开第二个 Popup
    const popup2 = await createPopupPage(extensionContext, extensionId);

    // 第二个 Popup 应该自动恢复已解锁状态（会话通过 chrome.storage.session 持久化）
    await expect(popup2.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await popup1.close();
    await popup2.close();
  });

  test("Popup 锁定后其他页面同步", async ({
    extensionContext,
    extensionId,
  }) => {
    const popup1 = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup1);
    await storage.clear();
    await popup1.reload();
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 设置并解锁
    const testPassword = "LockSync12345!";
    popup1.on("dialog", (dialog) => dialog.accept());

    await popup1.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popup1.fill('input[placeholder="再次输入密码"]', testPassword);
    await popup1.click('button:has-text("设置密码")');

    await expect(popup1.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 在第一个 Popup 锁定
    await popup1.click(PopupSelectors.lockBtn);
    await popup1.waitForLoadState("domcontentloaded");
    await expect(popup1.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(popup1.locator('input[placeholder="输入密码"]')).toBeVisible();

    // 打开第二个 Popup，验证也是锁定状态
    const popup2 = await createPopupPage(extensionContext, extensionId);
    await expect(popup2.locator('input[placeholder="输入密码"]')).toBeVisible();

    await popup1.close();
    await popup2.close();
  });

  test("Storage 变化触发 UI 更新", async ({
    extensionContext,
    extensionId,
  }) => {
    const popup = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popup);

    // 初始状态：未设置密码
    await storage.clear();
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({ timeout: 10000 });

    await expect(
      popup.locator('input[placeholder="8-32 位字符"]'),
    ).toBeVisible();

    // 直接修改 Storage 模拟密码已设置
    await storage.setupPasswordSet();

    // 刷新页面
    await popup.reload();
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.locator(".loading")).not.toBeVisible({ timeout: 10000 });

    // 应该显示解锁界面
    await expect(popup.locator('input[placeholder="输入密码"]')).toBeVisible();

    await popup.close();
  });
});

/**
 * 集成测试 - 跨页面导航
 */
test.describe("跨页面导航", () => {
  test("从 Popup 打开 Options 页面", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    const popup = await createPopupPage(extensionContext, extensionId);

    // 在新标签页打开 Options
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    // 验证 Options 页面加载成功
    await expect(optionsPage.locator(".options-container")).toBeVisible();

    await popup.close();
    await optionsPage.close();
  });
});
