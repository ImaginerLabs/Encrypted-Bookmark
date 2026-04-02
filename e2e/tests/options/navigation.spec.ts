import { test, expect } from '../../fixtures/extension';
import { OptionsSelectors } from '../../helpers/selectors';

/**
 * Options - 导航测试
 * 覆盖侧边栏 Tab 切换功能
 */
test.describe('Options - 导航', () => {
  test('页面加载后显示基本布局', async ({ optionsPage }) => {
    await expect(optionsPage.locator(OptionsSelectors.container)).toBeVisible();
  });

  test('默认显示基础设置面板', async ({ optionsPage }) => {
    await expect(optionsPage.locator(OptionsSelectors.content)).toBeVisible();
    // 默认激活基本设置 tab
    await expect(optionsPage.locator(OptionsSelectors.tabBasic)).toHaveClass(/active/);
  });

  test('点击安全设置 Tab 切换面板', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    // 验证安全设置 tab 激活
    await expect(optionsPage.locator(OptionsSelectors.tabSecurity)).toHaveClass(/active/);
    // 验证面板内容包含安全相关文字
    await expect(optionsPage.locator(OptionsSelectors.content)).toContainText(/安全|密码/);
  });

  test('点击存储设置 Tab 切换面板', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabStorage).click();
    await expect(optionsPage.locator(OptionsSelectors.tabStorage)).toHaveClass(/active/);
    await expect(optionsPage.locator(OptionsSelectors.content)).toContainText(/存储|数据/);
  });

  test('点击导入导出 Tab 切换面板', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabImportExport).click();
    await expect(optionsPage.locator(OptionsSelectors.tabImportExport)).toHaveClass(/active/);
    // 导入导出面板会显示解锁提示或面板内容
    const content = optionsPage.locator(OptionsSelectors.content);
    await expect(content.locator(':has-text("导入"), :has-text("导出")').first()).toBeVisible();
  });

  test('点击关于 Tab 切换面板', async ({ optionsPage }) => {
    await optionsPage.locator(OptionsSelectors.tabAbout).click();
    await expect(optionsPage.locator(OptionsSelectors.tabAbout)).toHaveClass(/active/);
    await expect(optionsPage.locator(OptionsSelectors.content)).toContainText(/关于|版本/);
  });
});

/**
 * Options - 消息提示测试
 */
test.describe('Options - 消息提示', () => {
  test('消息提示初始不可见', async ({ optionsPage }) => {
    const messageCount = await optionsPage.locator(OptionsSelectors.globalMessage).count();
    if (messageCount > 0) {
      await expect(optionsPage.locator(OptionsSelectors.globalMessage)).not.toBeVisible();
    }
  });
});
