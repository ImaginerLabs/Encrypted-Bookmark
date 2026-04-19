import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFolderActions } from "@/popup/hooks/useFolderActions";

describe("useFolderActions", () => {
  it("应返回文件夹操作方法", () => {
    const { result } = renderHook(() => useFolderActions());
    expect(result.current).toBeDefined();
    // useFolderActions 应返回操作方法对象
    expect(typeof result.current).toBe("object");
  });
});
