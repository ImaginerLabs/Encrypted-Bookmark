import { describe, it, expect, beforeEach } from "vitest";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";
import type { EncryptedData } from "@/types/data";

const mockEncryptedData: EncryptedData = {
  version: 1,
  salt: "dGVzdHNhbHQ=",
  iv: "dGVzdGl2",
  ciphertext: "ZW5jcnlwdGVkZGF0YQ==",
  checksum: "Y2hlY2tzdW0=",
};

describe("ChromeStorageAdapter", () => {
  let adapter: ChromeStorageAdapter;

  beforeEach(() => {
    // 每次测试创建新实例，避免单例缓存影响
    adapter = new ChromeStorageAdapter("test_key");
  });

  describe("read", () => {
    it("无数据时应返回 null", async () => {
      const result = await adapter.read();
      expect(result).toBeNull();
    });

    it("有数据时应返回 EncryptedData", async () => {
      // 先写入数据
      await chrome.storage.local.set({ test_key: mockEncryptedData });
      const result = await adapter.read();
      expect(result).toEqual(mockEncryptedData);
    });
  });

  describe("write", () => {
    it("应成功写入有效数据", async () => {
      await adapter.write(mockEncryptedData);
      const stored = await chrome.storage.local.get("test_key");
      expect(stored.test_key).toEqual(mockEncryptedData);
    });

    it("无效数据应抛出错误", async () => {
      const invalidData = { version: 1 } as EncryptedData;
      await expect(adapter.write(invalidData)).rejects.toThrow();
    });
  });

  describe("clear", () => {
    it("应清空存储数据", async () => {
      await chrome.storage.local.set({ test_key: mockEncryptedData });
      await adapter.clear();
      const stored = await chrome.storage.local.get("test_key");
      expect(stored.test_key).toBeUndefined();
    });
  });

  describe("getCapacity", () => {
    it("应返回容量信息", async () => {
      const capacity = await adapter.getCapacity();
      expect(capacity).toHaveProperty("used");
      expect(capacity).toHaveProperty("total");
      expect(capacity).toHaveProperty("usagePercent");
      expect(capacity.total).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe("isAvailable", () => {
    it("Chrome Storage 可用时应返回 true", async () => {
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe("getType", () => {
    it("应返回 chrome", () => {
      expect(adapter.getType()).toBe("chrome");
    });
  });
});
