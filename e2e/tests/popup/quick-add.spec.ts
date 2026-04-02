import { test, expect, createPopupPage } from '../../fixtures/extension';
import { createStorageHelper } from '../../helpers/chrome-storage';

/**
 * Popup - 快速添加书签测试
 * 覆盖 QuickAddPanel 组件
 */
test.describe('Popup - 快速添加书签', () => {
  /** 设置密码并解锁 */
  async function setupUnlocked(popupPage: import('@playwright/test').Page) {
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('.loading')).not.toBeVisible({ timeout: 10000 });
    popupPage.on('dialog', (dialog) => dialog.accept());
    await popupPage.fill('input[placeholder="8-32 位字符"]', 'QuickAdd123456');
    await popupPage.fill('input[placeholder="再次输入密码"]', 'QuickAdd123456');
    await popupPage.click('button:has-text("设置密码")');
    await expect(popupPage.locator('.popup-container')).toBeVisible({ timeout: 10000 });
  }

  test('点击添加按钮打开快速添加面板', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    // 点击 + 按钮
    await popupPage.click('.btn-quick-add');

    // 验证面板打开
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();
    await expect(popupPage.locator('.quick-add-panel h3')).toContainText('添加书签');

    await popupPage.close();
  });

  test('面板显示标题和URL输入框', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    // 验证表单字段
    await expect(popupPage.locator('#title')).toBeVisible();
    await expect(popupPage.locator('#url')).toBeVisible();
    await expect(popupPage.locator('#folder')).toBeVisible();
    await expect(popupPage.locator('#tags')).toBeVisible();
    await expect(popupPage.locator('#note')).toBeVisible();

    await popupPage.close();
  });

  test('面板显示取消和保存按钮', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    await expect(popupPage.locator('.btn-cancel')).toBeVisible();
    await expect(popupPage.locator('.btn-cancel')).toContainText('取消');
    await expect(popupPage.locator('.btn-save')).toBeVisible();
    await expect(popupPage.locator('.btn-save')).toContainText('保存');

    await popupPage.close();
  });

  test('空标题提交显示验证错误', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    // 清空标题，填入有效URL
    await popupPage.fill('#title', '');
    await popupPage.fill('#url', 'https://example.com');

    // 等待面板可见后点击保存
    await expect(popupPage.locator('.btn-save')).toBeEnabled({ timeout: 3000 });
    await popupPage.click('.btn-save');

    // 验证错误提示（可能在 error-text 或 error-message 中）
    await expect(popupPage.locator('.error-text, .error-message')).toBeVisible({ timeout: 5000 });
    await expect(popupPage.locator('.error-text, .error-message')).toContainText('标题');

    await popupPage.close();
  });

  test('无效URL提交显示验证错误', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    await popupPage.fill('#title', '测试书签');
    await popupPage.fill('#url', 'not-a-valid-url');
    await popupPage.click('.btn-save');

    await expect(popupPage.locator('.error-text')).toBeVisible({ timeout: 5000 });
    await expect(popupPage.locator('.error-text')).toContainText('有效的 URL');

    await popupPage.close();
  });

  test('点击取消关闭面板', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    // 填写一些数据
    await popupPage.fill('#title', '临时书签');

    // 点击取消
    await popupPage.click('.btn-cancel');
    await expect(popupPage.locator('.quick-add-panel')).not.toBeVisible();

    await popupPage.close();
  });

  test('点击遮罩层关闭面板', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    // 点击遮罩层关闭面板
    await popupPage.evaluate(() => {
      document.querySelector('.overlay')?.click();
    });
    await expect(popupPage.locator('.quick-add-panel')).not.toBeVisible();

    await popupPage.close();
  });

  test('文件夹选择器默认显示未分类', async ({ extensionContext, extensionId }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    await setupUnlocked(popupPage);

    await popupPage.click('.btn-quick-add');
    await expect(popupPage.locator('.quick-add-panel')).toBeVisible();

    // 验证默认选项
    const folderSelect = popupPage.locator('#folder');
    await expect(folderSelect).toBeVisible();
    const firstOption = folderSelect.locator('option').first();
    await expect(firstOption).toHaveAttribute('value', '');

    await popupPage.close();
  });
});
