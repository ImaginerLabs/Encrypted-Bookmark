import { test, expect, createPopupPage, createOptionsPage } from '../../fixtures/extension';
import { OptionsSelectors } from '../../helpers/selectors';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Options - 安全设置测试
 * 覆盖安全相关配置
 */
test.describe('Options - 安全设置', () => {
  test('安全设置面板可访问', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    await expect(optionsPage.locator('.options-content')).toContainText(/安全|密码/);
  });

  test('显示修改密码选项', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    const content = optionsPage.locator('.options-content');
    const hasPasswordChange = await content.locator(':has-text("密码")').count();
    expect(hasPasswordChange).toBeGreaterThan(0);
  });
});

/**
 * Options - 修改密码测试
 */
test.describe('Options - 修改密码', () => {
  test('安全设置面板可访问（密码已设置）', async ({ extensionContext, extensionId }) => {
    // 先通过 Popup 设置密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'OriginalPass123!';
    popupPage.on('dialog', (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });
    await popupPage.close();

    // 打开 Options 页面
    const optionsPage = await createOptionsPage(extensionContext, extensionId);

    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    await expect(optionsPage.locator('.options-content')).toContainText(/安全|密码/);

    await optionsPage.close();
  });
});
