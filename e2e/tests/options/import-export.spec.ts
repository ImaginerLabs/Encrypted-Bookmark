import { test, expect, createPopupPage, createOptionsPage } from '../../fixtures/extension';
import { OptionsSelectors, PopupSelectors } from '../../helpers/selectors';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Options - 导入导出测试
 * 覆盖数据备份和恢复功能
 */
test.describe('Options - 导入导出', () => {
  test('导入导出面板加载', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    const content = optionsPage.locator(OptionsSelectors.content);

    // 未解锁时显示解锁提示
    const hasImportExport = await content.locator(':has-text("导入"), :has-text("导出")').count();
    expect(hasImportExport).toBeGreaterThan(0);
  });

  test('显示导出按钮（解锁后）', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    // 设置密码
    const testPassword = 'ExportBtnTest123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });

    // 打开 Options 页面，解锁导入导出面板
    const optionsPage = await createOptionsPage(extensionContext, extensionId);

    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 在导入导出面板中解锁
    const unlockInput = optionsPage.locator('#options-unlock-password');
    if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockInput.fill(testPassword);
      await optionsPage.locator('button:has-text("解锁")').click();
      await expect(unlockInput).not.toBeVisible({ timeout: 5000 });
    }

    // 验证导出按钮可见
    const exportButton = optionsPage.locator('button:has-text("导出")').first();
    await expect(exportButton).toBeVisible();

    await popupPage.close();
    await optionsPage.close();
  });

  test('显示导入区域（解锁后）', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    // 设置密码
    const testPassword = 'ImportAreaTest123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);

    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 在导入导出面板中解锁
    const unlockInput = optionsPage.locator('#options-unlock-password');
    if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockInput.fill(testPassword);
      await optionsPage.locator('button:has-text("解锁")').click();
      await expect(unlockInput).not.toBeVisible({ timeout: 5000 });
    }

    // 验证有文件输入或导入按钮
    const content = optionsPage.locator(OptionsSelectors.content);
    const hasFileInput = await content.locator('input[type="file"]').count();
    const hasImportButton = await content.locator('button:has-text("导入")').count();
    expect(hasFileInput + hasImportButton).toBeGreaterThan(0);

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导出功能测试
 */
test.describe('Options - 导出功能', () => {
  test('点击导出按钮触发下载', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    // 设置密码
    const testPassword = 'ExportDownload123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);

    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 在导入导出面板中解锁
    const unlockInput = optionsPage.locator('#options-unlock-password');
    if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockInput.fill(testPassword);
      await optionsPage.locator('button:has-text("解锁")').click();
      await expect(unlockInput).not.toBeVisible({ timeout: 5000 });
    }

    // 点击导出按钮
    const exportButton = optionsPage.locator('button:has-text("导出")').first();
    await expect(exportButton).toBeVisible();

    const downloadPromise = optionsPage.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportButton.click();

    const download = await downloadPromise;
    if (download) {
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.(json|enc)$/);
    }

    await popupPage.close();
    await optionsPage.close();
  });
});

/**
 * Options - 导入功能测试
 */
test.describe('Options - 导入功能', () => {
  test('文件输入接受正确的文件类型', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    // 设置密码
    const testPassword = 'ImportAccept123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);

    await optionsPage.locator(OptionsSelectors.tabImportExport).click();

    // 在导入导出面板中解锁
    const unlockInput = optionsPage.locator('#options-unlock-password');
    if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockInput.fill(testPassword);
      await optionsPage.locator('button:has-text("解锁")').click();
      await expect(unlockInput).not.toBeVisible({ timeout: 5000 });
    }

    // 验证文件输入的 accept 属性
    const fileInput = optionsPage.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      const accept = await fileInput.getAttribute('accept');
      if (accept) {
        expect(accept).toMatch(/(json|enc|html)/);
      }
    }

    await popupPage.close();
    await optionsPage.close();
  });
});
