import { describe, it, expect } from "vitest";
import { PasswordValidator } from "@/utils/passwordValidator";
import { PasswordStrength } from "@/types/auth";

describe("PasswordValidator", () => {
  describe("isValidLength", () => {
    it("6 位密码应通过长度校验", () => {
      expect(PasswordValidator.isValidLength("123456")).toBe(true);
    });

    it("20 位密码应通过长度校验", () => {
      expect(PasswordValidator.isValidLength("a".repeat(20))).toBe(true);
    });

    it("5 位密码应不通过长度校验", () => {
      expect(PasswordValidator.isValidLength("12345")).toBe(false);
    });

    it("21 位密码应不通过长度校验", () => {
      expect(PasswordValidator.isValidLength("a".repeat(21))).toBe(false);
    });

    it("空密码应不通过长度校验", () => {
      expect(PasswordValidator.isValidLength("")).toBe(false);
    });
  });

  describe("evaluate", () => {
    it("强密码应返回 STRONG", () => {
      const result = PasswordValidator.evaluate("Str0ng!Pass#2024");
      expect(result.strength).toBe(PasswordStrength.STRONG);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("过短密码应返回 WEAK 并提示长度", () => {
      const result = PasswordValidator.evaluate("abc");
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.score).toBe(0);
      expect(result.feedback.some((f) => f.includes("长度"))).toBe(true);
    });

    it("过长密码应返回 WEAK 并提示长度", () => {
      const result = PasswordValidator.evaluate("a".repeat(21));
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.feedback.some((f) => f.includes("长度"))).toBe(true);
    });

    it("空密码应返回 WEAK", () => {
      const result = PasswordValidator.evaluate("");
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.score).toBe(0);
    });

    it("常见弱密码应被识别", () => {
      const result = PasswordValidator.evaluate("password");
      expect(result.feedback.some((f) => f.includes("常见"))).toBe(true);
    });

    it("纯数字密码应建议添加其他字符类型", () => {
      const result = PasswordValidator.evaluate("12345678");
      expect(result.feedback.some((f) => f.includes("建议添加"))).toBe(true);
    });

    it("包含连续字符应被提示", () => {
      const result = PasswordValidator.evaluate("abc123xyz");
      expect(result.feedback.some((f) => f.includes("连续字符"))).toBe(true);
    });

    it("包含重复字符应被提示", () => {
      const result = PasswordValidator.evaluate("aaa123bbb");
      expect(result.feedback.some((f) => f.includes("重复字符"))).toBe(true);
    });

    it("中等强度密码应返回 MEDIUM", () => {
      const result = PasswordValidator.evaluate("Hello1w9");
      expect(result.strength).toBe(PasswordStrength.MEDIUM);
    });
  });

  describe("getRequirements", () => {
    it("应返回密码要求说明数组", () => {
      const requirements = PasswordValidator.getRequirements();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.some((r) => r.includes("6"))).toBe(true);
    });
  });
});
