import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 稍后再读功能测试
 * 覆盖 QuickAddPanel 中的"稍后再读"Toggle 开关
 */
test.describe("Popup - 稍后再读功能", () => {
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
    await popupPage.fill('input[placeholder="8-32 位字符"]', "ReadLater12345");
    await popupPage.fill('input[placeholder="再次输入密码"]', "ReadLater12345");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });
  }

  /** 打开快速添加面板 */
  async function openQuickAddPanel(popupPage: import("@playwright/test").Page) {
    await popupPage.click(PopupSelectors.btnQuickAdd);
    await expect(popupPage.locator(".quick-add-panel")).toBeVisible();
  }

  test("快速添加面板中显示稍后再读开关", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 验证稍后再读区域存在
    await expect(
      popupPage.locator(PopupSelectors.readLaterContainer),
    ).toBeVisible();

    // 验证包含图标和文字
    await expect(popupPage.locator(PopupSelectors.readLaterIcon)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.readLaterText)).toContainText(
      "稍后再读",
    );

    // 验证 Toggle 按钮存在
    await expect(
      popupPage.locator(PopupSelectors.readLaterToggle),
    ).toBeVisible();

    await popupPage.close();
  });

  test("稍后再读开关默认为关闭状态", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 验证 Toggle 不含 active 类名（默认关闭）
    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toHaveClass(/active/);

    await popupPage.close();
  });

  test("点击开关可切换稍后再读状态", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);

    // 初始为关闭状态
    await expect(toggle).not.toHaveClass(/active/);

    // 点击开启
    await toggle.click();
    await expect(toggle).toHaveClass(/active/);

    // 再次点击关闭
    await toggle.click();
    await expect(toggle).not.toHaveClass(/active/);

    await popupPage.close();
  });

  test("稍后再读开关位于备注字段下方、操作按钮上方", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 验证 DOM 顺序：备注字段 → 稍后再读 → 操作按钮
    const noteField = popupPage.locator("#qa-note");
    const readLaterContainer = popupPage.locator(
      PopupSelectors.readLaterContainer,
    );
    const actionsArea = popupPage.locator(".quick-add-actions");

    await expect(noteField).toBeVisible();
    await expect(readLaterContainer).toBeVisible();
    await expect(actionsArea).toBeVisible();

    // 通过 Y 坐标确认顺序
    const noteBox = await noteField.boundingBox();
    const readLaterBox = await readLaterContainer.boundingBox();
    const actionsBox = await actionsArea.boundingBox();

    expect(noteBox).toBeTruthy();
    expect(readLaterBox).toBeTruthy();
    expect(actionsBox).toBeTruthy();

    // 备注在稍后再读上方
    expect(noteBox!.y).toBeLessThan(readLaterBox!.y);
    // 稍后再读在操作按钮上方
    expect(readLaterBox!.y).toBeLessThan(actionsBox!.y);

    await popupPage.close();
  });

  test("关闭面板后重新打开，开关恢复为关闭状态", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 开启稍后再读
    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);
    await toggle.click();
    await expect(toggle).toHaveClass(/active/);

    // 关闭面板
    await popupPage.click(".quick-add-btn-cancel");
    await expect(popupPage.locator(".quick-add-panel")).not.toBeVisible();

    // 重新打开面板
    await openQuickAddPanel(popupPage);

    // 验证开关已重置为关闭
    const toggleAfter = popupPage.locator(PopupSelectors.readLaterToggle);
    await expect(toggleAfter).not.toHaveClass(/active/);

    await popupPage.close();
  });

  test("开关具有正确的 aria-label 属性", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);
    await expect(toggle).toHaveAttribute("aria-label", "标记为稍后再读");

    await popupPage.close();
  });
});
