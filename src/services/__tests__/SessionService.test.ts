import { describe, it, expect } from "vitest";
import { SessionService } from "@/services/SessionService";

describe("SessionService", () => {
  describe("getSessionState", () => {
    it("初始状态应为锁定", async () => {
      const state = await SessionService.getSessionState();
      expect(state.isLocked).toBe(true);
      expect(state.unlockedAt).toBeNull();
    });
  });

  describe("isLocked", () => {
    it("初始应为锁定状态", async () => {
      const locked = await SessionService.isLocked();
      expect(locked).toBe(true);
    });
  });

  describe("markUnlocked", () => {
    it("标记解锁后应为非锁定状态", async () => {
      await SessionService.markUnlocked();
      const locked = await SessionService.isLocked();
      expect(locked).toBe(false);
    });

    it("标记解锁时传入 masterKey 应存储到 session", async () => {
      await SessionService.markUnlocked("test-master-key");
      const key = await SessionService.getSessionKey();
      expect(key).toBe("test-master-key");
    });
  });

  describe("lock", () => {
    it("锁定后应为锁定状态", async () => {
      await SessionService.markUnlocked("key");
      await SessionService.lock();
      const locked = await SessionService.isLocked();
      expect(locked).toBe(true);
    });

    it("锁定后 sessionKey 应被清除", async () => {
      await SessionService.markUnlocked("key");
      await SessionService.lock();
      const key = await SessionService.getSessionKey();
      expect(key).toBeNull();
    });
  });

  describe("getSessionKey", () => {
    it("未设置时应返回 null", async () => {
      const key = await SessionService.getSessionKey();
      expect(key).toBeNull();
    });
  });

  describe("isSessionExpired", () => {
    it("超时时间为 0 应永不过期", async () => {
      const expired = await SessionService.isSessionExpired(0);
      expect(expired).toBe(false);
    });

    it("刚更新活动时间应未过期", async () => {
      await SessionService.updateLastActivity();
      const expired = await SessionService.isSessionExpired(15);
      expect(expired).toBe(false);
    });
  });

  describe("updateLastActivity", () => {
    it("解锁状态下应更新活动时间", async () => {
      await SessionService.markUnlocked();
      const before = await SessionService.getLastActivityTime();
      // 等待一小段时间确保时间戳不同
      await new Promise((r) => setTimeout(r, 10));
      await SessionService.updateLastActivity();
      const after = await SessionService.getLastActivityTime();
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });
});
