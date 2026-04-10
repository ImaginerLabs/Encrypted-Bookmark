import { describe, it, expect } from "vitest";
import { getFaviconUrl } from "@/utils/favicon";

describe("favicon", () => {
  describe("getFaviconUrl", () => {
    it("有效 URL 应返回 Google Favicon Service 地址", () => {
      const result = getFaviconUrl("https://example.com/page");
      expect(result).toBe(
        "https://www.google.com/s2/favicons?domain=example.com&sz=32",
      );
    });

    it("带端口的 URL 应正确提取 hostname", () => {
      const result = getFaviconUrl("https://example.com:8080/path");
      expect(result).toBe(
        "https://www.google.com/s2/favicons?domain=example.com&sz=32",
      );
    });

    it("带子域名的 URL 应正确提取", () => {
      const result = getFaviconUrl("https://sub.example.com");
      expect(result).toContain("sub.example.com");
    });

    it("无效 URL 应返回默认图标", () => {
      const result = getFaviconUrl("not-a-url");
      expect(result).toBe("/icons/icon16.png");
    });

    it("空字符串应返回默认图标", () => {
      const result = getFaviconUrl("");
      expect(result).toBe("/icons/icon16.png");
    });

    it("http 协议 URL 也应正常工作", () => {
      const result = getFaviconUrl("http://example.com");
      expect(result).toContain("example.com");
    });
  });
});
