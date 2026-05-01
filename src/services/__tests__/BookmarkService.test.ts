import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookmarkService } from "@/services/BookmarkService";
import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import type { EncryptedData } from "@/types/data";

// UTF-8 安全的 base64 编解码（btoa/atob 不支持非 ASCII 字符）
function toBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}
function fromBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}

// Mock EncryptionService，避免真实加解密开销
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

/**
 * 创建可追踪的 mock storage，支持数据持久化
 */
function createTrackableStorage(): IStorageAdapter & {
  storedData: EncryptedData | null;
  readCalls: number;
  writeCalls: number;
} {
  let storedData: EncryptedData | null = null;

  return {
    storedData: null,
    readCalls: 0,
    writeCalls: 0,
    read: async () => {
      return storedData;
    },
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

describe("BookmarkService", () => {
  let service: BookmarkService;
  let storage: ReturnType<typeof createTrackableStorage>;

  beforeEach(() => {
    storage = createTrackableStorage();
    service = new BookmarkService(storage);
    service.setMasterKey(MASTER_KEY);
  });

  describe("addBookmark", () => {
    it("应能添加书签并返回带ID的书签对象", async () => {
      const result = await service.addBookmark({
        title: "测试书签",
        url: "https://example.com",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.title).toBe("测试书签");
      expect(result.data!.url).toBe("https://example.com");
      expect(result.data!.createTime).toBeTypeOf("number");
      expect(result.data!.updateTime).toBeTypeOf("number");
    });

    it("缺少必填字段时应返回校验错误", async () => {
      // URL 为空字符串时无法通过 URL 构造函数
      const result = await service.addBookmark({
        title: "",
        url: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("数据校验失败");
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });

    it("URL格式无效时应返回校验错误", async () => {
      const result = await service.addBookmark({
        title: "测试书签",
        url: "not-a-valid-url",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("数据校验失败");
      expect(result.validationErrors).toBeDefined();
      const urlError = result.validationErrors!.find((e) => e.field === "url");
      expect(urlError).toBeDefined();
      expect(urlError!.message).toContain("URL");
    });

    it("标题为空字符串时应返回校验错误", async () => {
      const result = await service.addBookmark({
        title: "",
        url: "https://example.com",
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      const titleError = result.validationErrors!.find(
        (e) => e.field === "title",
      );
      expect(titleError).toBeDefined();
      expect(titleError!.message).toContain("标题");
    });

    it("应能添加到指定文件夹", async () => {
      const folderId = "folder-123";
      const result = await service.addBookmark({
        title: "测试书签",
        url: "https://example.com",
        folderId,
      });

      expect(result.success).toBe(true);
      expect(result.data!.folderId).toBe(folderId);
    });

    it("应能添加带标签的书签", async () => {
      const tags = ["tag-1", "tag-2"];
      const result = await service.addBookmark({
        title: "测试书签",
        url: "https://example.com",
        tags,
      });

      expect(result.success).toBe(true);
      expect(result.data!.tags).toEqual(tags);
    });

    it("重复添加相同URL时应正常处理（不报错）", async () => {
      await service.addBookmark({
        title: "第一个",
        url: "https://example.com",
      });

      const result = await service.addBookmark({
        title: "第二个",
        url: "https://example.com",
      });

      // 重复URL不会阻止添加，只是 console.warn 提示
      expect(result.success).toBe(true);
      expect(result.data!.title).toBe("第二个");
    });

    it("应对标题进行XSS转义", async () => {
      const result = await service.addBookmark({
        title: '<script>alert("xss")</script>',
        url: "https://example.com",
      });

      expect(result.success).toBe(true);
      expect(result.data!.title).not.toContain("<script>");
      expect(result.data!.title).toContain("&lt;");
    });

    it("未设置masterKey时操作应抛出错误", async () => {
      const lockedService = new BookmarkService(storage);
      const result = await lockedService.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });

  describe("deleteBookmark", () => {
    it("应能删除已存在的书签", async () => {
      const addResult = await service.addBookmark({
        title: "待删除",
        url: "https://example.com",
      });
      const bookmarkId = addResult.data!.id;

      const result = await service.deleteBookmark(bookmarkId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.bookmarkId).toBe(bookmarkId);
      expect(result.data!.deleteTime).toBeTypeOf("number");
      expect(result.data!.remainingTime).toBeTypeOf("number");
    });

    it("删除不存在的书签应返回错误", async () => {
      const result = await service.deleteBookmark("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("删除后getBookmarks不应返回该书签", async () => {
      const addResult = await service.addBookmark({
        title: "待删除",
        url: "https://example.com",
      });
      const bookmarkId = addResult.data!.id;

      await service.deleteBookmark(bookmarkId);

      const getResult = await service.getBookmarks();
      expect(getResult.success).toBe(true);
      const found = getResult.data!.find((b) => b.id === bookmarkId);
      expect(found).toBeUndefined();
    });

    it("删除后应可通过includeDeleted查看到已删除书签", async () => {
      const addResult = await service.addBookmark({
        title: "待删除",
        url: "https://example.com",
      });
      const bookmarkId = addResult.data!.id;

      await service.deleteBookmark(bookmarkId);

      const getResult = await service.getBookmarks({ includeDeleted: true });
      expect(getResult.success).toBe(true);
      const found = getResult.data!.find((b) => b.id === bookmarkId);
      expect(found).toBeDefined();
    });
  });

  describe("undoDelete", () => {
    it("应能撤销刚删除的书签", async () => {
      const addResult = await service.addBookmark({
        title: "可撤销",
        url: "https://example.com",
      });
      const bookmarkId = addResult.data!.id;

      await service.deleteBookmark(bookmarkId);
      const undoResult = await service.undoDelete(bookmarkId);

      expect(undoResult.success).toBe(true);
      expect(undoResult.data!.id).toBe(bookmarkId);
    });

    it("撤销后书签应恢复正常", async () => {
      const addResult = await service.addBookmark({
        title: "可撤销",
        url: "https://example.com",
      });
      const bookmarkId = addResult.data!.id;

      await service.deleteBookmark(bookmarkId);
      await service.undoDelete(bookmarkId);

      const getResult = await service.getBookmarks();
      const found = getResult.data!.find((b) => b.id === bookmarkId);
      expect(found).toBeDefined();
    });

    it("撤销未删除的书签应返回错误", async () => {
      const addResult = await service.addBookmark({
        title: "未删除",
        url: "https://example.com",
      });

      const undoResult = await service.undoDelete(addResult.data!.id);
      expect(undoResult.success).toBe(false);
      expect(undoResult.error).toContain("未处于删除状态");
    });
  });

  describe("editBookmark", () => {
    it("应能修改书签标题", async () => {
      const addResult = await service.addBookmark({
        title: "原标题",
        url: "https://example.com",
      });

      const editResult = await service.editBookmark(addResult.data!.id, {
        title: "新标题",
      });

      expect(editResult.success).toBe(true);
      expect(editResult.data!.title).toBe("新标题");
    });

    it("应能修改书签URL", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      const editResult = await service.editBookmark(addResult.data!.id, {
        url: "https://newurl.com",
      });

      expect(editResult.success).toBe(true);
      expect(editResult.data!.url).toBe("https://newurl.com");
    });

    it("应能修改书签文件夹", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      const editResult = await service.editBookmark(addResult.data!.id, {
        folderId: "new-folder-id",
      });

      expect(editResult.success).toBe(true);
      expect(editResult.data!.folderId).toBe("new-folder-id");
    });

    it("修改不存在的书签应返回错误", async () => {
      const result = await service.editBookmark("non-existent-id", {
        title: "新标题",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("应能修改标签", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      const editResult = await service.editBookmark(addResult.data!.id, {
        tags: ["tag-a", "tag-b"],
      });

      expect(editResult.success).toBe(true);
      expect(editResult.data!.tags).toEqual(["tag-a", "tag-b"]);
    });

    it("修改标题为无效值应返回校验错误", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      const editResult = await service.editBookmark(addResult.data!.id, {
        title: "",
      });

      expect(editResult.success).toBe(false);
      expect(editResult.validationErrors).toBeDefined();
    });

    it("版本号冲突时应返回错误", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      // 初始版本为1，传入错误的期望版本
      const editResult = await service.editBookmark(
        addResult.data!.id,
        { title: "新标题" },
        999, // 错误的期望版本号
      );

      expect(editResult.success).toBe(false);
      expect(editResult.error).toContain("变更");
    });

    it("编辑后版本号应递增", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initialVersion = (addResult.data as any).version;

      const editResult = await service.editBookmark(addResult.data!.id, {
        title: "新标题",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((editResult.data as any).version).toBe(initialVersion + 1);
    });
  });

  describe("getBookmarks", () => {
    it("应返回所有书签", async () => {
      await service.addBookmark({
        title: "书签1",
        url: "https://example1.com",
      });
      await service.addBookmark({
        title: "书签2",
        url: "https://example2.com",
      });

      const result = await service.getBookmarks();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it("按文件夹ID筛选", async () => {
      await service.addBookmark({
        title: "书签1",
        url: "https://example1.com",
        folderId: "folder-a",
      });
      await service.addBookmark({
        title: "书签2",
        url: "https://example2.com",
        folderId: "folder-b",
      });

      const result = await service.getBookmarks({ folderId: "folder-a" });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].folderId).toBe("folder-a");
    });

    it("按标签ID筛选", async () => {
      await service.addBookmark({
        title: "书签1",
        url: "https://example1.com",
        tags: ["tag-1", "tag-2"],
      });
      await service.addBookmark({
        title: "书签2",
        url: "https://example2.com",
        tags: ["tag-2"],
      });
      await service.addBookmark({
        title: "书签3",
        url: "https://example3.com",
        tags: ["tag-3"],
      });

      // AND逻辑：同时包含 tag-1 和 tag-2
      const result = await service.getBookmarks({ tagIds: ["tag-1", "tag-2"] });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toBe("书签1");
    });

    it("空数据应返回空数组", async () => {
      const result = await service.getBookmarks();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("默认不包含已删除的书签", async () => {
      const addResult = await service.addBookmark({
        title: "待删除",
        url: "https://example.com",
      });
      await service.addBookmark({
        title: "保留",
        url: "https://keep.com",
      });

      await service.deleteBookmark(addResult.data!.id);

      const result = await service.getBookmarks();
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toBe("保留");
    });

    it("应支持搜索文本筛选", async () => {
      await service.addBookmark({
        title: "Google搜索",
        url: "https://google.com",
      });
      await service.addBookmark({
        title: "GitHub",
        url: "https://github.com",
      });

      const result = await service.getBookmarks({ searchText: "google" });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toBe("Google搜索");
    });

    it("应支持分页", async () => {
      for (let i = 0; i < 5; i++) {
        await service.addBookmark({
          title: `书签${i}`,
          url: `https://example${i}.com`,
        });
      }

      const result = await service.getBookmarks({ offset: 2, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });
  });

  describe("getBookmarkById", () => {
    it("应返回指定ID的书签", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });

      const result = await service.getBookmarkById(addResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(addResult.data!.id);
      expect(result.data!.title).toBe("测试");
    });

    it("ID不存在应返回错误", async () => {
      const result = await service.getBookmarkById("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("incrementVisitCount", () => {
    it("应能增加访问次数", async () => {
      const addResult = await service.addBookmark({
        title: "测试",
        url: "https://example.com",
      });
      expect(addResult.data!.visitCount).toBe(0);

      await service.incrementVisitCount(addResult.data!.id);
      const result = await service.getBookmarkById(addResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.visitCount).toBe(1);
    });

    it("不存在的书签应返回错误", async () => {
      const result = await service.incrementVisitCount("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("clearMasterKey", () => {
    it("清除密钥后操作应返回错误", async () => {
      service.clearMasterKey();

      const result = await service.getBookmarks();
      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });
});
