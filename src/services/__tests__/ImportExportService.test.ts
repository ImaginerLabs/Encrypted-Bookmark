import { describe, it, expect } from "vitest";
import { ImportExportService } from "@/services/ImportExportService";
import { createMockStorageAdapter } from "@/test/mocks/storage";

const mockStorage = createMockStorageAdapter();

describe("ImportExportService", () => {
  it("应能实例化", () => {
    const service = new ImportExportService(mockStorage);
    expect(service).toBeDefined();
  });

  it("实例应有 importBookmarks 方法", () => {
    const service = new ImportExportService(mockStorage);
    expect(typeof service.importBookmarks).toBe("function");
  });

  it("实例应有 exportBookmarks 方法", () => {
    const service = new ImportExportService(mockStorage);
    expect(typeof service.exportBookmarks).toBe("function");
  });
});
