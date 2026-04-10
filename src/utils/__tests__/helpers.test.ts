import { describe, it, expect, vi } from "vitest";
import { debounce, isValidUrl, truncateText } from "@/utils/helpers";

describe("helpers", () => {
  describe("debounce", () => {
    it("应在等待时间后执行函数", async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("多次调用应只执行最后一次", async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("应传递正确的参数", async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");

      vi.useRealTimers();
    });
  });

  describe("isValidUrl", () => {
    it("https URL 应有效", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("http URL 应有效", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("ftp URL 应无效", () => {
      expect(isValidUrl("ftp://example.com")).toBe(false);
    });

    it("无协议字符串应无效", () => {
      expect(isValidUrl("example.com")).toBe(false);
    });

    it("空字符串应无效", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("javascript: 协议应无效", () => {
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("truncateText", () => {
    it("短文本应保持不变", () => {
      expect(truncateText("hello", 10)).toBe("hello");
    });

    it("超长文本应被截断并添加省略号", () => {
      expect(truncateText("hello world", 5)).toBe("hello...");
    });

    it("刚好等于最大长度应保持不变", () => {
      expect(truncateText("hello", 5)).toBe("hello");
    });

    it("空字符串应保持不变", () => {
      expect(truncateText("", 10)).toBe("");
    });
  });
});
