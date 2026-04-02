import { test, expect, createPopupPage } from '../../fixtures/extension';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Popup - 锁定功能测试
 * 覆盖手动锁定和锁定状态显示
 */
test.describe('Popup - 锁定功能', () => {
  test('已解锁状态显示锁定按钮', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'LockTestPass123!';

    // 设置密码并解锁
    popupPage.on('dialog', (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    // 等待进入书签管理界面
    await expect(popupPage.locator('.popup-container')).toBeVisible({
      timeout: 10000,
    });

    // 验证锁定按钮可见
    await expect(popupPage.locator('button:has-text("锁定")')).toBeVisible();

    await popupPage.close();
  });

  test('点击锁定按钮后回到解锁界面', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'LockTestPass123!';

    // 设置密码
    popupPage.on('dialog', (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator('.popup-container')).toBeVisible({
      timeout: 10000,
    });

    // 点击锁定按钮
    await popupPage.click('button:has-text("锁定")');

    // 等待页面重新加载后回到解锁界面
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });
    await expect(popupPage.locator('.header')).toContainText('请输入主密码', {
      timeout: 5000,
    });

    // 验证解锁输入框可见
    await expect(popupPage.locator('input[placeholder="输入密码"]')).toBeVisible();

    await popupPage.close();
  });

  test('锁定后密码输入框被清空', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'LockTestPass123!';

    // 设置并解锁
    popupPage.on('dialog', (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator('.popup-container')).toBeVisible({
      timeout: 10000,
    });

    // 锁定
    await popupPage.click('button:has-text("锁定")');

    // 等待页面重新加载后验证密码输入框为空
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });
    const input = popupPage.locator('input[placeholder="输入密码"]');
    await expect(input).toHaveValue('');

    await popupPage.close();
  });

  test('已解锁状态显示欢迎信息', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });

    const testPassword = 'WelcomeTest123!';

    popupPage.on('dialog', (dialog) => dialog.accept());

    await popupPage.fill('input[placeholder="8-32 位字符"]', testPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', testPassword);
    await popupPage.click('button:has-text("设置密码")');

    await expect(popupPage.locator('.popup-container')).toBeVisible({
      timeout: 10000,
    });

    // 验证书签管理界面已显示
    await expect(popupPage.locator('.popup-header')).toBeVisible();

    await popupPage.close();
  });
});
