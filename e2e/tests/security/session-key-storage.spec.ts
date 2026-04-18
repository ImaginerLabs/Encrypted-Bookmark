import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * 安全测试 - sessionStorage 不应存储明文 masterKey
 * 验证主密钥只存储在 chrome.storage.session 中，而非 sessionStorage
 */
test.describe("安全 - 主密钥存储", () => {
  test.beforeEach(async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await storage.setupPasswordSet();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    // 等待加载完成
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("解锁后 sessionStorage 中不应包含明文 masterKey", async ({
    popupPage,
  }) => {
    // 执行解锁操作
    await popupPage.fill('input[placeholder="输入密码"]', "TestPassword123");
    await popupPage.click('button:has-text("解锁")');

    // 等待解锁完成
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证 sessionStorage 中不包含 masterKey
    const sessionStorageKeys = await popupPage.evaluate(() =>
      Object.keys(sessionStorage),
    );
    expect(sessionStorageKeys).not.toContain("masterKey");
  });

  test("锁定后 sessionStorage 中不应包含明文 masterKey", async ({
    popupPage,
  }) => {
    // 解锁
    await popupPage.fill('input[placeholder="输入密码"]', "TestPassword123");
    await popupPage.click('button:has-text("解锁")');
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 锁定
    await popupPage.click('button:has-text("锁定")');
    await popupPage.waitForLoadState("domcontentloaded");

    // 验证 sessionStorage 中不包含 masterKey
    const sessionStorageKeys = await popupPage.evaluate(() =>
      Object.keys(sessionStorage),
    );
    expect(sessionStorageKeys).not.toContain("masterKey");
  });
});