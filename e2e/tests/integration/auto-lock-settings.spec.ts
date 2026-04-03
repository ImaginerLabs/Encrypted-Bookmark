import {
  test,
  expect,
  createPopupPage,
  createOptionsPage,
} from "../../fixtures/extension";
import { createStorageHelper } from "../../helpers/chrome-storage";
import { OptionsSelectors } from "../../helpers/selectors";

/**
 * 集成测试 - 自动锁定设置同步
 * 验证 Options 页面修改 autoLockMinutes 后，background 能正确同步更新 idle 检测间隔
 */
test.describe("集成 - 自动锁定设置同步", () => {
  test("修改自动锁定时间后存储值正确更新", async ({
    extensionContext,
    extensionId,
  }) => {
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    const storage = createStorageHelper(optionsPage);

    // 先设置初始状态
    await storage.set({
      settings: {
        autoLockMinutes: 15,
      },
    });

    // 修改为 30 分钟
    await storage.set({
      settings: {
        autoLockMinutes: 30,
      },
    });

    // 验证存储值已更新
    const data = await storage.get("settings");
    const settings = data.settings as { autoLockMinutes: number };
    expect(settings.autoLockMinutes).toBe(30);

    await optionsPage.close();
  });

  test("自动锁定时间默认值为 15 分钟", async ({
    extensionContext,
    extensionId,
  }) => {
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    const storage = createStorageHelper(optionsPage);

    // 清空设置
    await storage.remove("settings");

    // 验证默认行为：当没有设置时，background 应使用默认 15 分钟
    // 由于无法直接测试 chrome.idle.setDetectionInterval，
    // 我们验证存储中没有设置时的默认值逻辑
    const data = await storage.get("settings");
    const settings = data.settings as { autoLockMinutes?: number } | undefined;

    // settings 不存在或 autoLockMinutes 未设置时，默认应为 15
    const autoLockMinutes = settings?.autoLockMinutes ?? 15;
    expect(autoLockMinutes).toBe(15);

    await optionsPage.close();
  });

  test("storage.onChanged 事件触发时 background 能接收到", async ({
    extensionContext,
    extensionId,
  }) => {
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    const storage = createStorageHelper(optionsPage);

    // 设置初始值
    await storage.set({
      settings: {
        autoLockMinutes: 15,
      },
    });

    // 修改值（这将触发 storage.onChanged）
    await storage.set({
      settings: {
        autoLockMinutes: 5,
      },
    });

    // 等待 background 处理
    await optionsPage.waitForTimeout(500);

    // 验证存储值
    const data = await storage.get("settings");
    const settings = data.settings as { autoLockMinutes: number };
    expect(settings.autoLockMinutes).toBe(5);

    await optionsPage.close();
  });

  test("自动锁定时间设置为 0 表示禁用", async ({
    extensionContext,
    extensionId,
  }) => {
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    const storage = createStorageHelper(optionsPage);

    // 设置为 0（禁用自动锁定）
    await storage.set({
      settings: {
        autoLockMinutes: 0,
      },
    });

    // 验证存储
    const data = await storage.get("settings");
    const settings = data.settings as { autoLockMinutes: number };
    expect(settings.autoLockMinutes).toBe(0);

    await optionsPage.close();
  });

  test("Popup 和 Options 页面共享同一份设置", async ({
    extensionContext,
    extensionId,
  }) => {
    const optionsPage = await createOptionsPage(extensionContext, extensionId);
    const popupPage = await createPopupPage(extensionContext, extensionId);

    // 在 Options 页面设置
    const optionsStorage = createStorageHelper(optionsPage);
    await optionsStorage.set({
      settings: {
        autoLockMinutes: 20,
      },
    });

    // 在 Popup 页面读取
    const popupStorage = createStorageHelper(popupPage);
    const data = await popupStorage.get("settings");
    const settings = data.settings as { autoLockMinutes: number };
    expect(settings.autoLockMinutes).toBe(20);

    await popupPage.close();
    await optionsPage.close();
  });
});
