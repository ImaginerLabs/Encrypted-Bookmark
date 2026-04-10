import { describe, it, expect } from "vitest";
import { PasswordService } from "@/services/PasswordService";

describe("PasswordService", () => {
  describe("validatePasswordStrength", () => {
    it("有效密码不应抛出错误", () => {
      expect(() =>
        PasswordService.validatePasswordStrength("ValidPass1!"),
      ).not.toThrow();
    });

    it("过短密码应抛出 WeakPasswordError", () => {
      expect(() => PasswordService.validatePasswordStrength("short")).toThrow(
        "长度不足",
      );
    });

    it("过长密码应抛出 WeakPasswordError", () => {
      expect(() =>
        PasswordService.validatePasswordStrength("a".repeat(33)),
      ).toThrow("长度过长");
    });

    it("刚好 8 位应通过", () => {
      expect(() =>
        PasswordService.validatePasswordStrength("12345678"),
      ).not.toThrow();
    });

    it("刚好 32 位应通过", () => {
      expect(() =>
        PasswordService.validatePasswordStrength("a".repeat(32)),
      ).not.toThrow();
    });
  });

  describe("getPasswordStatus", () => {
    it("初始状态应为未设置", async () => {
      const status = await PasswordService.getPasswordStatus();
      expect(status.isSet).toBe(false);
      expect(status.failedAttempts).toBe(0);
    });
  });

  describe("isUnlocked / getMasterKey", () => {
    it("初始应为锁定状态", () => {
      expect(PasswordService.isUnlocked()).toBe(false);
      expect(PasswordService.getMasterKey()).toBeNull();
    });
  });

  describe("lock", () => {
    it("锁定不应抛出错误", async () => {
      await expect(PasswordService.lock()).resolves.toBeUndefined();
    });

    it("锁定后 isUnlocked 应为 false", async () => {
      await PasswordService.lock();
      expect(PasswordService.isUnlocked()).toBe(false);
      expect(PasswordService.getMasterKey()).toBeNull();
    });
  });

  // 注意：setMasterPassword 和 verifyMasterPassword 依赖 EncryptionService.hashPassword
  // 在 Node.js 环境下由于 btoa/ArrayBuffer realm 差异，hashPassword 返回空字符串
  // 这些集成测试更适合在 E2E 测试中覆盖
});
