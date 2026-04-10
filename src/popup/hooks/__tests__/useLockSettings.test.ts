import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLockSettings } from "@/popup/hooks/useLockSettings";

describe("useLockSettings", () => {
  it("应能正常渲染不抛出错误", () => {
    // useLockSettings 是一个副作用 Hook，不返回值
    const { result } = renderHook(() => useLockSettings());
    expect(result.current).toBeUndefined();
  });
});
