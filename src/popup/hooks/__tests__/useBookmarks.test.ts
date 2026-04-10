import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBookmarks } from "@/popup/hooks/useBookmarks";

describe("useBookmarks", () => {
  it("应返回 bookmarks、loading 和 error 状态", () => {
    const { result } = renderHook(() => useBookmarks(null, ""));
    expect(result.current).toHaveProperty("bookmarks");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(Array.isArray(result.current.bookmarks)).toBe(true);
  });

  it("未解锁时应设置 error", async () => {
    const { result } = renderHook(() => useBookmarks(null, ""));
    // 等待 effect 执行完成
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.error).toBeDefined();
  });
});
