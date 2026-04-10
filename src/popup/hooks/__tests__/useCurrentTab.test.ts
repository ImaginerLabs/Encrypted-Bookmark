import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCurrentTab } from "@/popup/hooks/useCurrentTab";

describe("useCurrentTab", () => {
  it("初始 loading 应为 true", () => {
    const { result } = renderHook(() => useCurrentTab());
    // 初始渲染时 loading 为 true
    expect(result.current.loading).toBe(true);
  });

  it("加载完成后应返回标签页信息", async () => {
    const { result } = renderHook(() => useCurrentTab());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Chrome Mock 返回 example.com
    expect(result.current.currentTab).toBeDefined();
    expect(result.current.currentTab?.url).toBe("https://example.com");
    expect(result.current.currentTab?.title).toBe("Example");
  });
});
