import { test, expect, createPopupPage } from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * Options - 设置页面数据加载测试
 * 验证 BasicSettingsPanel 加载真实文件夹数据而非模拟数据
 */
test.describe("Options - 设置页面数据加载", () => {
  test("基本设置面板加载真实文件夹列表", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    // 1. 先通过 Popup 设置密码并创建一些文件夹
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    const testPassword = "SettingsTest123!";
    popupPage.on("dialog", (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    // 2. 创建测试文件夹（通过 chrome.storage.local 直接设置）
    const testFolders = [
      { id: "folder-1", name: "工作文件夹", sort: 0, createTime: Date.now(), updateTime: Date.now() },
      { id: "folder-2", name: "个人文件夹", sort: 1, createTime: Date.now(), updateTime: Date.now() },
      { id: "uncategorized", name: "未分类", sort: 999, createTime: Date.now(), updateTime: Date.now() },
    ];

    await popupPage.evaluate(
      (folders) => {
        // 加密文件夹数据
        const encrypted = btoa(unescape(encodeURIComponent(JSON.stringify(folders))));
        chrome.storage.local.set({ encryptedFolders: encrypted });
      },
      testFolders
    );

    // 锁定会话
    await popupPage.click('.popup-titlebar-btn[aria-label="锁定"]');
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });
    await popupPage.close();

    // 3. 打开 Options 页面并解锁
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    // 解锁
    await optionsPage.fill('input[placeholder="输入密码"]', testPassword);
    await optionsPage.click('button.btn-primary:has-text("解锁")');
    await expect(
      optionsPage.locator('.info-box:has-text("请先登录")')
    ).not.toBeVisible({ timeout: 10000 });

    // 4. 等待基本设置面板加载
    await expect(optionsPage.locator(".panel-title")).toContainText("基本设置", {
      timeout: 10000,
    });

    // 5. 验证文件夹选择器显示真实数据
    const folderSelect = optionsPage.locator(".settings-select");
    await expect(folderSelect).toBeVisible();

    // 获取所有选项
    const options = await folderSelect.locator("option").allTextContents();

    // 验证包含我们创建的文件夹，而不是 mock 数据
    // mock 数据包含 "根目录", "工作", "个人"
    // 真实数据应该包含 "工作文件夹", "个人文件夹", "未分类"
    expect(options.some((opt) => opt.includes("工作文件夹"))).toBeTruthy();
    expect(options.some((opt) => opt.includes("个人文件夹"))).toBeTruthy();

    // 确保不包含 mock 数据的特征
    expect(options.some((opt) => opt === "根目录")).toBeFalsy();

    await optionsPage.close();
  });

  test("未解锁时文件夹选择器应为空或显示加载状态", async ({
    extensionContext,
    extensionId,
    optionsUrl,
  }) => {
    // 确保没有任何会话数据
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.close();

    // 打开 Options 页面（不清除会话，让它使用已存在的密码设置）
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState("domcontentloaded");

    // 确保显示的是基本设置面板（默认面板）
    await expect(optionsPage.locator(".panel-title")).toContainText("基本设置");

    // 此时应该显示加载中或者文件夹选择器为空
    // 因为没有解锁，所以不应该显示真实文件夹数据
    const folderSelect = optionsPage.locator(".settings-select");
    await expect(folderSelect).toBeVisible();

    // 未解锁状态下，文件夹选项不应该包含模拟数据的 "根目录"
    const options = await folderSelect.locator("option").allTextContents();
    expect(options.some((opt) => opt === "根目录")).toBeFalsy();

    await optionsPage.close();
  });
});
