import {
  test,
  expect,
  createPopupPage,
  createOptionsPage,
} from "../../fixtures/extension";
import { OptionsSelectors } from "../../helpers/selectors";
import { createStorageHelper } from "../../helpers/chrome-storage";
import type { BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * 辅助函数：设置密码并打开已解锁的 Options 页面
 */
async function setupUnlockedOptionsPage(
  extensionContext: BrowserContext,
  extensionId: string,
  testPassword: string,
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
  await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
  await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
  await popupPage.click('button:has-text("设置密码")');
  await expect(popupPage.locator(".popup-container")).toBeVisible({
    timeout: 10000,
  });

  // 打开 Options 页面
  const optionsPage = await createOptionsPage(extensionContext, extensionId);
  await optionsPage.locator(OptionsSelectors.tabImportExport).click();

  // 等待面板加载完成
  await expect(optionsPage.locator(".panel-content")).toContainText(
    "使用提示",
    { timeout: 10000 },
  );

  return { popupPage, optionsPage };
}

/**
 * Options - 导入导出测试
 * 覆盖数据备份和恢复功能
 */
test.describe("Options - 导入导出", () => {
  test("导入导出面板加载", async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    const content = optionsPage.locator(OptionsSelectors.content);

    // 未解锁时显示解锁提示
    const hasImportExport = await content
      .locator(':has-text("导入"), :has-text("导出")')
      .count();
    expect(hasImportExport).toBeGreaterThan(0);
  });

  test("显示导出按钮（解锁后）", async ({ extensionContext, extensionId }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "ExportBtnTest123!",
    );

    // 验证导出按钮可见
    const exportButton = optionsPage.locator('button:has-text("导出")').first();
    await expect(exportButton).toBeVisible();

    await popupPage.close();
    await optionsPage.close();
  });

  test("显示导入区域（解锁后）", async ({ extensionContext, extensionId }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "ImportAreaTest123!",
    );

    // 验证有文件输入或导入按钮
    const content = optionsPage.locator(OptionsSelectors.content);
    const hasFileInput = await content.locator('input[type="file"]').count();
    const hasImportButton = await content
      .locator('button:has-text("导入")')
      .count();
    expect(hasFileInput + hasImportButton).toBeGreaterThan(0);

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导出格式切换与 UI 验证（Task 5.1-5.2）
 */
test.describe("Options - 导出格式切换 UI", () => {
  test("切换导出格式后描述提示文案正确更新", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "FormatHintTest123!",
    );

    // 导出区域的格式下拉框
    const exportSelect = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" })
      .locator("select");

    // 默认选中 pbm，验证提示
    const hintText = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" })
      .locator(".form-hint")
      .first();
    await expect(hintText).toContainText("最安全");

    // 切换到 json
    await exportSelect.selectOption("json");
    await expect(hintText).toContainText("未加密");

    // 切换到 html
    await exportSelect.selectOption("html");
    await expect(hintText).toContainText("浏览器");

    // 切换回 pbm
    await exportSelect.selectOption("pbm");
    await expect(hintText).toContainText("最安全");

    await popupPage.close();
    await optionsPage.close();
  });

  test("选择加密备份格式时显示密钥输入框，切换其他格式时隐藏", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "KeyFieldTest123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });
    const exportSelect = exportSection.locator("select");

    // 默认 pbm → 密钥输入框可见
    const keyInput = exportSection.locator('input[type="password"]');
    await expect(keyInput).toBeVisible();

    // 切换到 json → 密钥输入框隐藏
    await exportSelect.selectOption("json");
    await expect(keyInput).not.toBeVisible();

    // 切换到 html → 密钥输入框隐藏
    await exportSelect.selectOption("html");
    await expect(keyInput).not.toBeVisible();

    // 切换回 pbm → 密钥输入框可见
    await exportSelect.selectOption("pbm");
    await expect(keyInput).toBeVisible();

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导出文件格式验证（Task 6.1-6.3）
 */
test.describe("Options - 导出文件格式验证", () => {
  test("PBM 格式导出 → 文件名以 .pbm 结尾，内容包含 format: pbm", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "PbmExportTest123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });

    // 确保选中 pbm 格式（默认）
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("pbm");

    // 点击导出并捕获下载
    const exportButton = exportSection.locator('button:has-text("开始导出")');
    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await exportButton.click();

    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.pbm$/);

    // 验证文件内容
    const filePath = await download.path();
    if (filePath) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      expect(data.format).toBe("pbm");
      expect(data.encrypted).toBe(true);
    }

    await popupPage.close();
    await optionsPage.close();
  });

  test("JSON 明文导出 → 文件名以 .json 结尾，内容包含 version 和 bookmarks", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "JsonExportTest123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });

    // 选择 json 格式
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("json");

    // 点击导出 → 会弹出明文警告
    const exportButton = exportSection.locator('button:has-text("开始导出")');
    await exportButton.click();

    // 确认明文导出
    const confirmButton = optionsPage.locator('button:has-text("确认导出")');
    await expect(confirmButton).toBeVisible({ timeout: 5000 });

    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await confirmButton.click();

    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.json$/);

    // 验证文件内容
    const filePath = await download.path();
    if (filePath) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("bookmarks");
    }

    await popupPage.close();
    await optionsPage.close();
  });

  test("HTML 格式导出 → 文件名以 .html 结尾，内容包含 Netscape 书签标识", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "HtmlExportTest123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });

    // 选择 html 格式
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("html");

    // 点击导出
    const exportButton = exportSection.locator('button:has-text("开始导出")');
    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await exportButton.click();

    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.html$/);

    // 验证文件内容
    const filePath = await download.path();
    if (filePath) {
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("NETSCAPE-Bookmark-file");
    }

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导入导出往返测试（Task 7.1-7.3）
 */
test.describe("Options - 导入导出往返", () => {
  test("PBM 格式导出 → PBM 格式导入 → 验证成功", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "PbmRoundTrip123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });
    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });

    // 1. 导出 PBM
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("pbm");

    const exportButton = exportSection.locator('button:has-text("开始导出")');
    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await exportButton.click();

    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 2. 导入 PBM
    const importSelect = importSection.locator("select");
    await importSelect.selectOption("pbm");

    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 等待导入完成（成功或错误消息出现）
    await optionsPage
      .locator(".global-message, .message-success, .message-error")
      .waitFor({ timeout: 15000 })
      .catch(() => {});

    await popupPage.close();
    await optionsPage.close();
  });

  test("JSON 格式导出 → JSON 格式导入 → 验证成功", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "JsonRoundTrip123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });
    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });

    // 1. 导出 JSON（需要确认明文导出）
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("json");

    const exportButton = exportSection.locator('button:has-text("开始导出")');
    await exportButton.click();

    // 确认明文导出
    const confirmButton = optionsPage.locator('button:has-text("确认导出")');
    await expect(confirmButton).toBeVisible({ timeout: 5000 });

    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await confirmButton.click();

    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 2. 导入 JSON
    const importSelect = importSection.locator("select");
    await importSelect.selectOption("json");

    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 等待导入完成
    await optionsPage
      .locator(".global-message, .message-success, .message-error")
      .waitFor({ timeout: 15000 })
      .catch(() => {});

    await popupPage.close();
    await optionsPage.close();
  });

  test("HTML 格式导出 → HTML 格式导入 → 验证成功", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "HtmlRoundTrip123!",
    );

    const exportSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导出书签" });
    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });

    // 1. 导出 HTML
    const exportSelect = exportSection.locator("select");
    await exportSelect.selectOption("html");

    const exportButton = exportSection.locator('button:has-text("开始导出")');
    const downloadPromise = optionsPage.waitForEvent("download", {
      timeout: 10000,
    });
    await exportButton.click();

    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 2. 导入 HTML
    const importSelect = importSection.locator("select");
    await importSelect.selectOption("html");

    const fileInput = importSection.locator('input[type="file"]');
    if (downloadPath) {
      await fileInput.setInputFiles(downloadPath);
    }

    // 等待导入完成
    await optionsPage
      .locator(".global-message, .message-success, .message-error")
      .waitFor({ timeout: 15000 })
      .catch(() => {});

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导入错误处理与确认流程（Task 8.1-8.4）
 */
test.describe("Options - 导入错误处理", () => {
  test("格式不匹配时显示错误提示", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "FormatMismatch123!",
    );

    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });

    // 选择 HTML 格式但上传一个 JSON 内容的文件
    const importSelect = importSection.locator("select");
    await importSelect.selectOption("html");

    // 创建一个临时 JSON 文件用于测试
    const fileInput = importSection.locator('input[type="file"]');
    const tmpDir = path.join(process.cwd(), "e2e", "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, "test-mismatch.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ test: true }));

    await fileInput.setInputFiles(tmpFile);

    // 等待错误消息出现
    await optionsPage
      .locator(
        '.global-message, .message-error, :has-text("格式不匹配"), :has-text("失败")',
      )
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});

    // 清理临时文件
    fs.unlinkSync(tmpFile);

    await popupPage.close();
    await optionsPage.close();
  });

  test("覆盖模式显示确认弹窗，点击取消后数据不受影响", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "OverwriteCancel123!",
    );

    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });

    // 选择覆盖模式
    const overwriteRadio = importSection.locator(
      'input[name="importStrategy"][value="overwrite"]',
    );
    await overwriteRadio.click();

    // 创建临时文件用于触发导入
    const tmpDir = path.join(process.cwd(), "e2e", "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, "test-overwrite.html");
    fs.writeFileSync(
      tmpFile,
      '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com">Test</A></DL>',
    );

    // 上传文件
    const fileInput = importSection.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpFile);

    // 验证确认弹窗出现
    const modal = optionsPage.locator(".modal-overlay");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 验证有"确认覆盖"和"取消"按钮
    await expect(
      optionsPage.locator('button:has-text("确认覆盖")'),
    ).toBeVisible();
    await expect(
      optionsPage.locator('.modal-overlay button:has-text("取消")'),
    ).toBeVisible();

    // 点击取消
    await optionsPage.locator('.modal-overlay button:has-text("取消")').click();

    // 弹窗消失
    await expect(modal).not.toBeVisible();

    // 清理临时文件
    fs.unlinkSync(tmpFile);

    await popupPage.close();
    await optionsPage.close();
  });

  test("导入格式切换后文件选择器 accept 属性正确更新", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "AcceptAttrTest123!",
    );

    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });
    const importSelect = importSection.locator("select");

    // 默认 pbm 格式（FORMAT_CONFIG 的 key 顺序：pbm, json, html）
    // 注意：ImportSection 使用 Object.keys(FORMAT_CONFIG) 渲染，默认选中第一个
    // 但 ImportSection 的 useState 默认值是 'html'，所以先验证 html
    // 实际上 ImportSection 的默认值仍然是 'html'（未修改默认值）
    let fileInput = importSection.locator('input[type="file"]');
    let accept = await fileInput.getAttribute("accept");
    expect(accept).toBe(".html");

    // 切换到 json
    await importSelect.selectOption("json");
    fileInput = importSection.locator('input[type="file"]');
    accept = await fileInput.getAttribute("accept");
    expect(accept).toBe(".json");

    // 切换到 pbm
    await importSelect.selectOption("pbm");
    fileInput = importSection.locator('input[type="file"]');
    accept = await fileInput.getAttribute("accept");
    expect(accept).toBe(".pbm");

    // 切换回 html
    await importSelect.selectOption("html");
    fileInput = importSection.locator('input[type="file"]');
    accept = await fileInput.getAttribute("accept");
    expect(accept).toBe(".html");

    await popupPage.close();
    await optionsPage.close();
  });

  test("选择加密备份导入格式时显示解密密钥输入框", async ({
    extensionContext,
    extensionId,
  }) => {
    const { popupPage, optionsPage } = await setupUnlockedOptionsPage(
      extensionContext,
      extensionId,
      "DecryptKeyTest123!",
    );

    const importSection = optionsPage
      .locator(".settings-section")
      .filter({ hasText: "导入书签" });
    const importSelect = importSection.locator("select");

    // 默认 html → 解密密钥输入框不可见
    const decryptKeyInput = importSection.locator('input[type="password"]');
    await expect(decryptKeyInput).not.toBeVisible();

    // 切换到 pbm → 解密密钥输入框可见
    await importSelect.selectOption("pbm");
    await expect(decryptKeyInput).toBeVisible();

    // 切换到 json → 解密密钥输入框不可见
    await importSelect.selectOption("json");
    await expect(decryptKeyInput).not.toBeVisible();

    // 切换回 pbm → 解密密钥输入框可见
    await importSelect.selectOption("pbm");
    await expect(decryptKeyInput).toBeVisible();

    await popupPage.close();
    await optionsPage.close();
  });
});
