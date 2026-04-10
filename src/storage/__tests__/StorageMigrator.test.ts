import { describe, it, expect, vi } from "vitest";
import { StorageMigrator } from "@/storage/services/StorageMigrator";
import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import type { EncryptedData } from "@/types/data";

// 创建 Mock 存储适配器
function createMockAdapter(
  type: "chrome" | "filesystem",
  data: EncryptedData | null = null,
): IStorageAdapter {
  let storedData = data;
  return {
    read: vi.fn(async () => storedData),
    write: vi.fn(async (d: EncryptedData) => {
      storedData = d;
    }),
    clear: vi.fn(async () => {
      storedData = null;
    }),
    getCapacity: vi.fn(async () => ({
      used: 0,
      total: 10485760,
      usagePercent: 0,
    })),
    isAvailable: vi.fn(async () => true),
    getType: () => type,
  };
}

describe("StorageMigrator", () => {
  let migrator: StorageMigrator;

  // 需要一个带有效 checksum 的数据，但 checksum 计算依赖 crypto.subtle
  // 我们测试迁移流程的结构性行为

  beforeEach(() => {
    migrator = new StorageMigrator();
  });

  describe("migrate", () => {
    it("源存储无数据时应返回失败", async () => {
      const source = createMockAdapter("chrome", null);
      const target = createMockAdapter("filesystem");

      const result = await migrator.migrate(source, target);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应调用进度回调", async () => {
      const source = createMockAdapter("chrome", null);
      const target = createMockAdapter("filesystem");
      const onProgress = vi.fn();

      await migrator.migrate(source, target, false, onProgress);
      // 至少应调用一次进度回调（reading 阶段）
      expect(onProgress).toHaveBeenCalled();
    });

    it("迁移结果应包含正确的源和目标类型", async () => {
      const source = createMockAdapter("chrome", null);
      const target = createMockAdapter("filesystem");

      const result = await migrator.migrate(source, target);
      expect(result.sourceType).toBe("chrome");
      expect(result.targetType).toBe("filesystem");
    });
  });

  describe("verifyConsistency", () => {
    it("两个空存储应一致", async () => {
      const adapter1 = createMockAdapter("chrome", null);
      const adapter2 = createMockAdapter("filesystem", null);

      const consistent = await migrator.verifyConsistency(adapter1, adapter2);
      expect(consistent).toBe(true);
    });

    it("一个空一个非空应不一致", async () => {
      const mockData: EncryptedData = {
        version: 1,
        salt: "salt",
        iv: "iv",
        ciphertext: "cipher",
        checksum: "check",
      };
      const adapter1 = createMockAdapter("chrome", mockData);
      const adapter2 = createMockAdapter("filesystem", null);

      const consistent = await migrator.verifyConsistency(adapter1, adapter2);
      expect(consistent).toBe(false);
    });

    it("相同数据应一致", async () => {
      const mockData: EncryptedData = {
        version: 1,
        salt: "salt",
        iv: "iv",
        ciphertext: "cipher",
        checksum: "check",
      };
      const adapter1 = createMockAdapter("chrome", { ...mockData });
      const adapter2 = createMockAdapter("filesystem", { ...mockData });

      const consistent = await migrator.verifyConsistency(adapter1, adapter2);
      expect(consistent).toBe(true);
    });
  });

  describe("createBackup", () => {
    it("无数据时应返回 null", async () => {
      const adapter = createMockAdapter("chrome", null);
      const backup = await migrator.createBackup(adapter);
      expect(backup).toBeNull();
    });
  });
});
