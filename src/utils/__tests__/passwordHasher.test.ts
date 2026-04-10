import { describe, it, expect } from "vitest";
import { PasswordHasher } from "@/utils/passwordHasher";

describe("PasswordHasher", () => {
  describe("hash", () => {
    it("应返回包含所有必要字段的 StoredPassword 对象", async () => {
      const result = await PasswordHasher.hash("TestPassword123!");

      expect(result).toHaveProperty("passwordHash");
      expect(result).toHaveProperty("salt");
      expect(result).toHaveProperty("iterations");
      expect(result).toHaveProperty("algorithm");
      expect(result).toHaveProperty("createdAt");
      expect(result.algorithm).toBe("PBKDF2");
      expect(result.iterations).toBe(100000);
      expect(typeof result.createdAt).toBe("number");
    });

    it("每次哈希结果应不同（因为盐值随机）", async () => {
      const result1 = await PasswordHasher.hash("SamePassword");
      const result2 = await PasswordHasher.hash("SamePassword");

      expect(result1.passwordHash).not.toBe(result2.passwordHash);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it("哈希值应为 hex 字符串", async () => {
      const result = await PasswordHasher.hash("TestPassword");

      expect(result.passwordHash).toMatch(/^[0-9a-f]+$/);
      expect(result.salt).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("verify", () => {
    it("正确密码应验证通过", async () => {
      const password = "CorrectPassword123!";
      const stored = await PasswordHasher.hash(password);
      const isValid = await PasswordHasher.verify(password, stored);

      expect(isValid).toBe(true);
    });

    it("错误密码应验证失败", async () => {
      const stored = await PasswordHasher.hash("CorrectPassword");
      const isValid = await PasswordHasher.verify("WrongPassword", stored);

      expect(isValid).toBe(false);
    });

    it("空密码哈希后也能正确验证", async () => {
      const stored = await PasswordHasher.hash("");
      const isValid = await PasswordHasher.verify("", stored);

      expect(isValid).toBe(true);
    });

    it("篡改盐值后验证应失败", async () => {
      const stored = await PasswordHasher.hash("TestPassword");
      stored.salt = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 篡改盐值
      const isValid = await PasswordHasher.verify("TestPassword", stored);

      expect(isValid).toBe(false);
    });
  });
});
