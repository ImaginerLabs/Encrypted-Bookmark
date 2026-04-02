import { test, expect } from '../../fixtures/extension';
import { PopupSelectors } from '../../helpers/selectors';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Popup - 密码设置测试
 * 覆盖首次使用时设置主密码的所有场景
 */
test.describe('Popup - 密码设置', () => {
  // 每个测试前清空存储
  test.beforeEach(async ({ popupPage }) => {
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    // 刷新页面以重新加载状态
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    // 等待加载完成（不再显示"加载中..."）
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });
  });

  test('首次使用显示设置密码界面', async ({ popupPage }) => {
    // 验证标题
    await expect(popupPage.locator('.header h1')).toContainText('Private BookMark');

    // 验证显示首次使用提示
    await expect(popupPage.locator('.header')).toContainText('首次使用');

    // 验证密码输入框存在
    await expect(popupPage.locator('input[placeholder="8-32 位字符"]')).toBeVisible();
    await expect(popupPage.locator('input[placeholder="再次输入密码"]')).toBeVisible();

    // 验证设置按钮存在
    await expect(popupPage.locator('button:has-text("设置密码")')).toBeVisible();

    // 验证提示信息
    await expect(popupPage.locator('.tips')).toContainText('请牢记此密码');
  });

  test('密码长度不足时显示错误', async ({ popupPage }) => {
    // 输入过短的密码（少于 8 位）
    await popupPage.fill('input[placeholder="8-32 位字符"]', '1234567');
    await popupPage.fill('input[placeholder="再次输入密码"]', '1234567');

    // 点击设置按钮
    await popupPage.click('button:has-text("设置密码")');

    // 验证错误提示
    await expect(popupPage.locator('.error')).toBeVisible();
    await expect(popupPage.locator('.error')).toContainText('长度不足');
  });

  test('密码过长时显示错误', async ({ popupPage }) => {
    // 输入过长的密码（超过 32 位）
    const longPassword = 'a'.repeat(33);
    await popupPage.fill('input[placeholder="8-32 位字符"]', longPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', longPassword);

    // 点击设置按钮
    await popupPage.click('button:has-text("设置密码")');

    // 验证错误提示
    await expect(popupPage.locator('.error')).toBeVisible();
    await expect(popupPage.locator('.error')).toContainText('过长');
  });

  test('两次密码不一致时显示错误', async ({ popupPage }) => {
    // 输入不一致的密码
    await popupPage.fill('input[placeholder="8-32 位字符"]', 'Password123!');
    await popupPage.fill('input[placeholder="再次输入密码"]', 'Password456!');

    // 点击设置按钮
    await popupPage.click('button:has-text("设置密码")');

    // 验证错误提示
    await expect(popupPage.locator('.error')).toBeVisible();
    await expect(popupPage.locator('.error')).toContainText('不一致');
  });

  test('成功设置密码后进入已解锁状态', async ({ popupPage }) => {
    const validPassword = 'SecurePass123!';

    // 输入有效密码
    await popupPage.fill('input[placeholder="8-32 位字符"]', validPassword);
    await popupPage.fill('input[placeholder="再次输入密码"]', validPassword);

    // 监听 alert 对话框
    popupPage.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('设置成功');
      await dialog.accept();
    });

    // 点击设置按钮
    await popupPage.click('button:has-text("设置密码")');

    // 等待并验证进入书签管理界面
    await expect(popupPage.locator('.popup-container')).toBeVisible({
      timeout: 10000,
    });

    // 验证存储中保存了密码哈希
    const storage = createStorageHelper(popupPage);
    const data = await storage.get(['passwordHash', 'passwordStatus']);
    expect(data.passwordHash).toBeTruthy();
  });

  test('密码输入框有正确的 placeholder', async ({ popupPage }) => {
    const passwordInput = popupPage.locator('input[placeholder="8-32 位字符"]');
    const confirmInput = popupPage.locator('input[placeholder="再次输入密码"]');

    await expect(passwordInput).toBeVisible();
    await expect(confirmInput).toBeVisible();
  });

  test('密码输入框类型为 password', async ({ popupPage }) => {
    const passwordInput = popupPage.locator('input[placeholder="8-32 位字符"]');
    const confirmInput = popupPage.locator('input[placeholder="再次输入密码"]');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmInput).toHaveAttribute('type', 'password');
  });
});
