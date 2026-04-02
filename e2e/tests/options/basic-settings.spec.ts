import { test, expect } from '../../fixtures/extension';

/**
 * Options - 基本设置面板测试
 * 覆盖 BasicSettingsPanel 组件
 */
test.describe('Options - 基本设置面板', () => {
  test('默认显示基本设置面板', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');

    // 基本设置是默认面板
    await expect(optionsPage.locator('.panel-title')).toContainText('基本设置');
  });

  test('显示默认文件夹选择器', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');

    // 验证默认文件夹选择器
    await expect(optionsPage.locator('.settings-select')).toBeVisible();
  });

  test('显示新标签页打开选项', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');

    // 验证复选框
    const checkbox = optionsPage.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    // 验证标签文本
    await expect(optionsPage.locator('.checkbox-label')).toContainText('新标签页');
  });

  test('显示主题选择器', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');

    // 验证主题单选按钮
    await expect(optionsPage.locator('input[name="theme"]')).toHaveCount(3);
    await expect(optionsPage.locator('.radio-group')).toContainText('浅色');
    await expect(optionsPage.locator('.radio-group')).toContainText('深色');
    await expect(optionsPage.locator('.radio-group')).toContainText('跟随系统');
  });

  test('显示保存设置按钮', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');

    await expect(optionsPage.locator('.panel-actions .btn-primary')).toBeVisible();
    await expect(optionsPage.locator('.panel-actions .btn-primary')).toContainText('保存设置');
  });
});
