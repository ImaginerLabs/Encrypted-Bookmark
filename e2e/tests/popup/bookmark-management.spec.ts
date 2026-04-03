import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 书签管理界面测试
 * 覆盖解锁后的书签管理功能（Popup.tsx）
 */
test.describe("Popup - 书签管理界面", () => {
  /** 设置密码并解锁 */
  async function setupUnlocked(popupPage: import("@playwright/test").Page) {
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    popupPage.on("dialog", (dialog) => dialog.accept());
    await popupPage.fill(
      'input[placeholder="8-32 位字符"]',
      "BookmarkTest123!",
    );
    await popupPage.fill(
      'input[placeholder="再次输入密码"]',
      "BookmarkTest123!",
    );
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });
  }

  test("解锁后显示书签管理界面", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证主容器结构
    await expect(popupPage.locator(".popup-container")).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.popupTitlebar)).toBeVisible();
    await expect(popupPage.locator(".popup-body")).toBeVisible();
    await expect(popupPage.locator(".popup-footer")).toBeVisible();

    await popupPage.close();
  });

  test("显示搜索框", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证搜索框
    await expect(popupPage.locator(".search-input")).toBeVisible();
    await expect(popupPage.locator(".search-input")).toHaveAttribute(
      "placeholder",
      "搜索书签...",
    );

    await popupPage.close();
  });

  test("显示快速添加按钮", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await expect(popupPage.locator(".btn-quick-add")).toBeVisible();
    await expect(popupPage.locator(".btn-quick-add")).toHaveText("+");

    await popupPage.close();
  });

  test("无书签时显示空状态", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证空状态（没有书签数据）
    await expect(popupPage.locator(".popup-body")).toContainText("暂无书签", {
      timeout: 5000,
    });

    await popupPage.close();
  });

  test("底部状态栏显示书签数量", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证书签计数
    await expect(popupPage.locator(".bookmark-count")).toBeVisible();

    await popupPage.close();
  });

  test("底部显示锁定按钮", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await expect(popupPage.locator(PopupSelectors.lockBtn)).toBeVisible();

    await popupPage.close();
  });

  test("显示文件夹列表区域", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证文件夹列表容器存在
    await expect(popupPage.locator(".popup-body")).toBeVisible();

    await popupPage.close();
  });

  test("搜索框输入后可清空", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    const searchInput = popupPage.locator(".search-input");
    await searchInput.fill("test query");

    // 清空按钮应出现
    const clearBtn = popupPage.locator(".clear-btn");
    await expect(clearBtn).toBeVisible();

    // 点击清空
    await clearBtn.click();
    await expect(searchInput).toHaveValue("");

    await popupPage.close();
  });

  test("点击锁定按钮重新加载页面", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click(PopupSelectors.lockBtn);
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 应回到解锁界面
    await expect(
      popupPage.locator('input[placeholder="输入密码"]'),
    ).toBeVisible();

    await popupPage.close();
  });
});
