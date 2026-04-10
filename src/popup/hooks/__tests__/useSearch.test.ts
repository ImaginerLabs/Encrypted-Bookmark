import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearch } from "@/popup/hooks/useSearch";

describe("useSearch", () => {
  it("初始 searchKeyword 应为空字符串", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.searchKeyword).toBe("");
  });

  it("clearSearch 应清空搜索词", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSearch(100));

    act(() => {
      result.current.handleSearch("test");
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.clearSearch();
    });
    expect(result.current.searchKeyword).toBe("");

    vi.useRealTimers();
  });

  it("handleSearch 应通过防抖更新搜索词", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSearch(100));

    act(() => {
      result.current.handleSearch("hello");
    });

    // 防抖期间不应更新
    expect(result.current.searchKeyword).toBe("");

    // 等待防抖完成
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.searchKeyword).toBe("hello");

    vi.useRealTimers();
  });
});
