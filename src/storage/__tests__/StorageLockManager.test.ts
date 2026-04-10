import { describe, it, expect, beforeEach } from "vitest";
import { StorageLockManager } from "@/storage/services/StorageLockManager";

describe("StorageLockManager", () => {
  let lockManager: StorageLockManager;

  beforeEach(() => {
    lockManager = new StorageLockManager();
  });

  describe("acquireReadLock / releaseReadLock", () => {
    it("应成功获取读锁", async () => {
      await lockManager.acquireReadLock("owner1", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(1);
      expect(status[0].info.operation).toBe("read");
    });

    it("应成功释放读锁", async () => {
      await lockManager.acquireReadLock("owner1", "test");
      lockManager.releaseReadLock("owner1", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(0);
    });

    it("非持有者不能释放读锁", async () => {
      await lockManager.acquireReadLock("owner1", "test");
      lockManager.releaseReadLock("owner2", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(1); // 锁仍然存在
    });
  });

  describe("acquireWriteLock / releaseWriteLock", () => {
    it("应成功获取写锁", async () => {
      await lockManager.acquireWriteLock("owner1", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(1);
      expect(status[0].info.operation).toBe("write");
    });

    it("应成功释放写锁", async () => {
      await lockManager.acquireWriteLock("owner1", "test");
      lockManager.releaseWriteLock("owner1", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(0);
    });

    it("同一持有者可重入写锁", async () => {
      await lockManager.acquireWriteLock("owner1", "test");
      // 同一持有者再次获取不应阻塞
      await lockManager.acquireWriteLock("owner1", "test");
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(1);
    });
  });

  describe("withLock", () => {
    it("应在操作完成后自动释放锁", async () => {
      const mockAdapter = {
        getType: () => "chrome" as const,
        read: async () => null,
        write: async () => {},
        clear: async () => {},
        getCapacity: async () => ({
          used: 0,
          total: 10485760,
          usagePercent: 0,
        }),
        isAvailable: async () => true,
      };

      const result = await lockManager.withLock(
        mockAdapter,
        async () => "test-result",
        "read",
      );

      expect(result).toBe("test-result");
      // 锁应已释放
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(0);
    });

    it("操作抛出错误时也应释放锁", async () => {
      const mockAdapter = {
        getType: () => "chrome" as const,
        read: async () => null,
        write: async () => {},
        clear: async () => {},
        getCapacity: async () => ({
          used: 0,
          total: 10485760,
          usagePercent: 0,
        }),
        isAvailable: async () => true,
      };

      await expect(
        lockManager.withLock(
          mockAdapter,
          async () => {
            throw new Error("test error");
          },
          "write",
        ),
      ).rejects.toThrow("test error");

      // 锁应已释放
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(0);
    });
  });

  describe("clearAllLocks", () => {
    it("应清空所有锁", async () => {
      await lockManager.acquireReadLock("owner1", "key1");
      await lockManager.acquireWriteLock("owner2", "key2");
      lockManager.clearAllLocks();
      const status = lockManager.getLockStatus();
      expect(status.length).toBe(0);
    });
  });
});
