/**
 * Smoke Test - 验证测试基础设施正常工作
 */
import { describe, it, expect } from "vitest";

describe("测试基础设施 Smoke Test", () => {
  describe("Vitest 环境", () => {
    it("基本断言可用", () => {
      expect(1 + 1).toBe(2);
      expect("hello").toContain("ell");
      expect([1, 2, 3]).toHaveLength(3);
    });

    it("async/await 可用", async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe("Chrome API Mock", () => {
    it("chrome 全局对象存在", () => {
      expect(chrome).toBeDefined();
    });

    it("chrome.storage.local 可读写", async () => {
      await chrome.storage.local.set({ testKey: "testValue" });
      const result = await chrome.storage.local.get("testKey");
      expect(result).toEqual({ testKey: "testValue" });
    });

    it("chrome.storage.session 可读写", async () => {
      await chrome.storage.session.set({ sessionKey: "sessionValue" });
      const result = await chrome.storage.session.get("sessionKey");
      expect(result).toEqual({ sessionKey: "sessionValue" });
    });

    it("chrome.runtime.getManifest 返回 manifest", () => {
      const manifest = chrome.runtime.getManifest();
      expect(manifest.version).toBeDefined();
      expect(manifest.name).toBe("Encrypted Bookmark");
    });

    it("chrome.tabs.query 返回标签页", async () => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toBe("https://example.com");
    });
  });

  describe("Web Crypto API", () => {
    it("crypto 全局对象存在", () => {
      expect(crypto).toBeDefined();
      expect(crypto.subtle).toBeDefined();
    });

    it("crypto.getRandomValues 可用", () => {
      const array = new Uint8Array(16);
      const result = crypto.getRandomValues(array);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(16);
      // 验证不全是 0（极小概率全 0）
      const hasNonZero = Array.from(result).some((v) => v !== 0);
      expect(hasNonZero).toBe(true);
    });

    it("crypto.subtle.digest 可用", async () => {
      const data = new TextEncoder().encode("hello");
      const hash = await crypto.subtle.digest("SHA-256", data);
      // Node.js webcrypto 返回的可能是 Buffer，检查 byteLength 即可
      expect(hash.byteLength).toBe(32); // SHA-256 = 32 bytes
    });
  });

  describe("DOM 环境 (jsdom)", () => {
    it("document 全局对象存在", () => {
      expect(document).toBeDefined();
    });

    it("可以创建 DOM 元素", () => {
      const div = document.createElement("div");
      div.textContent = "test";
      expect(div.textContent).toBe("test");
    });

    it("TextEncoder/TextDecoder 可用", () => {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const encoded = encoder.encode("hello");
      const decoded = decoder.decode(encoded);
      expect(decoded).toBe("hello");
    });
  });
});
