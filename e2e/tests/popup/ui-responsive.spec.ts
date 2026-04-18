import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * Popup - UI 响应式适配测试
 * 覆盖小窗口尺寸下的布局适配
 */
test.describe("Popup - UI 响应式适配", () => {
  test.beforeEach(async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await storage.setupPasswordSet();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("小窗口尺寸下 popup 容器不应溢出", async ({ popupPage }) => {
    // 设置小窗口尺寸
    await popupPage.setViewportSize({ width: 375, height: 500 });

    // 验证 popup 容器可见
    const container = popupPage.locator(".popup-container");
    await expect(container).toBeVisible();

    // 验证容器宽度不超过视口
    const containerBox = await container.boundingBox();
    expect(containerBox.width).toBeLessThanOrEqual(375);

    // 验证容器高度不超过视口
    expect(containerBox.height).toBeLessThanOrEqual(500);

    // 验证内容可见（滚动区域）
    const body = popupPage.locator(".popup-body");
    await expect(body).toBeVisible();
  });

  test("极小窗口尺寸下最小宽高约束生效", async ({ popupPage }) => {
    // 设置极小窗口尺寸
    await popupPage.setViewportSize({ width: 320, height: 400 });

    // 验证 popup 容器可见
    const container = popupPage.locator(".popup-container");
    await expect(container).toBeVisible();

    // 验证最小宽度约束（容器宽度应 >= 320px）
    const containerBox = await container.boundingBox();
    expect(containerBox.width).toBeGreaterThanOrEqual(320);
  });

  test("Toast 始终可见于 QuickAddPanel 之上", async ({ popupPage }) => {
    // 解锁并打开快速添加面板
    await popupPage.fill('input[placeholder="输入密码"]', "TestPassword123");
    await popupPage.click('button:has-text("解锁")');
    await popupPage.waitForSelector(".popup-container", { state: "visible" });

    // 打开快速添加面板
    await popupPage.click(".btn-quick-add");
    await expect(popupPage.locator(".quick-add-panel")).toBeVisible();

    // 触发 toast（通过保存操作）
    await popupPage.fill("#qa-title", "Test Bookmark");
    await popupPage.fill("#qa-url", "https://example.com");
    await popupPage.click(".quick-add-btn-save");

    // 验证 toast 显示
    const toast = popupPage.locator(".toast");
    await expect(toast).toHaveClass(/show/);

    // 验证 toast z-index 高于 quick-add-panel
    // toast: 10000, quick-add-panel: 999
    const toastZIndex = await toast.evaluate(
      (el) => window.getComputedStyle(el).zIndex,
    );
    const panelZIndex = await popupPage
      .locator(".quick-add-panel")
      .evaluate((el) => window.getComputedStyle(el).zIndex);

    expect(parseInt(toastZIndex)).toBeGreaterThan(parseInt(panelZIndex));
  });

  test("无效 URL 显示降级文案", async ({ popupPage }) => {
    // 解锁
    await popupPage.fill('input[placeholder="输入密码"]', "TestPassword123");
    await popupPage.click('button:has-text("解锁")');
    await popupPage.waitForSelector(".popup-container", { state: "visible" });

    // 添加一个书签（通过直接操作 storage 模拟无效 URL）
    const storage = createStorageHelper(popupPage);
    await storage.addBookmark({
      id: "test-invalid-url",
      url: "not-a-valid-url",
      title: "Test Invalid URL",
      createTime: Date.now(),
      updateTime: Date.now(),
    });

    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 查找无效 URL 的书签项
    const bookmarkItem = popupPage.locator(".bookmark-item").filter({
      hasText: "Test Invalid URL",
    });
    await expect(bookmarkItem).toBeVisible();

    // 验证 URL 显示为 "链接不可用"
    const urlElement = bookmarkItem.locator(".bookmark-url");
    await expect(urlElement).toContainText("链接不可用");
  });
});
