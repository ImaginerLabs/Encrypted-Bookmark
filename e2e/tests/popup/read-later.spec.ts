import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 稍后再读功能测试
 * 覆盖 V1.3.1 QuickAddPanel 中的"稍后再读"Toggle 开关
 * 覆盖 V1.4.0 侧边栏"稍后再读"虚拟文件夹、互斥逻辑、统计排除、状态栏等
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

  // ========== V1.3.1: QuickAddPanel 稍后再读开关 ==========

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

  // ========== V1.4.0 F1: 侧边栏"稍后再读"虚拟文件夹 ==========

  test("侧边栏显示「🕐 稍后再读」入口", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证"稍后再读"文件夹入口存在
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);
    await expect(readLaterFolder).toBeVisible();
    await expect(readLaterFolder).toContainText("稍后再读");

    await popupPage.close();
  });

  test("「稍后再读」位于「全部书签」下方", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    const allBookmarks = popupPage.locator(PopupSelectors.folderItem).first();
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);

    const allBox = await allBookmarks.boundingBox();
    const readLaterBox = await readLaterFolder.boundingBox();

    expect(allBox).toBeTruthy();
    expect(readLaterBox).toBeTruthy();
    expect(allBox!.y).toBeLessThan(readLaterBox!.y);

    await popupPage.close();
  });

  test("「稍后再读」与用户文件夹之间有分隔线", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证分隔线存在
    const divider = popupPage.locator(PopupSelectors.folderListDivider);
    await expect(divider).toBeVisible();

    await popupPage.close();
  });

  test("「稍后再读」不可右键操作", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 在"稍后再读"上右键
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);
    await readLaterFolder.click({ button: "right" });

    // 验证右键菜单不出现
    await expect(
      popupPage.locator(PopupSelectors.contextMenu),
    ).not.toBeVisible();

    await popupPage.close();
  });

  test("点击「稍后再读」切换选中状态", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击"稍后再读"
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);
    await readLaterFolder.click();

    // 验证"稍后再读"被选中
    await expect(readLaterFolder).toHaveClass(/selected/);

    // 验证"全部书签"取消选中
    const allBookmarks = popupPage.locator(PopupSelectors.folderItem).first();
    await expect(allBookmarks).not.toHaveClass(/selected/);

    await popupPage.close();
  });

  test("点击「全部书签」后「稍后再读」取消选中", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先选中"稍后再读"
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);
    await readLaterFolder.click();
    await expect(readLaterFolder).toHaveClass(/selected/);

    // 点击"全部书签"
    const allBookmarks = popupPage.locator(PopupSelectors.folderItem).first();
    await allBookmarks.click();

    // 验证"稍后再读"取消选中
    await expect(readLaterFolder).not.toHaveClass(/selected/);
    await expect(allBookmarks).toHaveClass(/selected/);

    await popupPage.close();
  });

  // ========== V1.4.0 F4: 互斥逻辑 ==========

  test("开启稍后再读后文件夹选择器隐藏", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 文件夹选择器默认可见
    await expect(popupPage.locator("#qa-folder")).toBeVisible();

    // 开启稍后再读
    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);
    await toggle.click();

    // 文件夹选择器隐藏
    await expect(popupPage.locator("#qa-folder")).not.toBeVisible();

    await popupPage.close();
  });

  test("关闭稍后再读后文件夹选择器恢复", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 开启稍后再读
    const toggle = popupPage.locator(PopupSelectors.readLaterToggle);
    await toggle.click();
    await expect(popupPage.locator("#qa-folder")).not.toBeVisible();

    // 关闭稍后再读
    await toggle.click();

    // 文件夹选择器恢复
    await expect(popupPage.locator("#qa-folder")).toBeVisible();

    await popupPage.close();
  });

  // ========== V1.4.0 F8: 底部状态栏上下文感知 ==========

  test("选中「稍后再读」时底部显示待读书签文案", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击"稍后再读"
    const readLaterFolder = popupPage.locator(PopupSelectors.readLaterFolder);
    await readLaterFolder.click();

    // 验证底部状态栏文案
    const footer = popupPage.locator(PopupSelectors.bookmarkCount);
    await expect(footer).toContainText("个待读书签");

    await popupPage.close();
  });

  test("选中「全部书签」时底部显示普通书签文案", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 确保在"全部书签"状态
    const allBookmarks = popupPage.locator(PopupSelectors.folderItem).first();
    await allBookmarks.click();

    // 验证底部状态栏文案
    const footer = popupPage.locator(PopupSelectors.bookmarkCount);
    await expect(footer).toContainText("个书签");
    // 确保不是"待读"文案
    const text = await footer.innerText();
    expect(text).not.toContain("待读");

    await popupPage.close();
  });

  // ========== V1.4.0 F6: QuickAddPanel 文件夹列表去重 ==========

  test("添加书签面板文件夹列表中只有一个「未分类」", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);
    await openQuickAddPanel(popupPage);

    // 获取所有 option 的文本
    const options = popupPage.locator("#qa-folder option");
    const count = await options.count();
    let uncategorizedCount = 0;
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).innerText();
      if (text.includes("未分类")) {
        uncategorizedCount++;
      }
    }

    // 只应有一个"未分类"
    expect(uncategorizedCount).toBe(1);

    await popupPage.close();
  });
});
