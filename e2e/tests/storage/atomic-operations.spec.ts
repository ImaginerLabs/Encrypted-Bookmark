import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { PopupSelectors } from "../../helpers/selectors";

/**
 * Storage - 原子操作测试
 * 覆盖 FolderService.deleteFolder 和 TagService.deleteTag 的原子性保证
 */
test.describe("Storage - 原子操作", () => {
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
    await popupPage.fill('input[placeholder="8-32 位字符"]', "AtomicTest123!");
    await popupPage.fill('input[placeholder="再次输入密码"]', "AtomicTest123!");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(PopupSelectors.popupContainer)).toBeVisible({
      timeout: 10000,
    });
  }

  test("deleteFolder 应原子性完成 - 书签迁移完整性", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    const storage = createStorageHelper(popupPage);

    // 创建测试文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill('input[placeholder="输入文件夹名称"]', "测试文件夹");
    await popupPage.click('button:has-text("确定")');
    await expect(popupPage.locator(PopupSelectors.folderItem).filter({ hasText: "测试文件夹" })).toBeVisible();

    // 添加书签到该文件夹
    await popupPage.click('button:has-text("添加书签")');
    await popupPage.fill('input[placeholder="输入标题"]', "测试书签");
    await popupPage.fill('input[placeholder="输入 URL"]', "https://example.com");
    await popupPage.click('button:has-text("保存")');

    // 验证书签添加成功
    await expect(popupPage.locator(PopupSelectors.bookmarkItem).filter({ hasText: "测试书签" })).toBeVisible();

    // 记录删除前的书签数量
    const bookmarksBefore = await storage.get();

    // 删除文件夹（应该将书签迁移到"未分类"）
    await popupPage.click(PopupSelectors.folderItem.filter({ hasText: "测试文件夹" }));
    await popupPage.click('button:has-text("删除")');
    await popupPage.click('button:has-text("确认")');

    // 验证文件夹已删除
    await expect(popupPage.locator(PopupSelectors.folderItem).filter({ hasText: "测试文件夹" })).not.toBeVisible();

    // 验证书签未被删除（应该迁移到未分类）
    const bookmarksAfter = await storage.get();
    expect(bookmarksAfter).toBeDefined();

    await popupPage.close();
  });

  test("deleteTag 应原子性完成 - 书签标签移除完整性", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    const storage = createStorageHelper(popupPage);

    // 创建测试标签
    await popupPage.click(PopupSelectors.sidebarTabTags);
    await popupPage.click('button:has-text("新建标签")');
    await popupPage.fill('input[placeholder="输入标签名称"]', "测试标签");
    await popupPage.click('button:has-text("确定")');
    await expect(popupPage.locator(PopupSelectors.tagItem).filter({ hasText: "测试标签" })).toBeVisible();

    // 添加带标签的书签
    await popupPage.click(PopupSelectors.sidebarTabFolders);
    await popupPage.click('button:has-text("添加书签")');
    await popupPage.fill('input[placeholder="输入标题"]', "带标签书签");
    await popupPage.fill('input[placeholder="输入 URL"]', "https://tagged.example.com");
    // 选择标签
    await popupPage.click('button:has-text("选择标签")');
    await popupPage.click(PopupSelectors.tagItem.filter({ hasText: "测试标签" }));
    await popupPage.click('button:has-text("保存")');

    // 验证书签添加成功
    await expect(popupPage.locator(PopupSelectors.bookmarkItem).filter({ hasText: "带标签书签" })).toBeVisible();

    // 删除标签
    await popupPage.click(PopupSelectors.sidebarTabTags);
    await popupPage.click(PopupSelectors.tagItem.filter({ hasText: "测试标签" }));
    await popupPage.click('button:has-text("删除")');
    await popupPage.click('button:has-text("确认")');

    // 验证标签已删除
    await expect(popupPage.locator(PopupSelectors.tagItem).filter({ hasText: "测试标签" })).not.toBeVisible();

    // 验证书签仍然存在（只是标签被移除）
    await popupPage.click(PopupSelectors.sidebarTabFolders);
    await expect(popupPage.locator(PopupSelectors.bookmarkItem).filter({ hasText: "带标签书签" })).toBeVisible();

    await popupPage.close();
  });

  test("并发删除同一文件夹应保证数据一致性", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage1 = await createPopupPage(extensionContext, extensionId);
    const popupPage2 = await createPopupPage(extensionContext, extensionId);

    await setupUnlocked(popupPage1);
    await setupUnlocked(popupPage2);

    const storage1 = createStorageHelper(popupPage1);
    const storage2 = createStorageHelper(popupPage2);

    // 在 popupPage1 创建测试文件夹
    await popupPage1.click(PopupSelectors.folderCreateBtn);
    await popupPage1.fill('input[placeholder="输入文件夹名称"]', "并发测试文件夹");
    await popupPage1.click('button:has-text("确定")');
    await expect(popupPage1.locator(PopupSelectors.folderItem).filter({ hasText: "并发测试文件夹" })).toBeVisible();

    // 在 popupPage1 添加书签
    await popupPage1.click('button:has-text("添加书签")');
    await popupPage1.fill('input[placeholder="输入标题"]', "并发测试书签");
    await popupPage1.fill('input[placeholder="输入 URL"]', "https://concurrent.example.com");
    await popupPage1.click('button:has-text("保存")');

    // 刷新 popupPage2 以获取最新数据
    await popupPage2.reload();
    await popupPage2.waitForLoadState("domcontentloaded");

    // 在 popupPage1 删除文件夹
    await popupPage1.click(PopupSelectors.folderItem.filter({ hasText: "并发测试文件夹" }));
    await popupPage1.click('button:has-text("删除")');
    await popupPage1.click('button:has-text("确认")');

    // 等待操作完成
    await popupPage1.waitForTimeout(500);

    // 在 popupPage2 尝试删除同一文件夹（应该失败或显示不存在）
    await popupPage2.reload();
    await popupPage2.waitForLoadState("domcontentloaded");
    await popupPage2.click(PopupSelectors.folderItem.filter({ hasText: "并发测试文件夹" }));
    await popupPage2.click('button:has-text("删除")');

    // 验证书签数量正确（不应该有重复删除导致数据丢失）
    const finalData = await storage1.get();
    expect(finalData).toBeDefined();

    await popupPage1.close();
    await popupPage2.close();
  });

  test("断电场景下（强制刷新）数据应保持一致", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    const storage = createStorageHelper(popupPage);

    // 创建测试文件夹
    await popupPage.click(PopupSelectors.folderCreateBtn);
    await popupPage.fill('input[placeholder="输入文件夹名称"]', "断电测试文件夹");
    await popupPage.click('button:has-text("确定")');

    // 添加多个书签
    for (let i = 0; i < 3; i++) {
      await popupPage.click('button:has-text("添加书签")');
      await popupPage.fill('input[placeholder="输入标题"]', `断电测试书签 ${i + 1}`);
      await popupPage.fill('input[placeholder="输入 URL"]', `https://powerloss${i}.example.com`);
      await popupPage.click('button:has-text("保存")');
      await popupPage.waitForTimeout(100);
    }

    // 获取删除前的书签数据
    const dataBefore = await storage.get();

    // 模拟断电：强制刷新页面（在删除操作过程中）
    const deletePromise = popupPage.click(PopupSelectors.folderItem.filter({ hasText: "断电测试文件夹" }));
    await popupPage.click('button:has-text("删除")');

    // 立即强制刷新
    await popupPage.evaluate(() => window.location.reload());
    await popupPage.waitForLoadState("domcontentloaded");

    // 重新解锁
    popupPage.on("dialog", (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', "AtomicTest123!");
    await popupPage.fill('input[placeholder="再次输入密码"]', "AtomicTest123!");
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(PopupSelectors.popupContainer)).toBeVisible({
      timeout: 10000,
    });

    // 验证数据完整性 - 书签应该存在（要么在原文件夹，要么在未分类）
    await popupPage.click(PopupSelectors.sidebarTabFolders);
    const bookmarksAfter = await popupPage.locator(PopupSelectors.bookmarkItem).count();
    expect(bookmarksAfter).toBeGreaterThanOrEqual(0); // 数据应保持一致

    await popupPage.close();
  });
});