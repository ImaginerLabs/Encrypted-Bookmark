import { describe, it, expect } from "vitest";
import { SettingsService } from "@/services/SettingsService";
import { PasswordStrengthLevel } from "@/types/settings";

describe("SettingsService", () => {
  describe("getSettings", () => {
    it("初始应返回默认设置", async () => {
      const settings = await SettingsService.getSettings();
      expect(settings.storage.type).toBe("chrome");
      expect(settings.security.autoLockMinutes).toBe(15);
      expect(settings.security.lockOnBrowserClose).toBe(true);
      expect(settings.basic.openInNewTab).toBe(true);
    });
  });

  describe("saveSettings", () => {
    it("应保存并读取自定义设置", async () => {
      await SettingsService.saveSettings({
        security: { autoLockMinutes: 30, lockOnBrowserClose: false },
      });
      const settings = await SettingsService.getSettings();
      expect(settings.security.autoLockMinutes).toBe(30);
      expect(settings.security.lockOnBrowserClose).toBe(false);
      // 其他设置应保持默认
      expect(settings.storage.type).toBe("chrome");
    });
  });

  describe("getStorageSettings", () => {
    it("应返回存储设置", async () => {
      const storage = await SettingsService.getStorageSettings();
      expect(storage.type).toBe("chrome");
    });
  });

  describe("getSecuritySettings", () => {
    it("应返回安全设置", async () => {
      const security = await SettingsService.getSecuritySettings();
      expect(security.autoLockMinutes).toBe(15);
    });
  });

  describe("getBasicSettings", () => {
    it("应返回基本设置", async () => {
      const basic = await SettingsService.getBasicSettings();
      expect(basic.openInNewTab).toBe(true);
    });
  });

  describe("saveSecuritySettings", () => {
    it("应保存安全设置", async () => {
      await SettingsService.saveSecuritySettings({ autoLockMinutes: 5 });
      const security = await SettingsService.getSecuritySettings();
      expect(security.autoLockMinutes).toBe(5);
    });
  });

  describe("evaluatePasswordStrength", () => {
    it("强密码应返回 STRONG", () => {
      const result =
        SettingsService.evaluatePasswordStrength("Str0ng!Pass#2024");
      expect(result.level).toBe(PasswordStrengthLevel.STRONG);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("弱密码应返回 WEAK", () => {
      const result = SettingsService.evaluatePasswordStrength("abc");
      expect(result.level).toBe(PasswordStrengthLevel.WEAK);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it("中等密码应返回 MEDIUM", () => {
      const result = SettingsService.evaluatePasswordStrength("Hello1234");
      expect(result.level).toBe(PasswordStrengthLevel.MEDIUM);
    });
  });

  describe("resetToDefault", () => {
    it("重置后应恢复默认设置", async () => {
      await SettingsService.saveSettings({
        security: { autoLockMinutes: 99, lockOnBrowserClose: false },
      });
      await SettingsService.resetToDefault();
      const settings = await SettingsService.getSettings();
      expect(settings.security.autoLockMinutes).toBe(15);
    });
  });
});
