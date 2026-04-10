import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTags } from "@/popup/hooks/useTags";

describe("useTags", () => {
  it("应返回 tags、loading、error 和 refetch", () => {
    const { result } = renderHook(() => useTags());
    expect(result.current).toHaveProperty("tags");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.tags)).toBe(true);
  });
});
