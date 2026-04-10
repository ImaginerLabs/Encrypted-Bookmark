import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTagActions } from "@/popup/hooks/useTagActions";

describe("useTagActions", () => {
  it("应返回标签操作方法", () => {
    const mockRefetch = () => {};
    const { result } = renderHook(() => useTagActions(mockRefetch));
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });
});
