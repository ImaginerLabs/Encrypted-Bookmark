import { test, expect, createPopupPage, createOptionsPage } from "../../fixtures/extension";
import { OptionsSelectors } from "../../helpers/selectors";
import { createStorageHelper } from "../../helpers/chrome-storage";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Options - PBM 导入导出完整流程测试
 * 覆盖加密备份文件的导出和导入
 */
test.describe("Options - PBM 导入导出", () => {
  const testPassword = "PbmTest123!";
  const customEncryptionKey = "CustomKey456!";
  
  // 使用临时目录存放测试文件
  const tmpDir = os.tmpdir();

  /**
   * 辅助函数：设置密码并解锁
   */
  async function setupAndUnlock(
    extensionContext: import("@playwright/test").BrowserContext,
    extensionId: string,
    password: string
  ) {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");
    await expect(popupPage.locator(".loading")).not.toBeVisible({
      timeout: 10000,
    });

    // 设置密码
    popupPage.on("dialog", (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', password);
    await popupPage.fill('input[placeholder="再次输入密码"]', password);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator(".popup-container")).toBeVisible({
      timeout: 10000,
    });

    return popupPage;
  }

  test("导出 PBM 文件（使用默认密码加密）", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 等待面板加载
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 默认已选中 JSON 加密备份格式，直接导出
    const exportButton = optionsPage.locator('button:has-text("开始导出")');
    await expect(exportButton).toBeVisible();

    // 监听下载事件
    const downloadPromise = optionsPage.waitForEvent("download", { timeout: 10000 });
    await exportButton.click();

    const download = await downloadPromise;
    const fileName = download.suggestedFilename();

    // 验证文件名格式
    expect(fileName).toMatch(/bookmarks_backup_.*\.pbm$/);

    // 保存文件内容以供后续测试
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, "utf-8");
      const pbmData = JSON.parse(content);

      // 验证 PBM 文件结构
      expect(pbmData.format).toBe("pbm");
      expect(pbmData.encrypted).toBe(true);
      expect(pbmData.encryptedData).toBeTruthy();
      expect(pbmData.salt).toBeTruthy();
      expect(pbmData.iv).toBeTruthy();
      expect(pbmData.checksum).toBeTruthy();
    }

    await popupPage.close();
    await optionsPage.close();
  });

  test("导出 PBM 文件（使用自定义密钥加密）", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 等待面板加载
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 默认已选中 JSON 加密备份格式
    // 输入自定义加密密钥
    const keyInput = optionsPage.locator('.settings-section:has-text("导出") input[type="password"]');
    await keyInput.fill(customEncryptionKey);

    // 导出
    const downloadPromise = optionsPage.waitForEvent("download", { timeout: 10000 });
    await optionsPage.locator('button:has-text("开始导出")').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pbm$/);

    await popupPage.close();
    await optionsPage.close();
  });

  test("导出并导入 PBM 文件（完整流程，默认密码）", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    // 打开 Options 页面并导出
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 默认已选中 JSON 加密备份格式，直接导出
    const downloadPromise = optionsPage.waitForEvent("download", { timeout: 10000 });
    await optionsPage.locator('button:has-text("开始导出")').click();
    const download = await downloadPromise;

    // 获取下载的文件路径
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 滚动到导入区域
    await optionsPage.locator('h3:has-text("导入书签")').scrollIntoViewIfNeeded();
    
    // 选择导入格式为 PBM
    const importSection = optionsPage.locator('.settings-section').filter({ hasText: '导入书签' });
    const importFormatSelect = importSection.locator('select').first();
    await importFormatSelect.selectOption('pbm');

    // 等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 不输入解密密钥（使用默认登录密码）
    // 上传文件
    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 等待导入完成
    await expect(optionsPage.locator('text=导入成功')).toBeVisible({ timeout: 15000 });

    await popupPage.close();
    await optionsPage.close();
  });

  test("导出并导入 PBM 文件（使用自定义密钥）", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    // 打开 Options 页面并导出（使用自定义密钥）
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 获取导出区域
    const exportSection = optionsPage.locator('.settings-section').filter({ hasText: '导出书签' });
    
    // 输入自定义加密密钥
    const exportKeyInput = exportSection.locator('input[type="password"]');
    await exportKeyInput.fill(customEncryptionKey);
    
    const downloadPromise = optionsPage.waitForEvent("download", { timeout: 10000 });
    await exportSection.locator('button:has-text("开始导出")').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    // 滚动到导入区域
    await optionsPage.locator('h3:has-text("导入书签")').scrollIntoViewIfNeeded();
    
    // 获取导入区域
    const importSection = optionsPage.locator('.settings-section').filter({ hasText: '导入书签' });
    
    // 选择导入格式为 PBM
    const importFormatSelect = importSection.locator('select').first();
    await importFormatSelect.selectOption('pbm');

    // 等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 输入自定义解密密钥
    const importKeyInput = importSection.locator('input[type="password"]');
    await importKeyInput.fill(customEncryptionKey);

    // 上传文件
    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 等待导入完成
    await expect(optionsPage.locator('text=导入成功')).toBeVisible({ timeout: 15000 });

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入 PBM 文件（错误密钥应失败）", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    // 打开 Options 页面并导出（使用自定义密钥）
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 获取导出区域
    const exportSection = optionsPage.locator('.settings-section').filter({ hasText: '导出书签' });
    
    // 输入自定义加密密钥
    const exportKeyInput = exportSection.locator('input[type="password"]');
    await exportKeyInput.fill(customEncryptionKey);
    
    const downloadPromise = optionsPage.waitForEvent("download", { timeout: 10000 });
    await exportSection.locator('button:has-text("开始导出")').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    // 滚动到导入区域
    await optionsPage.locator('h3:has-text("导入书签")').scrollIntoViewIfNeeded();
    
    // 获取导入区域
    const importSection = optionsPage.locator('.settings-section').filter({ hasText: '导入书签' });
    
    // 选择导入格式为 PBM
    const importFormatSelect = importSection.locator('select').first();
    await importFormatSelect.selectOption('pbm');

    // 等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 输入错误的解密密钥
    const importKeyInput = importSection.locator('input[type="password"]');
    await importKeyInput.fill("WrongKey999!");

    // 上传文件
    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 应该显示解密失败的错误
    await expect(optionsPage.locator('text=解密失败')).toBeVisible({ timeout: 15000 });

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入格式切换应更新文件选择器 accept 属性", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    const importFormatSelect = optionsPage.locator('.settings-section:has-text("导入") select').first();

    // 默认是 HTML 格式
    let fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
    let accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('.html');

    // 切换到 JSON 格式
    await importFormatSelect.selectOption('json');
    await optionsPage.waitForTimeout(300);
    fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
    accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('.json');

    // 切换到 PBM 格式
    await importFormatSelect.selectOption('pbm');
    await optionsPage.waitForTimeout(300);
    fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
    accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('.pbm');

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入 HTML 书签文件", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 默认已是 HTML 格式，等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 创建测试 HTML 文件
    const testHtmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><A HREF="https://html-import-test.com" ADD_DATE="1234567890">HTML Import Test</A>
</DL><p>`;

    const testFilePath = path.join(tmpDir, "test-bookmarks.html");
    fs.writeFileSync(testFilePath, testHtmlContent);

    try {
      // 上传 HTML 文件
      const fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // 等待导入完成
      await expect(optionsPage.locator('text=导入成功')).toBeVisible({ timeout: 15000 });
    } finally {
      // 清理测试文件
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入 JSON 明文文件", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 选择导入格式为 JSON
    const importFormatSelect = optionsPage.locator('.settings-section:has-text("导入") select').first();
    await importFormatSelect.selectOption('json');

    // 等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 创建测试 JSON 文件
    const testJsonContent = JSON.stringify({
      version: "1.0.0",
      exportTime: Date.now(),
      bookmarks: [
        {
          id: "test-json-1",
          title: "JSON Import Test",
          url: "https://json-import-test.com",
          createTime: Date.now(),
        },
      ],
      folders: [],
      tags: [],
    });

    const testFilePath = path.join(tmpDir, "test-bookmarks.json");
    fs.writeFileSync(testFilePath, testJsonContent);

    try {
      // 上传 JSON 文件
      const fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // 等待导入完成
      await expect(optionsPage.locator('text=导入成功')).toBeVisible({ timeout: 15000 });
    } finally {
      // 清理测试文件
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入无效 PBM 文件应报错", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await setupAndUnlock(
      extensionContext,
      extensionId,
      testPassword
    );

    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(".panel-content")).toContainText(
      "使用提示",
      { timeout: 10000 }
    );

    // 选择导入格式为 PBM
    const importFormatSelect = optionsPage.locator('.settings-section:has-text("导入") select').first();
    await importFormatSelect.selectOption('pbm');

    // 等待 input 元素更新
    await optionsPage.waitForTimeout(500);

    // 创建一个无效的 .pbm 文件
    const invalidPbmPath = path.join(tmpDir, "invalid.pbm");
    fs.writeFileSync(invalidPbmPath, "not valid pbm content");

    try {
      const fileInput = optionsPage.locator('.settings-section:has-text("导入") input[type="file"]');
      await fileInput.setInputFiles(invalidPbmPath);

      // 应该显示格式错误
      await expect(
        optionsPage.locator('text=格式错误').or(optionsPage.locator('text=不是有效'))
      ).toBeVisible({ timeout: 15000 });
    } finally {
      if (fs.existsSync(invalidPbmPath)) {
        fs.unlinkSync(invalidPbmPath);
      }
    }

    await popupPage.close();
    await optionsPage.close();
  });
});
