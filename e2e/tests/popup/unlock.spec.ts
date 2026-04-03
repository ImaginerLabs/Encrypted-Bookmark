import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 解锁测试
 * 覆盖密码验证和解锁流程
 */
test.describe("Popup - 解锁流程", () => {
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

  test("密码已设置时显示解锁界面", async ({ popupPage }) => {
    // 验证显示解锁提示
    await expect(
      popupPage.locator(PopupSelectors.headerSubtitle),
    ).toContainText("请输入主密码");

    // 验证密码输入框存在
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();

    // 验证解锁按钮存在
    await expect(popupPage.locator('button:has-text("解锁")')).toBeVisible();
  });

  test("输入错误密码显示错误提示", async ({ popupPage }) => {
    // 输入错误密码
    await popupPage.fill('input[placeholder="输入密码"]', "WrongPassword123");
    await popupPage.click('button:has-text("解锁")');

    // 验证错误提示
    await expect(popupPage.locator(PopupSelectors.error)).toBeVisible({
      timeout: 10000,
    });
    await expect(popupPage.locator(PopupSelectors.error)).toContainText(
      "密码错误",
    );
  });

  test("错误密码后显示剩余尝试次数", async ({ popupPage }) => {
    // 输入错误密码
    await popupPage.fill('input[placeholder="输入密码"]', "WrongPassword123");
    await popupPage.click('button:has-text("解锁")');

    // 验证显示剩余次数
    await expect(popupPage.locator(PopupSelectors.error)).toContainText(
      "剩余尝试次数",
      {
        timeout: 10000,
      },
    );
  });

  test("显示失败次数警告", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设已有失败记录
    await storage.set({
      passwordHash: "test-hash",
      passwordStatus: {
        isSet: true,
        failedAttempts: 2,
        lockedUntil: 0,
      },
    });

    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证显示失败次数警告
    await expect(popupPage.locator(PopupSelectors.warning)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.warning)).toContainText(
      "已失败 2 次",
    );
  });

  test("失败 3 次后显示锁定风险警告", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设 3 次失败
    await storage.set({
      passwordHash: "test-hash",
      passwordStatus: {
        isSet: true,
        failedAttempts: 3,
        lockedUntil: 0,
      },
    });

    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证显示锁定风险警告
    await expect(popupPage.locator(PopupSelectors.warning)).toContainText(
      "锁定风险",
    );
  });

  test("密码输入框有正确的属性", async ({ popupPage }) => {
    const input = popupPage.locator('input[placeholder="输入密码"]');

    await expect(input).toHaveAttribute("type", "password");
  });
});

/**
 * 解锁成功测试
 * 需要真实的密码验证逻辑
 */
test.describe("Popup - 解锁成功", () => {
  test("通过 UI 设置密码后能成功解锁", async ({
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

    const testPassword = "ValidPassword123!";

    // 第一步：设置密码
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    // 等待进入书签管理界面
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 第二步：锁定
    await popupPage.click(PopupSelectors.lockBtn);

    // 等待页面重新加载后回到解锁界面
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(
      popupPage.locator(PopupSelectors.headerSubtitle),
    ).toContainText("请输入主密码", {
      timeout: 5000,
    });

    // 第三步：使用相同密码解锁
    await popupPage.fill('input[placeholder="输入密码"]', testPassword);
    await popupPage.click('button:has-text("解锁")');

    // 验证成功解锁，进入书签管理界面
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    await popupPage.close();
  });
});
