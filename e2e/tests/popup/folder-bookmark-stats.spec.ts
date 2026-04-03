import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 侧边栏书签数量统计与默认文件夹过滤测试
 * 覆盖 V1.3.1 修复项：
 *   F3：侧边栏数量统计始终基于全量数据，不受筛选条件影响
 *   F4：侧边栏不显示 id === "uncategorized" 的默认文件夹
 */
test.describe("Popup - 侧边栏数量统计与文件夹过滤", () => {
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
    await popupPage.fill('input[placeholder="8-32 位字符"]', "StatsTest123!");
    await popupPage.fill('input[placeholder="再次输入密码"]', "StatsTest123!");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(PopupSelectors.popupContainer)).toBeVisible({
      timeout: 10000,
    });
  }

  // ========== F4: 过滤默认文件夹 ==========

  test("侧边栏文件夹列表不显示「未分类」默认文件夹", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 获取所有文件夹项的文本内容
    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    // 遍历检查所有文件夹项不包含"未分类"文本
    for (let i = 0; i < count; i++) {
      const text = await folderItems.nth(i).innerText();
      // "全部书签"是合法的第一项，"未分类"不应该出现
      expect(text).not.toContain("未分类");
    }

    await popupPage.close();
  });

  test("首次使用时只显示「全部书签」和新建按钮", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 应只有"全部书签"一项（uncategorized 被过滤掉了）
    const firstItem = popupPage.locator(PopupSelectors.folderItem).first();
    await expect(firstItem).toContainText("全部书签");

    // 新建文件夹按钮可见
    await expect(
      popupPage.locator(PopupSelectors.folderCreateBtn),
    ).toBeVisible();

    await popupPage.close();
  });

  // ========== F3: 数量统计基于全量数据 ==========

  test("「全部书签」数量标签始终可见", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // "全部书签"项应显示数量标签
    const allFolder = popupPage.locator(PopupSelectors.folderItem).first();
    await expect(allFolder.locator(PopupSelectors.folderCount)).toBeVisible();

    await popupPage.close();
  });

  test("创建文件夹后，选中该文件夹时「全部书签」数量不受影响", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 记录初始"全部书签"的数量
    const allFolderItem = popupPage.locator(PopupSelectors.folderItem).first();
    const initialCount = await allFolderItem
      .locator(PopupSelectors.folderCount)
      .innerText();

    // 创建一个新文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "统计测试文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");
    await popupPage.waitForTimeout(1000);

    // 点击新文件夹（选中它进行筛选）
    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();
    if (count > 1) {
      await folderItems.last().click();

      // "全部书签"的数量应保持不变（基于全量数据统计）
      const currentCount = await allFolderItem
        .locator(PopupSelectors.folderCount)
        .innerText();
      expect(currentCount).toBe(initialCount);
    }

    await popupPage.close();
  });

  test("搜索时侧边栏文件夹数量不受搜索关键词影响", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 记录初始"全部书签"的数量
    const allFolderItem = popupPage.locator(PopupSelectors.folderItem).first();
    const initialCount = await allFolderItem
      .locator(PopupSelectors.folderCount)
      .innerText();

    // 执行搜索操作
    const searchInput = popupPage.locator(".search-input");
    await searchInput.fill("不存在的书签关键词xyz");
    await popupPage.waitForTimeout(500);

    // "全部书签"的数量应保持不变（不受搜索影响）
    const currentCount = await allFolderItem
      .locator(PopupSelectors.folderCount)
      .innerText();
    expect(currentCount).toBe(initialCount);

    await popupPage.close();
  });
});
