import { describe, it, expect } from "vitest";
import { BookmarkService } from "@/services/BookmarkService";
import { createMockStorageAdapter } from "@/test/mocks/storage";

const mockStorage = createMockStorageAdapter();

describe("BookmarkService", () => {
  it("应能实例化", () => {
    const service = new BookmarkService(mockStorage);
    expect(service).toBeDefined();
  });

  it("实例应有 addBookmark 方法", () => {
    const service = new BookmarkService(mockStorage);
    expect(typeof service.addBookmark).toBe("function");
  });

  it("实例应有 deleteBookmark 方法", () => {
    const service = new BookmarkService(mockStorage);
    expect(typeof service.deleteBookmark).toBe("function");
  });

  it("实例应有 getBookmarks 方法", () => {
    const service = new BookmarkService(mockStorage);
    expect(typeof service.getBookmarks).toBe("function");
  });

  it("实例应有 editBookmark 方法", () => {
    const service = new BookmarkService(mockStorage);
    expect(typeof service.editBookmark).toBe("function");
  });

  it("实例应有 getBookmarkById 方法", () => {
    const service = new BookmarkService(mockStorage);
    expect(typeof service.getBookmarkById).toBe("function");
  });
});
