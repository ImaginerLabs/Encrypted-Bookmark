import { describe, it, expect } from "vitest";
import { TagService } from "@/services/TagService";
import { createMockStorageAdapter } from "@/test/mocks/storage";

const mockTagStorage = createMockStorageAdapter();
const mockBookmarkStorage = createMockStorageAdapter();

describe("TagService", () => {
  it("应能实例化", () => {
    const service = new TagService(mockTagStorage, mockBookmarkStorage);
    expect(service).toBeDefined();
  });

  it("实例应有 addTag 方法", () => {
    const service = new TagService(mockTagStorage, mockBookmarkStorage);
    expect(typeof service.addTag).toBe("function");
  });
  it("实例应有 deleteTag 方法", () => {
    const service = new TagService(mockTagStorage, mockBookmarkStorage);
    expect(typeof service.deleteTag).toBe("function");
  });

  it("实例应有 getTags 方法", () => {
    const service = new TagService(mockTagStorage, mockBookmarkStorage);
    expect(typeof service.getTags).toBe("function");
  });
});
