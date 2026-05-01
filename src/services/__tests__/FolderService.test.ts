import { describe, it, expect, vi, beforeEach } from "vitest";
import { FolderService } from "@/services/FolderService";
import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import type { EncryptedData } from "@/types/data";
import { StorageLockManager } from "@/storage/services/StorageLockManager";

// UTF-8 安全的 base64 编解码
function toBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}
function fromBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}

// Mock EncryptionService
vi.mock("@/services/EncryptionService", () => ({
  EncryptionService: {
    encrypt: vi.fn(async (plaintext: string, _key: string) => ({
      version: 1,
      salt: toBase64("salt"),
      iv: toBase64("iv"),
      ciphertext: toBase64(plaintext),
      checksum: toBase64("checksum"),
    })),
    decrypt: vi.fn(async (data: EncryptedData, _key: string) =>
      fromBase64(data.ciphertext),
    ),
  },
}));

const MASTER_KEY = "test-master-key-12345678";

function createTrackableStorage(): IStorageAdapter {
  let storedData: EncryptedData | null = null;

  return {
    read: async () => storedData,
    write: async (data: EncryptedData) => {
      storedData = data;
    },
    clear: async () => {
      storedData = null;
    },
    getCapacity: async () => ({ used: 0, total: -1, usagePercent: 0 }),
    isAvailable: async () => true,
    getType: () => "chrome",
  };
}

describe("FolderService", () => {
  let service: FolderService;
  let folderStorage: IStorageAdapter;
  let bookmarkStorage: IStorageAdapter;

  beforeEach(() => {
    folderStorage = createTrackableStorage();
    bookmarkStorage = createTrackableStorage();
    const lockManager = new StorageLockManager();
    service = new FolderService(folderStorage, bookmarkStorage, lockManager);
    service.setMasterKey(MASTER_KEY);
  });

  describe("createFolder", () => {
    it("应能创建文件夹并返回带ID的对象", async () => {
      const result = await service.createFolder({ name: "工作" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.name).toBe("工作");
      expect(result.data!.createTime).toBeTypeOf("number");
    });

    it("名称为空时应返回校验错误", async () => {
      const result = await service.createFolder({ name: "" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("数据校验失败");
      expect(result.validationErrors).toBeDefined();
      const nameError = result.validationErrors!.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
    });

    it("名称过长时应返回校验错误", async () => {
      const result = await service.createFolder({ name: "a".repeat(51) });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it("名称重复时应返回错误", async () => {
      await service.createFolder({ name: "工作" });
      const result = await service.createFolder({ name: "工作" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("已存在");
    });

    it("应对名称进行XSS转义", async () => {
      const result = await service.createFolder({
        name: '<script>alert("xss")</script>',
      });

      expect(result.success).toBe(true);
      expect(result.data!.name).not.toContain("<script>");
      expect(result.data!.name).toContain("&lt;");
    });

    it("应能创建带 parentId 的子文件夹", async () => {
      const parent = await service.createFolder({ name: "父文件夹" });
      const child = await service.createFolder({
        name: "子文件夹",
        parentId: parent.data!.id,
      });

      expect(child.success).toBe(true);
      expect(child.data!.parentId).toBe(parent.data!.id);
    });

    it("应能创建带 sort 值的文件夹", async () => {
      const result = await service.createFolder({ name: "排序测试", sort: 5 });

      expect(result.success).toBe(true);
      expect(result.data!.sort).toBe(5);
    });

    it("未设置masterKey时应返回错误", async () => {
      const lockedService = new FolderService(
        folderStorage,
        bookmarkStorage,
        new StorageLockManager(),
      );
      const result = await lockedService.createFolder({ name: "测试" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });

  describe("deleteFolder", () => {
    it("应能删除已存在的文件夹", async () => {
      const createResult = await service.createFolder({ name: "待删除" });
      const folderId = createResult.data!.id;

      const result = await service.deleteFolder(folderId);

      expect(result.success).toBe(true);
    });

    it("删除不存在的文件夹应返回错误", async () => {
      const result = await service.deleteFolder("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("禁止删除默认文件夹", async () => {
      const result = await service.deleteFolder("uncategorized");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不可删除");
    });

    it("删除文件夹后应将书签迁移至未分类", async () => {
      // 先创建一个文件夹
      const folder = await service.createFolder({ name: "待删除文件夹" });

      // 手动写入属于该文件夹的书签到 bookmarkStorage
      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example.com",
          folderId: folder.data!.id,
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
          version: 1,
        },
        {
          id: "bm-2",
          title: "书签2",
          url: "https://example2.com",
          folderId: "other-folder",
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
          version: 1,
        },
      ];
      const { EncryptionService } = await import(
        "@/services/EncryptionService"
      );
      const encrypted = await EncryptionService.encrypt(
        JSON.stringify(bookmarkData),
        MASTER_KEY,
      );
      await bookmarkStorage.write(encrypted);

      // 删除文件夹
      const result = await service.deleteFolder(folder.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.successCount).toBe(1); // 一个书签被迁移
    });

    it("删除后getFolders不应包含该文件夹", async () => {
      const createResult = await service.createFolder({ name: "待删除" });
      const folderId = createResult.data!.id;

      await service.deleteFolder(folderId);

      const folders = await service.getFolders();
      expect(folders.success).toBe(true);
      const found = folders.data!.find((f) => f.id === folderId);
      expect(found).toBeUndefined();
    });
  });

  describe("renameFolder", () => {
    it("应能重命名文件夹", async () => {
      const createResult = await service.createFolder({ name: "旧名称" });

      const result = await service.renameFolder(
        createResult.data!.id,
        "新名称",
      );

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("新名称");
    });

    it("重命名为空名称应返回校验错误", async () => {
      const createResult = await service.createFolder({ name: "测试" });

      const result = await service.renameFolder(createResult.data!.id, "");

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it("重命名为已存在的名称应返回错误", async () => {
      await service.createFolder({ name: "文件夹A" });
      const createB = await service.createFolder({ name: "文件夹B" });

      const result = await service.renameFolder(createB.data!.id, "文件夹A");

      expect(result.success).toBe(false);
      expect(result.error).toContain("已存在");
    });

    it("重命名不存在的文件夹应返回错误", async () => {
      const result = await service.renameFolder("non-existent-id", "新名称");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("重命名自己为相同名称应成功（排除自身检查）", async () => {
      const createResult = await service.createFolder({ name: "测试" });

      const result = await service.renameFolder(
        createResult.data!.id,
        "测试",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getFolders", () => {
    it("应返回所有文件夹", async () => {
      await service.createFolder({ name: "文件夹1" });
      await service.createFolder({ name: "文件夹2" });

      const result = await service.getFolders();

      expect(result.success).toBe(true);
      // 默认有一个"未分类"文件夹 + 2个新建的
      expect(result.data!.length).toBe(3);
    });

    it("空数据应包含默认文件夹", async () => {
      const result = await service.getFolders();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
      const defaultFolder = result.data!.find(
        (f) => f.id === "uncategorized",
      );
      expect(defaultFolder).toBeDefined();
      expect(defaultFolder!.name).toBe("未分类");
    });

    it("文件夹应按sort排序", async () => {
      await service.createFolder({ name: "C文件夹", sort: 3 });
      await service.createFolder({ name: "A文件夹", sort: 1 });
      await service.createFolder({ name: "B文件夹", sort: 2 });

      const result = await service.getFolders();
      expect(result.success).toBe(true);

      // 获取非默认文件夹
      const customFolders = result.data!.filter(
        (f) => f.id !== "uncategorized",
      );
      expect(customFolders[0].sort).toBeLessThanOrEqual(
        customFolders[1].sort,
      );
    });
  });

  describe("getFolderById", () => {
    it("应返回指定ID的文件夹", async () => {
      const createResult = await service.createFolder({ name: "测试" });

      const result = await service.getFolderById(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(createResult.data!.id);
      expect(result.data!.name).toBe("测试");
    });

    it("ID不存在应返回错误", async () => {
      const result = await service.getFolderById("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("getDefaultFolder", () => {
    it("应返回默认未分类文件夹", async () => {
      const result = await service.getDefaultFolder();

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe("uncategorized");
      expect(result.data!.name).toBe("未分类");
    });
  });

  describe("moveBooksToFolder", () => {
    it("应能将书签移动到指定文件夹", async () => {
      const targetFolder = await service.createFolder({ name: "目标" });

      // 手动写入书签
      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example.com",
          folderId: "uncategorized",
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
          version: 1,
        },
      ];
      const { EncryptionService } = await import(
        "@/services/EncryptionService"
      );
      const encrypted = await EncryptionService.encrypt(
        JSON.stringify(bookmarkData),
        MASTER_KEY,
      );
      await bookmarkStorage.write(encrypted);

      const result = await service.moveBooksToFolder(
        ["bm-1"],
        targetFolder.data!.id,
      );

      expect(result.success).toBe(true);
      expect(result.data!.successCount).toBe(1);
      expect(result.data!.failedCount).toBe(0);
    });

    it("目标文件夹不存在应返回错误", async () => {
      const result = await service.moveBooksToFolder(
        ["bm-1"],
        "non-existent-folder",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("书签不存在应计入失败", async () => {
      const targetFolder = await service.createFolder({ name: "目标" });
      // 不写入任何书签
      const result = await service.moveBooksToFolder(
        ["non-existent-bm"],
        targetFolder.data!.id,
      );

      expect(result.data!.failedCount).toBe(1);
    });
  });

  describe("getFolderBookmarkCount", () => {
    it("应返回文件夹内书签数量", async () => {
      const folder = await service.createFolder({ name: "测试" });

      // 手动写入书签
      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example1.com",
          folderId: folder.data!.id,
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-2",
          title: "书签2",
          url: "https://example2.com",
          folderId: folder.data!.id,
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-3",
          title: "其他文件夹",
          url: "https://example3.com",
          folderId: "uncategorized",
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
      ];
      const { EncryptionService } = await import(
        "@/services/EncryptionService"
      );
      const encrypted = await EncryptionService.encrypt(
        JSON.stringify(bookmarkData),
        MASTER_KEY,
      );
      await bookmarkStorage.write(encrypted);

      const result = await service.getFolderBookmarkCount(folder.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it("空文件夹应返回0", async () => {
      const result = await service.getFolderBookmarkCount("uncategorized");

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe("clearMasterKey", () => {
    it("清除密钥后操作应返回错误", async () => {
      service.clearMasterKey();

      const result = await service.getFolders();
      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });
});
