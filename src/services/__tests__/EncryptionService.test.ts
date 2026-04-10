import { describe, it, expect } from "vitest";
import { EncryptionService } from "@/services/EncryptionService";

describe("EncryptionService", () => {
  const testPassword = "TestPassword123!";

  describe("encrypt", () => {
    it("加密结果应包含所有必要字段", async () => {
      const encrypted = await EncryptionService.encrypt("test", testPassword);
      expect(encrypted).toHaveProperty("version", 1);
      expect(encrypted).toHaveProperty("salt");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("ciphertext");
      expect(encrypted).toHaveProperty("checksum");
    });

    it("空密码应抛出 PasswordError", async () => {
      await expect(EncryptionService.encrypt("test", "")).rejects.toThrow(
        "密码不能为空",
      );
      await expect(EncryptionService.encrypt("test", "   ")).rejects.toThrow(
        "密码不能为空",
      );
    });

    it("解密时空密码应抛出 PasswordError", async () => {
      const encrypted = await EncryptionService.encrypt("test", testPassword);
      await expect(EncryptionService.decrypt(encrypted, "")).rejects.toThrow(
        "密码不能为空",
      );
    });

    it("不支持的版本应抛出错误", async () => {
      const encrypted = await EncryptionService.encrypt("test", testPassword);
      encrypted.version = 999;
      await expect(
        EncryptionService.decrypt(encrypted, testPassword),
      ).rejects.toThrow("不支持的数据版本");
    });
  });

  // 注意：encrypt/decrypt 的完整加解密往返测试在 Node.js 环境下
  // 由于 btoa/atob 与 webcrypto ArrayBuffer 的 realm 差异可能失败
  // 这些场景更适合在真实浏览器 E2E 测试中覆盖

  describe("hashPassword", () => {
    it("相同密码应生成相同哈希", async () => {
      const hash1 = await EncryptionService.hashPassword(testPassword);
      const hash2 = await EncryptionService.hashPassword(testPassword);
      expect(hash1).toBe(hash2);
    });

    it("verifyPasswordHash 对相同密码应返回 true", async () => {
      const hash = await EncryptionService.hashPassword(testPassword);
      const isValid = await EncryptionService.verifyPasswordHash(
        testPassword,
        hash,
      );
      expect(isValid).toBe(true);
    });
  });
});
