import {
  test,
  expect,
  createPopupPage,
  createOptionsPage,
} from "../../fixtures/extension";
import { OptionsSelectors, PopupSelectors } from "../../helpers/selectors";
import { createStorageHelper } from "../../helpers/chrome-storage";

/**
 * Security - 修改密码后数据重加密测试
 * 验证修改密码后所有加密数据能用新密码正确解密，旧密码无法解密新数据
 */
test.describe("Security - 修改密码后数据重加密", () => {
  const oldPassword = "OldPass123!";
  const newPassword = "NewPass456!";

  test.beforeEach(async ({ extensionContext, extensionId }) => {
    // 清空存储并设置初始密码
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);
    await storage.clear();
    await popupPage.reload();
    await popupPage.waitForLoadState("domcontentloaded");

    // 设置初始密码
    popupPage.on("dialog", (dialog) => dialog.accept());
    await popupPage.fill(PopupSelectors.setPasswordInput, oldPassword);
    await popupPage.fill(PopupSelectors.confirmPasswordInput, oldPassword);
    await popupPage.click(PopupSelectors.setPasswordButton);
    await expect(popupPage.locator(PopupSelectors.unlockedContent)).toBeVisible({
      timeout: 10000,
    });
    await popupPage.close();
  });

  test("修改密码后书签数据应能用新密码解密", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);
    const storage = createStorageHelper(popupPage);

    // 添加一个测试书签
    await popupPage.fill(PopupSelectors.unlockPasswordInput, oldPassword);
    await popupPage.click(PopupSelectors.unlockButton);
    await expect(popupPage.locator(PopupSelectors.unlockedContent)).toBeVisible({
      timeout: 10000,
    });

    // 快速添加书签
    await popupPage.click(PopupSelectors.btnQuickAdd);
    const testUrl = "https://example.com/bookmark-test";
    const testTitle = "Bookmark Test Title";
    await popupPage.fill('input[placeholder="输入网址"]', testUrl);
    await popupPage.fill('input[placeholder="输入标题"]', testTitle);
    await popupPage.click('button:has-text("保存")');
    await popupPage.waitForTimeout(500);
    await popupPage.close();

    // 修改密码
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    await expect(
      optionsPage.locator(OptionsSelectors.panelTitle)
    ).toContainText("安全设置", { timeout: 5000 });

    // 点击修改密码
    await optionsPage.click('text=修改主密码');
    await optionsPage.waitForTimeout(500);

    // 填写旧密码和新密码
    const oldPasswordInput = optionsPage.locator(
      'input[placeholder="输入当前密码"]'
    );
    const newPasswordInput = optionsPage.locator(
      'input[placeholder="输入新密码"]'
    );
    const confirmPasswordInput = optionsPage.locator(
      'input[placeholder="再次输入新密码"]'
    );

    await oldPasswordInput.fill(oldPassword);
    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    // 提交修改
    await optionsPage.click('button:has-text("确认修改")');
    await optionsPage.waitForTimeout(1000);

    // 确认修改成功
    await expect(
      optionsPage.locator(OptionsSelectors.globalMessage)
    ).toContainText(/成功|修改/, { timeout: 5000 });
    await optionsPage.close();

    // 用新密码解锁并验证书签数据
    const popupPage2 = await createPopupPage(extensionContext, extensionId);
    await popupPage2.fill(PopupSelectors.unlockPasswordInput, newPassword);
    await popupPage2.click(PopupSelectors.unlockButton);
    await expect(
      popupPage2.locator(PopupSelectors.unlockedContent)
    ).toBeVisible({ timeout: 10000 });

    // 验证书签存在
    await expect(popupPage2.locator(".bookmark-item")).toContainText(testTitle, {
      timeout: 5000,
    });
    await popupPage2.close();
  });

  test("修改密码后旧密码应无法解密新数据", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);

    // 添加一个测试书签
    await popupPage.fill(PopupSelectors.unlockPasswordInput, oldPassword);
    await popupPage.click(PopupSelectors.unlockButton);
    await expect(popupPage.locator(PopupSelectors.unlockedContent)).toBeVisible({
      timeout: 10000,
    });

    // 快速添加书签
    await popupPage.click(PopupSelectors.btnQuickAdd);
    const testUrl = "https://example.com/old-password-test";
    const testTitle = "Old Password Test";
    await popupPage.fill('input[placeholder="输入网址"]', testUrl);
    await popupPage.fill('input[placeholder="输入标题"]', testTitle);
    await popupPage.click('button:has-text("保存")');
    await popupPage.waitForTimeout(500);
    await popupPage.close();

    // 修改密码
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    await optionsPage.click('text=修改主密码');
    await optionsPage.waitForTimeout(500);

    await optionsPage
      .locator('input[placeholder="输入当前密码"]')
      .fill(oldPassword);
    await optionsPage
      .locator('input[placeholder="输入新密码"]')
      .fill(newPassword);
    await optionsPage
      .locator('input[placeholder="再次输入新密码"]')
      .fill(newPassword);

    await optionsPage.click('button:has-text("确认修改")');
    await optionsPage.waitForTimeout(1000);
    await optionsPage.close();

    // 用旧密码尝试解锁应该失败
    const popupPage2 = await createPopupPage(extensionContext, extensionId);
    await popupPage2.fill(PopupSelectors.unlockPasswordInput, oldPassword);

    // 点击解锁按钮
    await popupPage2.click(PopupSelectors.unlockButton);

    // 旧密码应该无法解锁（要么显示错误，要么保持锁定状态）
    // 我们期望看到错误提示或者无法进入主界面
    await popupPage2.waitForTimeout(500);

    // 验证旧密码无法解锁 - 应该仍然在解锁页面或者显示错误
    const isUnlocked = await popupPage2.locator(PopupSelectors.unlockedContent).isVisible().catch(() => false);
    expect(isUnlocked).toBe(false);
    await popupPage2.close();

    // 用新密码解锁应该成功
    const popupPage3 = await createPopupPage(extensionContext, extensionId);
    await popupPage3.fill(PopupSelectors.unlockPasswordInput, newPassword);
    await popupPage3.click(PopupSelectors.unlockButton);
    await expect(popupPage3.locator(PopupSelectors.unlockedContent)).toBeVisible({
      timeout: 10000,
    });
    await popupPage3.close();
  });

  test("修改密码后文件夹和标签数据应正确迁移", async ({
    extensionContext,
    extensionId,
  }) => {
    const popupPage = await createPopupPage(extensionContext, extensionId);

    // 用旧密码解锁
    await popupPage.fill(PopupSelectors.unlockPasswordInput, oldPassword);
    await popupPage.click(PopupSelectors.unlockButton);
    await expect(popupPage.locator(PopupSelectors.unlockedContent)).toBeVisible({
      timeout: 10000,
    });

    // 创建文件夹
    await popupPage.click(PopupSelectors.sidebarTabFolders);
    await popupPage.click(PopupSelectors.folderCreateBtn);
    const testFolderName = "Test Folder for Migration";
    await popupPage.fill(PopupSelectors.inlineEditInput, testFolderName);
    await popupPage.click(PopupSelectors.inlineEditConfirm);
    await popupPage.waitForTimeout(500);
    await popupPage.close();

    // 修改密码
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    await optionsPage.locator(OptionsSelectors.tabSecurity).click();
    await optionsPage.click('text=修改主密码');
    await optionsPage.waitForTimeout(500);

    await optionsPage
      .locator('input[placeholder="输入当前密码"]')
      .fill(oldPassword);
    await optionsPage
      .locator('input[placeholder="输入新密码"]')
      .fill(newPassword);
    await optionsPage
      .locator('input[placeholder="再次输入新密码"]')
      .fill(newPassword);

    await optionsPage.click('button:has-text("确认修改")');
    await optionsPage.waitForTimeout(1000);
    await optionsPage.close();

    // 用新密码解锁并验证文件夹数据
    const popupPage2 = await createPopupPage(extensionContext, extensionId);
    await popupPage2.fill(PopupSelectors.unlockPasswordInput, newPassword);
    await popupPage2.click(PopupSelectors.unlockButton);
    await expect(
      popupPage2.locator(PopupSelectors.unlockedContent)
    ).toBeVisible({ timeout: 10000 });

    // 验证文件夹存在
    await popupPage2.click(PopupSelectors.sidebarTabFolders);
    await expect(popupPage2.locator(PopupSelectors.folderList)).toContainText(
      testFolderName,
      { timeout: 5000 }
    );
    await popupPage2.close();
  });
});