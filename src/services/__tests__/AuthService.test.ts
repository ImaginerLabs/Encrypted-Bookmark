import { describe, it, expect } from "vitest";
import { AuthService } from "@/services/AuthService";

describe("AuthService", () => {
  describe("isPasswordSet", () => {
    it("初始状态应返回 false", async () => {
      const isSet = await AuthService.isPasswordSet();
      expect(isSet).toBe(false);
    });
  });

  describe("setPassword", () => {
    it("首次设置有效密码应成功", async () => {
      const result = await AuthService.setPassword("ValidPass1!");
      expect(result.success).toBe(true);
    });

    it("设置后 isPasswordSet 应返回 true", async () => {
      await AuthService.setPassword("ValidPass1!");
      const isSet = await AuthService.isPasswordSet();
      expect(isSet).toBe(true);
    });

    it("重复设置应失败", async () => {
      await AuthService.setPassword("ValidPass1!");
      const result = await AuthService.setPassword("AnotherPass1!");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PASSWORD_ALREADY_SET");
    });

    it("过短密码应失败", async () => {
      const result = await AuthService.setPassword("ab");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PASSWORD_LENGTH");
    });
  });

  describe("verifyPassword", () => {
    it("正确密码应验证成功", async () => {
      const password = "CorrectPass1!";
      await AuthService.setPassword(password);
      const result = await AuthService.verifyPassword(password);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it("错误密码应验证失败", async () => {
      await AuthService.setPassword("CorrectPass1!");
      const result = await AuthService.verifyPassword("WrongPass");
      expect(result.success).toBe(false);
      expect(result.data).toBe(false);
    });

    it("未设置密码时应返回错误", async () => {
      const result = await AuthService.verifyPassword("anypass");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PASSWORD_NOT_SET");
    });
  });

  describe("checkLockStatus", () => {
    it("初始状态应未锁定", async () => {
      const status = await AuthService.checkLockStatus();
      expect(status.isLocked).toBe(false);
    });
  });

  describe("getRemainingAttempts", () => {
    it("初始应有 3 次尝试机会", async () => {
      const remaining = await AuthService.getRemainingAttempts();
      expect(remaining).toBe(3);
    });
  });

  describe("changePassword", () => {
    it("提供正确旧密码和有效新密码应成功", async () => {
      const oldPass = "OldPass123!";
      const newPass = "NewPass456!";
      await AuthService.setPassword(oldPass);
      const result = await AuthService.changePassword(oldPass, newPass);
      expect(result.success).toBe(true);

      // 验证新密码可用
      const verify = await AuthService.verifyPassword(newPass);
      expect(verify.success).toBe(true);
    });

    it("旧密码错误应失败", async () => {
      await AuthService.setPassword("OldPass123!");
      const result = await AuthService.changePassword(
        "WrongOld",
        "NewPass456!",
      );
      expect(result.success).toBe(false);
    });
  });
});
