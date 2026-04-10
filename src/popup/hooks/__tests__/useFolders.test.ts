import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFolders } from "@/popup/hooks/useFolders";

describe("useFolders", () => {
  it("应返回 folders、loading、error 和 refetch", () => {
    const { result } = renderHook(() => useFolders());
    expect(result.current).toHaveProperty("folders");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.folders)).toBe(true);
    expect(typeof result.current.refetch).toBe("function");
  });
});
