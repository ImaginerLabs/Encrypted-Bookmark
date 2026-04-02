import { test, expect } from '../../fixtures/extension';

/**
 * Options - 关于面板测试
 * 覆盖 AboutPanel 组件
 */
test.describe('Options - 关于面板', () => {
  /** 切换到关于 Tab */
  async function clickAboutTab(optionsPage: import('@playwright/test').Page) {
    const tab = optionsPage.locator('button.sidebar-item:has-text("关于")');
    if (await tab.count() > 0) {
      await tab.first().click();
    }
  }

  test('显示应用名称和版本', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.app-name')).toContainText('Encrypted Bookmark');
    await expect(optionsPage.locator('.app-version')).toContainText('版本');
    await expect(optionsPage.locator('.app-version')).toContainText('1.0.0');
  });

  test('显示应用描述', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.app-tagline')).toContainText('本地优先');
  });

  test('显示安全特性卡片', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.features-grid')).toBeVisible();
    // 验证特性卡片存在
    const cards = optionsPage.locator('.feature-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(0)).toContainText('加密');
    await expect(cards.nth(1)).toContainText('PBKDF2');
  });

  test('显示技术栈信息', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.tech-list')).toContainText('React');
    await expect(optionsPage.locator('.tech-list')).toContainText('TypeScript');
    await expect(optionsPage.locator('.tech-list')).toContainText('Manifest V3');
  });

  test('显示开源许可信息', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.info-section:has-text("开源")')).toContainText('MIT 许可');
  });

  test('显示隐私政策', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.privacy-list')).toContainText('不收集任何用户数据');
    await expect(optionsPage.locator('.privacy-list')).toContainText('不上传');
  });

  test('显示危险操作区域和重置按钮', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('domcontentloaded');
    await clickAboutTab(optionsPage);

    await expect(optionsPage.locator('.danger-section')).toBeVisible();
    await expect(optionsPage.locator('.btn-danger')).toBeVisible();
    await expect(optionsPage.locator('.btn-danger')).toContainText('重置所有数据');
  });
});
