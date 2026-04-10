import { describe, it, expect } from "vitest";
import { LockService } from "@/services/LockService";

describe("LockService", () => {
  describe("getLockSettings", () => {
    it("应返回默认锁定设置", async () => {
      const settings = await LockService.getLockSettings();
      expect(settings.autoLockMinutes).toBe(15);
      expect(settings.lockOnBrowserClose).toBe(true);
      expect(Array.isArray(settings.reminderSeconds)).toBe(true);
    });
  });

  describe("saveLockSettings", () => {
    it("应保存并读取自定义设置", async () => {
      const customSettings = {
        autoLockMinutes: 30,
        lockOnBrowserClose: false,
        reminderSeconds: [60, 30],
      };
      await LockService.saveLockSettings(customSettings);
      const settings = await LockService.getLockSettings();
      expect(settings.autoLockMinutes).toBe(30);
      expect(settings.lockOnBrowserClose).toBe(false);
    });
  });

  describe("getLockTimeout", () => {
    it("默认应返回 15 分钟", async () => {
      const timeout = await LockService.getLockTimeout();
      expect(timeout).toBe(15);
    });
  });

  describe("shouldLockOnStartup", () => {
    it("默认应返回 true", async () => {
      const shouldLock = await LockService.shouldLockOnStartup();
      expect(shouldLock).toBe(true);
    });
  });

  describe("onLock / onReminder", () => {
    it("应注册锁定回调", () => {
      const callback = () => {};
      // 不应抛出错误
      expect(() => LockService.onLock(callback)).not.toThrow();
    });

    it("应注册提醒回调", () => {
      const callback = (_seconds: number) => {};
      expect(() => LockService.onReminder(callback)).not.toThrow();
    });
  });

  describe("stopTimer", () => {
    it("停止计时器不应抛出错误", () => {
      expect(() => LockService.stopTimer()).not.toThrow();
    });
  });
});
