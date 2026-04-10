import { describe, it, expect } from "vitest";
import { TagService } from "@/services/TagService";

describe("TagService", () => {
  it("应能实例化", () => {
    const service = new TagService();
    expect(service).toBeDefined();
  });

  it("实例应有 addTag 方法", () => {
    const service = new TagService();
    expect(typeof service.addTag).toBe("function");
  });
  it("实例应有 deleteTag 方法", () => {
    const service = new TagService();
    expect(typeof service.deleteTag).toBe("function");
  });

  it("实例应有 getTags 方法", () => {
    const service = new TagService();
    expect(typeof service.getTags).toBe("function");
  });
});
