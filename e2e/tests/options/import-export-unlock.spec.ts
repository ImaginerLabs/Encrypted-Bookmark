import { test, expect, createPopupPage } from '../../fixtures/extension';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Options - 导入导出面板解锁测试
 * 覆盖导入导出面板的认证和功能展示
 */
test.describe('Options - 导入导出面板解锁', () => {
  /** 点击导入导出 Tab */
  async function clickImportExportTab(optionsPage: import('@playwright/test').Page) {
    const tab = optionsPage.locator('button.sidebar-item:has-text("导入导出")');
    if (await tab.count() > 0) {
      await tab.first().click();
    }
  }

  test('未登录时显示提示和解锁表单', async ({ extensionContext, extensionId, optionsUrl }) => {
    // 清空存储确保无密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.close();

    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('domcontentloaded');

    await clickImportExportTab(optionsPage);

    // 验证显示提示信息
    await expect(optionsPage.locator('.info-box')).toContainText('请先登录');
    // 验证显示解锁表单
    await expect(optionsPage.locator('input[placeholder="输入密码"]')).toBeVisible();
    await expect(optionsPage.locator('button.btn-primary:has-text("解锁")')).toBeVisible();

    await optionsPage.close();
  });

  test('密码已设置但未解锁时可通过表单解锁', async ({ extensionContext, extensionId, optionsUrl }) => {
    // 先通过 Popup 设置密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'ImportExport123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });
    await popupPage.close();

    // 打开 Options 页面（新标签页，无 masterKey）
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('domcontentloaded');

    await clickImportExportTab(optionsPage);

    // 验证需要解锁
    await expect(optionsPage.locator('input[placeholder="输入密码"]')).toBeVisible();

    // 输入密码解锁
    await optionsPage.fill('input[placeholder="输入密码"]', testPassword);
    await optionsPage.click('button.btn-primary:has-text("解锁")');

    // 解锁后提示和表单应消失，显示完整面板
    await expect(optionsPage.locator('.info-box:has-text("请先登录")')).not.toBeVisible({ timeout: 10000 });
    await expect(optionsPage.locator('input[placeholder="输入密码"]').first()).not.toBeVisible();
    // 应显示导入相关内容
    await expect(optionsPage.locator('.panel-content')).toContainText('导入', { timeout: 10000 });

    await optionsPage.close();
  });

  test('输入错误密码显示错误提示', async ({ extensionContext, extensionId, optionsUrl }) => {
    // 先通过 Popup 设置密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', 'SetupPass123!');
    await popupPage.fill('input[placeholder="再次输入密码"]', 'SetupPass123!');
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });
    await popupPage.close();

    // 打开 Options 页面
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('domcontentloaded');

    await clickImportExportTab(optionsPage);

    // 输入错误密码
    await optionsPage.fill('input[placeholder="输入密码"]', 'WrongPassword!');
    await optionsPage.click('button.btn-primary:has-text("解锁")');

    // 验证错误提示
    await expect(optionsPage.locator('.error')).toBeVisible({ timeout: 10000 });
    await expect(optionsPage.locator('.error')).toContainText('密码错误');

    await optionsPage.close();
  });

  test('解锁后显示导入导出完整面板', async ({ extensionContext, extensionId, optionsUrl }) => {
    // 先通过 Popup 设置密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'FullPanel123!';
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });
    await popupPage.close();

    // 打开 Options 并解锁
    const optionsPage = await extensionContext.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('domcontentloaded');

    await clickImportExportTab(optionsPage);

    await optionsPage.fill('input[placeholder="输入密码"]', testPassword);
    await optionsPage.click('button.btn-primary:has-text("解锁")');

    // 验证完整面板内容
    await expect(optionsPage.locator('.panel-content')).toContainText('使用提示', { timeout: 10000 });
    await expect(optionsPage.locator('.panel-content')).toContainText('常见问题');
    await expect(optionsPage.locator('.faq-container')).toBeVisible();

    await optionsPage.close();
  });
});
