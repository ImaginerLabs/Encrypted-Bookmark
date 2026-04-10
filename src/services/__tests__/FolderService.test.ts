import { describe, it, expect } from "vitest";
import { FolderService } from "@/services/FolderService";

describe("FolderService", () => {
  it("应能实例化", () => {
    const service = new FolderService();
    expect(service).toBeDefined();
  });

  it("实例应有 createFolder 方法", () => {
    const service = new FolderService();
    expect(typeof service.createFolder).toBe("function");
  });

  it("实例应有 deleteFolder 方法", () => {
    const service = new FolderService();
    expect(typeof service.deleteFolder).toBe("function");
  });

  it("实例应有 getFolders 方法", () => {
    const service = new FolderService();
    expect(typeof service.getFolders).toBe("function");
  });
});
