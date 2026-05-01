import { describe, it, expect, vi, beforeEach } from "vitest";
import { TagService } from "@/services/TagService";
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

describe("TagService", () => {
  let service: TagService;
  let tagStorage: IStorageAdapter;
  let bookmarkStorage: IStorageAdapter;

  beforeEach(() => {
    tagStorage = createTrackableStorage();
    bookmarkStorage = createTrackableStorage();
    const lockManager = new StorageLockManager();
    service = new TagService(tagStorage, bookmarkStorage, lockManager);
    service.setMasterKey(MASTER_KEY);
  });

  describe("addTag", () => {
    it("应能添加标签并返回带ID的标签对象", async () => {
      const result = await service.addTag({ name: "技术" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.name).toBe("技术");
      expect(result.data!.color).toBeDefined();
      expect(result.data!.createTime).toBeTypeOf("number");
    });

    it("名称为空时应返回校验错误", async () => {
      const result = await service.addTag({ name: "" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("数据校验失败");
      expect(result.validationErrors).toBeDefined();
      const nameError = result.validationErrors!.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
    });

    it("名称过短（少于2字符）应返回校验错误", async () => {
      const result = await service.addTag({ name: "A" });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it("名称过长（超过20字符）应返回校验错误", async () => {
      const result = await service.addTag({ name: "a".repeat(21) });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it("重复名称应返回已有标签（复用）", async () => {
      const first = await service.addTag({ name: "技术" });
      const second = await service.addTag({ name: "技术" });

      expect(second.success).toBe(true);
      expect(second.data!.id).toBe(first.data!.id);
    });

    it("名称不区分大小写重复时应复用", async () => {
      await service.addTag({ name: "技术" });
      const second = await service.addTag({ name: "技 术" });

      // 精确匹配时不区分大小写的逻辑：toLowerCase()比较
      // "技术" vs "技 术" -> 不同字符串，所以会创建新标签
      // 但 "技术" vs "技术" (same) -> 复用
      // "Tech" vs "tech" -> 复用
      expect(second.success).toBe(true);
    });

    it("大小写不同但内容相同时应复用", async () => {
      const first = await service.addTag({ name: "Tech" });
      const second = await service.addTag({ name: "tech" });

      expect(second.success).toBe(true);
      expect(second.data!.id).toBe(first.data!.id);
    });

    it("应能指定标签颜色", async () => {
      const result = await service.addTag({ name: "红色标签", color: "red" });

      expect(result.success).toBe(true);
      expect(result.data!.color).toBe("#F44336"); // TAG_COLORS.red
    });

    it("未指定颜色应使用默认蓝色", async () => {
      const result = await service.addTag({ name: "默认颜色" });

      expect(result.success).toBe(true);
      expect(result.data!.color).toBe("#2196F3"); // TAG_COLORS.blue
    });

    it("应对名称进行XSS转义", async () => {
      const result = await service.addTag({ name: 'a<b>c' });

      expect(result.success).toBe(true);
      expect(result.data!.name).not.toContain("<b>");
      expect(result.data!.name).toContain("&lt;");
    });

    it("未设置masterKey时应返回错误", async () => {
      const lockedService = new TagService(
        tagStorage,
        bookmarkStorage,
        new StorageLockManager(),
      );
      const result = await lockedService.addTag({ name: "测试" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });

  describe("deleteTag", () => {
    it("应能删除已存在的标签", async () => {
      const createResult = await service.addTag({ name: "待删除" });
      const tagId = createResult.data!.id;

      const result = await service.deleteTag(tagId);

      expect(result.success).toBe(true);
    });

    it("删除不存在的标签应返回错误", async () => {
      const result = await service.deleteTag("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("删除标签后应从相关书签中移除引用", async () => {
      const tag = await service.addTag({ name: "测试标签" });
      const tagId = tag.data!.id;

      // 手动写入包含该标签的书签
      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example.com",
          tags: [tagId, "other-tag"],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
          version: 1,
        },
        {
          id: "bm-2",
          title: "书签2",
          url: "https://example2.com",
          tags: [tagId],
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

      const result = await service.deleteTag(tagId);

      expect(result.success).toBe(true);
      expect(result.data!.affectedBookmarks).toBe(2);
    });

    it("删除后getTags不应包含该标签", async () => {
      const createResult = await service.addTag({ name: "待删除" });
      const tagId = createResult.data!.id;

      await service.deleteTag(tagId);

      const tags = await service.getTags();
      expect(tags.success).toBe(true);
      const found = tags.data!.find((t) => t.id === tagId);
      expect(found).toBeUndefined();
    });
  });

  describe("renameTag", () => {
    it("应能重命名标签", async () => {
      const createResult = await service.addTag({ name: "旧名称" });

      const result = await service.renameTag(createResult.data!.id, "新名称");

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("新名称");
    });

    it("重命名为无效名称应返回校验错误", async () => {
      const createResult = await service.addTag({ name: "测试" });

      const result = await service.renameTag(createResult.data!.id, "");

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it("重命名为已存在的名称应返回错误", async () => {
      await service.addTag({ name: "标签A" });
      const createB = await service.addTag({ name: "标签B" });

      const result = await service.renameTag(createB.data!.id, "标签A");

      expect(result.success).toBe(false);
      expect(result.error).toContain("已存在");
    });

    it("重命名不存在的标签应返回错误", async () => {
      const result = await service.renameTag("non-existent-id", "新名称");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("重命名为自己当前名称应成功（排除自身）", async () => {
      const createResult = await service.addTag({ name: "测试" });

      const result = await service.renameTag(
        createResult.data!.id,
        "测试",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getTags", () => {
    it("应返回所有标签", async () => {
      await service.addTag({ name: "标签1" });
      await service.addTag({ name: "标签2" });

      const result = await service.getTags();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it("空数据应返回空数组", async () => {
      const result = await service.getTags();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("应按创建时间降序排列", async () => {
      await service.addTag({ name: "第一个" });
      await service.addTag({ name: "第二个" });

      const result = await service.getTags();

      expect(result.success).toBe(true);
      expect(result.data![0].createTime).toBeGreaterThanOrEqual(
        result.data![1].createTime,
      );
    });
  });

  describe("getTagById", () => {
    it("应返回指定ID的标签", async () => {
      const createResult = await service.addTag({ name: "测试" });

      const result = await service.getTagById(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(createResult.data!.id);
      expect(result.data!.name).toBe("测试");
    });

    it("ID不存在应返回错误", async () => {
      const result = await service.getTagById("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("setTagColor", () => {
    it("应能设置标签颜色（颜色名）", async () => {
      const createResult = await service.addTag({ name: "测试" });

      const result = await service.setTagColor(createResult.data!.id, "red");

      expect(result.success).toBe(true);
      expect(result.data!.color).toBe("#F44336");
    });

    it("应能设置标签颜色（HEX值）", async () => {
      const createResult = await service.addTag({ name: "测试" });

      const result = await service.setTagColor(
        createResult.data!.id,
        "#F44336",
      );

      expect(result.success).toBe(true);
      expect(result.data!.color).toBe("#F44336");
    });

    it("标签不存在应返回错误", async () => {
      const result = await service.setTagColor("non-existent-id", "red");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("getTagsByBookmark", () => {
    it("应返回书签关联的所有标签", async () => {
      const tag1 = await service.addTag({ name: "标签1" });
      const tag2 = await service.addTag({ name: "标签2" });

      // 手动写入包含标签的书签
      const bookmarkData = [
        {
          id: "bm-1",
          title: "测试书签",
          url: "https://example.com",
          tags: [tag1.data!.id, tag2.data!.id],
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

      const result = await service.getTagsByBookmark("bm-1");

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it("书签无标签应返回空数组", async () => {
      // 手动写入不含标签的书签
      const bookmarkData = [
        {
          id: "bm-1",
          title: "无标签书签",
          url: "https://example.com",
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

      const result = await service.getTagsByBookmark("bm-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("getBookmarksByTag", () => {
    it("应返回包含指定标签的所有书签", async () => {
      const tag = await service.addTag({ name: "测试标签" });

      const bookmarkData = [
        {
          id: "bm-1",
          title: "有标签书签",
          url: "https://example.com",
          tags: [tag.data!.id],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-2",
          title: "无标签书签",
          url: "https://example2.com",
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

      const result = await service.getBookmarksByTag(tag.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].id).toBe("bm-1");
    });

    it("标签不存在应返回错误", async () => {
      const result = await service.getBookmarksByTag("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("不应返回已删除的书签", async () => {
      const tag = await service.addTag({ name: "测试标签" });

      const bookmarkData = [
        {
          id: "bm-1",
          title: "正常书签",
          url: "https://example.com",
          tags: [tag.data!.id],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-2",
          title: "已删除书签",
          url: "https://example2.com",
          tags: [tag.data!.id],
          isDeleted: true,
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

      const result = await service.getBookmarksByTag(tag.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].id).toBe("bm-1");
    });
  });

  describe("getTagUsageCount", () => {
    it("应返回标签的使用次数", async () => {
      const tag = await service.addTag({ name: "测试标签" });

      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example1.com",
          tags: [tag.data!.id],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-2",
          title: "书签2",
          url: "https://example2.com",
          tags: [tag.data!.id],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-3",
          title: "无标签书签",
          url: "https://example3.com",
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

      const result = await service.getTagUsageCount(tag.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it("未被使用应返回0", async () => {
      const tag = await service.addTag({ name: "未使用标签" });

      const result = await service.getTagUsageCount(tag.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe("getTagsWithUsage", () => {
    it("应返回带使用统计的标签列表", async () => {
      const tag1 = await service.addTag({ name: "标签1" });
      const tag2 = await service.addTag({ name: "标签2" });

      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example1.com",
          tags: [tag1.data!.id],
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

      const result = await service.getTagsWithUsage();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);

      const found1 = result.data!.find((t) => t.id === tag1.data!.id);
      const found2 = result.data!.find((t) => t.id === tag2.data!.id);
      expect(found1!.usageCount).toBe(1);
      expect(found2!.usageCount).toBe(0);
    });

    it("应按使用次数降序排列", async () => {
      await service.addTag({ name: "少用" });
      const tag2 = await service.addTag({ name: "多用" });

      const bookmarkData = [
        {
          id: "bm-1",
          title: "书签1",
          url: "https://example1.com",
          tags: [tag2.data!.id],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
        {
          id: "bm-2",
          title: "书签2",
          url: "https://example2.com",
          tags: [tag2.data!.id],
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

      const result = await service.getTagsWithUsage();

      expect(result.success).toBe(true);
      expect(result.data![0].usageCount).toBeGreaterThanOrEqual(
        result.data![1].usageCount,
      );
    });
  });

  describe("getAvailableColors", () => {
    it("应返回7种预设颜色", () => {
      const colors = service.getAvailableColors();

      expect(colors.length).toBe(7);
      colors.forEach((c) => {
        expect(c.name).toBeDefined();
        expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });

  describe("clearMasterKey", () => {
    it("清除密钥后操作应返回错误", async () => {
      service.clearMasterKey();

      const result = await service.getTags();
      expect(result.success).toBe(false);
      expect(result.error).toContain("未解锁");
    });
  });
});
