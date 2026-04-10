import { describe, it, expect } from "vitest";
import { XSSProtection } from "@/utils/xssProtection";

describe("XSSProtection", () => {
  describe("escapeHtml", () => {
    it("应转义 & 字符", () => {
      expect(XSSProtection.escapeHtml("a&b")).toBe("a&amp;b");
    });

    it("应转义 < 和 > 字符", () => {
      expect(XSSProtection.escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("应转义引号字符", () => {
      expect(XSSProtection.escapeHtml('"hello"')).toBe("&quot;hello&quot;");
      expect(XSSProtection.escapeHtml("'hello'")).toBe("&#x27;hello&#x27;");
    });

    it("应转义斜杠", () => {
      expect(XSSProtection.escapeHtml("a/b")).toBe("a&#x2F;b");
    });

    it("安全字符串应保持不变", () => {
      expect(XSSProtection.escapeHtml("hello world")).toBe("hello world");
    });

    it("应处理空字符串", () => {
      expect(XSSProtection.escapeHtml("")).toBe("");
    });

    it("应转义完整的 script 标签", () => {
      const input = '<script>alert("xss")</script>';
      const result = XSSProtection.escapeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });
  });

  describe("sanitizeInput", () => {
    it("应移除 HTML 标签", () => {
      expect(XSSProtection.sanitizeInput("<b>bold</b>")).toBe("bold");
    });

    it("应移除 script 标签及内容", () => {
      const result = XSSProtection.sanitizeInput("<script>alert(1)</script>");
      expect(result).not.toContain("script");
    });

    it("应移除 javascript: 协议", () => {
      const result = XSSProtection.sanitizeInput("javascript:alert(1)");
      expect(result).not.toContain("javascript:");
    });

    it("应移除事件处理器", () => {
      const result = XSSProtection.sanitizeInput("onclick=alert(1)");
      expect(result).not.toMatch(/onclick\s*=/i);
    });

    it("应 trim 结果", () => {
      expect(XSSProtection.sanitizeInput("  hello  ")).toBe("hello");
    });

    it("安全文本应保持不变", () => {
      expect(XSSProtection.sanitizeInput("hello world")).toBe("hello world");
    });
  });

  describe("isUrlSafe", () => {
    it("http URL 应安全", () => {
      expect(XSSProtection.isUrlSafe("http://example.com")).toBe(true);
    });

    it("https URL 应安全", () => {
      expect(XSSProtection.isUrlSafe("https://example.com")).toBe(true);
    });

    it("javascript: 协议应不安全", () => {
      expect(XSSProtection.isUrlSafe("javascript:alert(1)")).toBe(false);
    });

    it("data: 协议应不安全", () => {
      expect(XSSProtection.isUrlSafe("data:text/html,<h1>test</h1>")).toBe(
        false,
      );
    });

    it("相对 URL 应安全", () => {
      expect(XSSProtection.isUrlSafe("/path/to/page")).toBe(true);
    });

    it("大小写混合的危险协议应被检测", () => {
      expect(XSSProtection.isUrlSafe("JavaScript:alert(1)")).toBe(false);
    });
  });

  describe("sanitizeBookmarkTitle", () => {
    it("应清理 HTML 标签", () => {
      const result = XSSProtection.sanitizeBookmarkTitle("<b>Title</b>");
      expect(result).toBe("Title");
    });

    it("应限制长度为 200 字符", () => {
      const longTitle = "a".repeat(300);
      const result = XSSProtection.sanitizeBookmarkTitle(longTitle);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe("sanitizeBookmarkUrl", () => {
    it("安全 URL 应正常返回", () => {
      const url = "https://example.com/path";
      expect(XSSProtection.sanitizeBookmarkUrl(url)).toBe(url);
    });

    it("不安全 URL 应抛出错误", () => {
      expect(() =>
        XSSProtection.sanitizeBookmarkUrl("javascript:alert(1)"),
      ).toThrow("URL 不安全");
    });

    it("应限制 URL 长度为 2048", () => {
      const longUrl = "https://example.com/" + "a".repeat(3000);
      const result = XSSProtection.sanitizeBookmarkUrl(longUrl);
      expect(result.length).toBeLessThanOrEqual(2048);
    });
  });

  describe("sanitizeNote", () => {
    it("应清理 HTML 标签", () => {
      expect(XSSProtection.sanitizeNote("<p>Note</p>")).toBe("Note");
    });

    it("应限制长度为 1000 字符", () => {
      const longNote = "a".repeat(1500);
      const result = XSSProtection.sanitizeNote(longNote);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });
});
