import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Popup - 文件夹管理功能测试
 * 覆盖文件夹列表、新建、重命名、删除、右键菜单等功能
 */
test.describe("Popup - 文件夹管理", () => {
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
    await popupPage.fill('input[placeholder="8-32 位字符"]', "FolderTest123!");
    await popupPage.fill('input[placeholder="再次输入密码"]', "FolderTest123!");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(PopupSelectors.popupContainer)).toBeVisible({
      timeout: 10000,
    });
  }

  test("解锁后显示侧边栏和文件夹列表", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证侧边栏结构
    await expect(popupPage.locator(PopupSelectors.popupSidebar)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.sidebarTabs)).toBeVisible();
    await expect(popupPage.locator(PopupSelectors.folderList)).toBeVisible();

    // 默认显示"全部书签"
    await expect(
      popupPage.locator(PopupSelectors.folderItem).first(),
    ).toContainText("全部书签");

    await popupPage.close();
  });

  test('侧边栏 Tab 默认选中"文件夹"', async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 文件夹 Tab 应处于激活状态
    await expect(
      popupPage.locator(PopupSelectors.sidebarTabFolders),
    ).toHaveClass(/active/);

    await popupPage.close();
  });

  test("显示新建文件夹按钮", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 验证新建文件夹按钮
    await expect(
      popupPage.locator(PopupSelectors.folderCreateBtn),
    ).toBeVisible();
    await expect(
      popupPage.locator(PopupSelectors.folderCreateBtn),
    ).toContainText("新建文件夹");

    await popupPage.close();
  });

  test("点击新建文件夹按钮显示输入框", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击新建按钮
    await popupPage.click(PopupSelectors.folderCreateBtn);

    // 应出现行内编辑输入框
    await expect(
      popupPage.locator(PopupSelectors.folderCreateRow),
    ).toBeVisible();
    await expect(
      popupPage.locator(PopupSelectors.inlineEditInput),
    ).toBeVisible();

    await popupPage.close();
  });

  test("新建文件夹输入后按 Enter 确认", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击新建
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await expect(
      popupPage.locator(PopupSelectors.inlineEditInput),
    ).toBeVisible();

    // 输入名称并确认
    await popupPage.fill(PopupSelectors.inlineEditInput, "测试文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");

    // 输入框应消失
    await expect(
      popupPage.locator(PopupSelectors.folderCreateRow),
    ).not.toBeVisible({ timeout: 5000 });

    await popupPage.close();
  });

  test("新建文件夹按 Escape 取消", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击新建
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await expect(
      popupPage.locator(PopupSelectors.inlineEditInput),
    ).toBeVisible();

    // 按 Escape 取消
    await popupPage.press(PopupSelectors.inlineEditInput, "Escape");

    // 输入框应消失，新建按钮重新出现
    await expect(
      popupPage.locator(PopupSelectors.folderCreateRow),
    ).not.toBeVisible({ timeout: 5000 });
    await expect(
      popupPage.locator(PopupSelectors.folderCreateBtn),
    ).toBeVisible();

    await popupPage.close();
  });

  test("点击文件夹项可切换选中状态", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // "全部书签"默认选中
    const allFolder = popupPage.locator(PopupSelectors.folderItem).first();
    await expect(allFolder).toHaveClass(/selected/);

    await popupPage.close();
  });

  test("文件夹项显示书签数量", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // "全部书签"项应显示数量标签
    const allFolder = popupPage.locator(PopupSelectors.folderItem).first();
    await expect(allFolder.locator(PopupSelectors.folderCount)).toBeVisible();

    await popupPage.close();
  });

  test("右键文件夹显示上下文菜单", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先创建一个文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "右键测试文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");

    // 等待文件夹出现
    await popupPage.waitForTimeout(1000);

    // 获取非"全部书签"的文件夹项
    // 列表结构：[全部书签(null), 未分类(uncategorized), 用户新建文件夹...]
    // 需要跳过前两个默认项，右键用户新建的文件夹
    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    if (count > 2) {
      // 右键最后一个文件夹项（用户新建的，跳过"全部书签"和"未分类"）
      await folderItems.last().click({ button: "right" });

      // 上下文菜单应出现
      await expect(popupPage.locator(PopupSelectors.contextMenu)).toBeVisible({
        timeout: 3000,
      });
      await expect(
        popupPage.locator(PopupSelectors.contextMenuRename),
      ).toBeVisible();
      await expect(
        popupPage.locator(PopupSelectors.contextMenuDelete),
      ).toBeVisible();
    }

    await popupPage.close();
  });

  test('右键"全部书签"不显示上下文菜单', async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 右键"全部书签"
    const allFolder = popupPage.locator(PopupSelectors.folderItem).first();
    await allFolder.click({ button: "right" });

    // 上下文菜单不应出现
    await expect(popupPage.locator(PopupSelectors.contextMenu)).not.toBeVisible(
      { timeout: 2000 },
    );

    await popupPage.close();
  });

  test("删除文件夹弹出确认弹窗", async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先创建一个文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "待删除文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");
    await popupPage.waitForTimeout(1000);

    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    if (count > 2) {
      // 右键最后一个文件夹项（用户新建的） → 删除
      await folderItems.last().click({ button: "right" });
      await popupPage.click(PopupSelectors.contextMenuDelete);

      // 确认弹窗应出现
      await expect(popupPage.locator(PopupSelectors.confirmDialog)).toBeVisible(
        { timeout: 3000 },
      );
      await expect(
        popupPage.locator(PopupSelectors.confirmDialogTitle),
      ).toContainText("删除文件夹");

      // 点击取消
      await popupPage.click(PopupSelectors.confirmDialogCancelBtn);
      await expect(
        popupPage.locator(PopupSelectors.confirmDialog),
      ).not.toBeVisible({ timeout: 3000 });
    }

    await popupPage.close();
  });

  test("右键重命名文件夹显示行内编辑", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先创建一个文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "待重命名文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");
    await popupPage.waitForTimeout(1000);

    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    if (count > 2) {
      // 右键最后一个文件夹项（用户新建的） → 重命名
      await folderItems.last().click({ button: "right" });
      await expect(popupPage.locator(PopupSelectors.contextMenu)).toBeVisible({
        timeout: 3000,
      });
      await popupPage.click(PopupSelectors.contextMenuRename);

      // 行内编辑输入框应出现，且包含原名称
      await expect(
        popupPage.locator(PopupSelectors.inlineEditInput),
      ).toBeVisible({ timeout: 3000 });
      await expect(
        popupPage.locator(PopupSelectors.inlineEditInput),
      ).toHaveValue("待重命名文件夹");
    }

    await popupPage.close();
  });

  test("重命名文件夹输入新名称后按 Enter 确认", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先创建一个文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "原始名称");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");
    await popupPage.waitForTimeout(1000);

    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    if (count > 2) {
      // 右键最后一个文件夹项（用户新建的） → 重命名
      await folderItems.last().click({ button: "right" });
      await popupPage.click(PopupSelectors.contextMenuRename);

      // 清空并输入新名称
      await popupPage.fill(PopupSelectors.inlineEditInput, "新名称");
      await popupPage.press(PopupSelectors.inlineEditInput, "Enter");

      // 输入框应消失
      await expect(
        popupPage.locator(PopupSelectors.inlineEditInput),
      ).not.toBeVisible({ timeout: 5000 });

      // 文件夹名应更新为新名称
      await expect(folderItems.last()).toContainText("新名称");
    }

    await popupPage.close();
  });

  test("重命名文件夹按 Escape 取消", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 先创建一个文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill(PopupSelectors.inlineEditInput, "不改名文件夹");
    await popupPage.press(PopupSelectors.inlineEditInput, "Enter");
    await popupPage.waitForTimeout(1000);

    const folderItems = popupPage.locator(PopupSelectors.folderItem);
    const count = await folderItems.count();

    if (count > 2) {
      // 右键最后一个文件夹项（用户新建的） → 重命名
      await folderItems.last().click({ button: "right" });
      await popupPage.click(PopupSelectors.contextMenuRename);

      // 修改名称后按 Escape 取消
      await popupPage.fill(PopupSelectors.inlineEditInput, "被取消的名称");
      await popupPage.press(PopupSelectors.inlineEditInput, "Escape");

      // 输入框应消失
      await expect(
        popupPage.locator(PopupSelectors.inlineEditInput),
      ).not.toBeVisible({ timeout: 5000 });

      // 文件夹名应保持原名称
      await expect(folderItems.last()).toContainText("不改名文件夹");
    }

    await popupPage.close();
  });
});
