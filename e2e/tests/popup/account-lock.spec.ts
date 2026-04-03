import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 账户锁定机制测试
 * 覆盖多次密码错误后的账户锁定行为
 */
test.describe("Popup - 账户锁定机制", () => {
  test("账户锁定时显示锁定界面", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设锁定状态（锁定 30 秒）
    await storage.setupLockedState(3, 30);
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证显示锁定标题
    await expect(popupPage.locator(PopupSelectors.headerTitle)).toContainText(
      "账户已锁定",
    );

    // 验证显示锁定信息
    await expect(popupPage.locator(PopupSelectors.lockedInfo)).toBeVisible();
  });

  test("锁定界面显示剩余等待时间", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设锁定状态
    await storage.setupLockedState(3, 30);
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证显示剩余时间
    await expect(popupPage.locator(PopupSelectors.lockedTimer)).toContainText(
      "秒后重试",
    );
  });

  test("锁定界面显示失败次数", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设 5 次失败
    await storage.setupLockedState(5, 300);
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证显示失败次数
    await expect(popupPage.locator(PopupSelectors.attemptsInfo)).toContainText(
      "失败次数：5",
    );
  });

  test("锁定界面不显示密码输入框", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    await storage.setupLockedState(3, 30);
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证没有密码输入框
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).not.toBeVisible();
  });

  test("锁定界面不显示解锁按钮", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    await storage.setupLockedState(3, 30);
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 验证没有解锁按钮
    await expect(
      popupPage.locator('button:has-text("解锁")'),
    ).not.toBeVisible();
  });

  test("锁定过期后可以重新尝试", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 预设已过期的锁定状态（锁定时间在过去）
    await storage.set({
      passwordHash: "test-hash",
      passwordStatus: {
        isSet: true,
        failedAttempts: 3,
        lockedUntil: Date.now() - 1000, // 1 秒前已过期
      },
    });

    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 应该显示解锁界面而不是锁定界面
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();
  });
});

/**
 * 锁定阈值测试
 */
test.describe("Popup - 锁定阈值", () => {
  test("2 次错误后不锁定", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

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

    // 应该仍在解锁界面
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.warning)).toContainText(
      "已失败 2 次",
    );
  });

  test("5 次错误后锁定 5 分钟", async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);

    // 模拟 5 次失败的锁定状态
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    await storage.set({
      passwordHash: "test-hash",
      passwordStatus: {
        isSet: true,
        failedAttempts: 5,
        lockedUntil: fiveMinutesFromNow,
      },
    });

    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 应该显示锁定界面
    await expect(popupPage.locator(PopupSelectors.headerTitle)).toContainText(
      "账户已锁定",
    );
    await expect(popupPage.locator(PopupSelectors.attemptsInfo)).toContainText(
      "失败次数：5",
    );
  });

  test("3 次错误后锁定 30 秒", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 先设置密码
    const testPassword = "LockTest12345!";
    popupPage.on("dialog", (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    // 等待进入书签管理界面
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 锁定
    await popupPage.click(PopupSelectors.lockBtn);
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();

    // 输入 3 次错误密码
    for (let i = 0; i < 3; i++) {
      await popupPage.fill('input[placeholder="输入密码"]', "WrongPassword!");
      await popupPage.click('button:has-text("解锁")');

      if (i < 2) {
        // 等待错误提示
        await expect(popupPage.locator(PopupSelectors.error)).toBeVisible({
          timeout: 10000,
        });
        // 等待一下再继续
        await popupPage.waitForTimeout(500);
      }
    }

    // 第 3 次错误后应该进入锁定状态
    await expect(popupPage.locator(PopupSelectors.headerTitle)).toContainText(
      "账户已锁定",
      {
        timeout: 10000,
      },
    );

    await popupPage.close();
  });
});
