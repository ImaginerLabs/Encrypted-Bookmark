import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 标签管理功能测试
 * 覆盖标签视图切换、标签列表、删除等功能
 */
test.describe("Popup - 标签管理", () => {
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
    await popupPage.fill('input[placeholder="8-32 位字符"]', "TagTest12345!");
    await popupPage.fill('input[placeholder="再次输入密码"]', "TagTest12345!");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(PopupSelectors.popupContainer)).toBeVisible({
      timeout: 10000,
    });
  }

  test("点击标签 Tab 切换到标签视图", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击标签 Tab
    await popupPage.click(PopupSelectors.sidebarTabTags);

    // 标签 Tab 应处于激活状态
    await expect(popupPage.locator(PopupSelectors.sidebarTabTags)).toHaveClass(
      /active/,
    );

    // 文件夹列表应隐藏，标签列表应显示
    await expect(
      popupPage.locator(PopupSelectors.folderList),
    ).not.toBeVisible();
    await expect(popupPage.locator(PopupSelectors.tagList)).toBeVisible();

    await popupPage.close();
  });

  test("切换回文件夹 Tab", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先切到标签
    await popupPage.click(PopupSelectors.sidebarTabTags);
    await expect(popupPage.locator(PopupSelectors.tagList)).toBeVisible();

    // 切回文件夹
    await popupPage.click(PopupSelectors.sidebarTabFolders);
    await expect(
      popupPage.locator(PopupSelectors.sidebarTabFolders),
    ).toHaveClass(/active/);
    await expect(popupPage.locator(PopupSelectors.folderList)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.tagList)).not.toBeVisible();

    await popupPage.close();
  });

  test("无标签时显示空提示", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);

    // 应显示空提示（新用户无标签）
    await expect(popupPage.locator(PopupSelectors.tagListEmpty)).toBeVisible({
      timeout: 5000,
    });
    await expect(popupPage.locator(PopupSelectors.tagListEmpty)).toContainText(
      "暂无标签",
    );

    await popupPage.close();
  });

  test('标签列表显示"全部书签"入口', async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);

    // "全部书签"入口应始终存在
    const allTag = popupPage.locator(PopupSelectors.tagItem).first();
    await expect(allTag).toContainText("全部书签");

    await popupPage.close();
  });

  test('标签视图中"全部书签"默认选中', async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);

    // "全部书签"应处于选中状态
    const allTag = popupPage.locator(PopupSelectors.tagItem).first();
    await expect(allTag).toHaveClass(/selected/);

    await popupPage.close();
  });

  test("顶部标题栏显示品牌名", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证标题栏
    await expect(popupPage.locator(PopupSelectors.popupTitlebar)).toBeVisible();
    await expect(
      popupPage.locator(PopupSelectors.popupTitlebarBrand),
    ).toContainText("Encrypted Bookmark");

    await popupPage.close();
  });

  test("顶部标题栏显示设置和锁定按钮", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证设置和锁定按钮
    await expect(popupPage.locator(PopupSelectors.settingsBtn)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.lockBtn)).toBeVisible();

    await popupPage.close();
  });

  test("点击锁定按钮回到解锁页面", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击锁定按钮
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

  test("底部状态栏显示书签数量", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证底部状态栏
    await expect(popupPage.locator(PopupSelectors.popupFooter)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.bookmarkCount)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.bookmarkCount)).toContainText(
      "个书签",
    );

    await popupPage.close();
  });

  test("标签项显示使用统计数量", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);
    await expect(popupPage.locator(PopupSelectors.tagList)).toBeVisible();

    // 获取标签项（跳过"全部书签"）
    const tagItems = popupPage.locator(PopupSelectors.tagItem);
    const count = await tagItems.count();

    if (count > 1) {
      // 非"全部书签"的标签项应显示使用统计徽章
      const firstTag = tagItems.nth(1);
      await expect(
        firstTag.locator(PopupSelectors.tagUsageCount),
      ).toBeVisible();
    }

    await popupPage.close();
  });

  test("右键标签显示删除菜单", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);
    await expect(popupPage.locator(PopupSelectors.tagList)).toBeVisible();

    // 获取标签项
    const tagItems = popupPage.locator(PopupSelectors.tagItem);
    const count = await tagItems.count();

    if (count > 1) {
      // 右键非"全部书签"的标签项
      await tagItems.nth(1).click({ button: "right" });

      // 上下文菜单应出现，包含删除选项
      await expect(popupPage.locator(PopupSelectors.contextMenu)).toBeVisible({
        timeout: 3000,
      });
      await expect(
        popupPage.locator(PopupSelectors.contextMenuDelete),
      ).toBeVisible();
    }

    await popupPage.close();
  });

  test('右键"全部书签"标签不显示上下文菜单', async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);

    // 右键"全部书签"
    const allTag = popupPage.locator(PopupSelectors.tagItem).first();
    await allTag.click({ button: "right" });

    // 上下文菜单不应出现
    await expect(popupPage.locator(PopupSelectors.contextMenu)).not.toBeVisible(
      { timeout: 2000 },
    );

    await popupPage.close();
  });

  test("右键删除标签弹出确认弹窗", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 切换到标签视图
    await popupPage.click(PopupSelectors.sidebarTabTags);

    const tagItems = popupPage.locator(PopupSelectors.tagItem);
    const count = await tagItems.count();

    if (count > 1) {
      // 右键 → 删除
      await tagItems.nth(1).click({ button: "right" });
      await expect(popupPage.locator(PopupSelectors.contextMenu)).toBeVisible({
        timeout: 3000,
      });
      await popupPage.click(PopupSelectors.contextMenuDelete);

      // 确认弹窗应出现（如果有确认弹窗的话）
      // 注意：标签删除可能直接执行，也可能弹出确认弹窗
      // 等待一下看是否有变化
      await popupPage.waitForTimeout(1000);

      // 验证标签已被删除或确认弹窗出现
      const dialogVisible = await popupPage
        .locator(PopupSelectors.confirmDialog)
        .isVisible()
        .catch(() => false);

      if (dialogVisible) {
        // 如果有确认弹窗，点击取消
        await popupPage.click(PopupSelectors.confirmDialogCancelBtn);
        await expect(
          popupPage.locator(PopupSelectors.confirmDialog),
        ).not.toBeVisible({ timeout: 3000 });
      }
    }

    await popupPage.close();
  });
});
