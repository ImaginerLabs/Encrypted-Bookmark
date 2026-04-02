import { test, expect } from '../../fixtures/extension';

/**
 * Options - 存储设置面板测试
 * 覆盖 StorageSettingsPanel 组件
 */
test.describe('Options - 存储设置面板', () => {
  /** 切换到存储设置 Tab */
  async function clickStorageTab(optionsPage: import('@playwright/test').Page) {
    const tab = optionsPage.locator('button.sidebar-item:has-text("存储设置")');
    if (await tab.count() > 0) {
      await tab.first().click();
    }
  }

  test('面板标题和描述', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickStorageTab(optionsPage);

    await expect(optionsPage.locator('.panel-title')).toContainText('存储设置');
    await expect(optionsPage.locator('.panel-desc')).toContainText('存储方式');
  });

  test('显示浏览器存储选项', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickStorageTab(optionsPage);

    // 验证浏览器存储单选按钮
    const chromeRadio = optionsPage.locator('input[name="storageType"][value="chrome"]');
    await expect(chromeRadio).toBeVisible();

    // 验证推荐标签
    await expect(optionsPage.locator('.badge-recommended')).toContainText('推荐');

    // 验证特性列表
    await expect(optionsPage.locator('.storage-options')).toContainText('开箱即用');
  });

  test('显示本地文件存储选项', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickStorageTab(optionsPage);

    // 验证文件系统存储单选按钮
    const fsRadio = optionsPage.locator('input[name="storageType"][value="filesystem"]');
    await expect(fsRadio).toBeVisible();

    // 验证高级标签
    await expect(optionsPage.locator('.badge-advanced')).toContainText('高级');
  });

  test('显示测试连接按钮', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickStorageTab(optionsPage);

    await expect(optionsPage.locator('button:has-text("测试连接")')).toBeVisible();
  });

  test('点击测试连接显示结果', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickStorageTab(optionsPage);

    await optionsPage.click('button:has-text("测试连接")');

    // 等待测试结果显示（成功或失败）
    await expect(optionsPage.locator('.test-result')).toBeVisible({ timeout: 10000 });
  });
});
