import { describe, it, expect } from "vitest";
import { FileSystemAdapter } from "@/storage/adapters/FileSystemAdapter";

describe("FileSystemAdapter", () => {
  describe("getType", () => {
    it("应返回 filesystem", () => {
      const adapter = new FileSystemAdapter();
      expect(adapter.getType()).toBe("filesystem");
    });
  });

  describe("构造函数", () => {
    it("无参数创建时 directoryHandle 应为 null", () => {
      const adapter = new FileSystemAdapter();
      expect(adapter.getDirectoryHandle()).toBeNull();
    });
  });

  describe("read", () => {
    it("未设置目录句柄时应抛出错误", async () => {
      const adapter = new FileSystemAdapter();
      await expect(adapter.read()).rejects.toThrow("未设置存储目录");
    });
  });

  describe("write", () => {
    it("无效数据应抛出验证错误", async () => {
      const adapter = new FileSystemAdapter();
      const invalidData = { version: 1 } as never;
      await expect(adapter.write(invalidData)).rejects.toThrow();
    });
  });

  describe("clear", () => {
    it("无文件句柄时应正常返回（不抛错）", async () => {
      const adapter = new FileSystemAdapter();
      // clear 在没有 fileHandle 时应直接返回
      await expect(adapter.clear()).resolves.toBeUndefined();
    });
  });

  describe("isAvailable", () => {
    it("jsdom 环境下 File System Access API 不可用应返回 false", async () => {
      const adapter = new FileSystemAdapter();
      const available = await adapter.isAvailable();
      // jsdom 不支持 showDirectoryPicker
      expect(available).toBe(false);
    });
  });
});
