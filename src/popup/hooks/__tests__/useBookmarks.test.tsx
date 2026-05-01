import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBookmarks } from "@/popup/hooks/useBookmarks";
import { ServiceProvider } from "@/popup/context/ServiceContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ServiceProvider masterKey="test-master-key">{children}</ServiceProvider>
);

describe("useBookmarks", () => {
  it("应返回 bookmarks、loading、error 和 refetch 状态", () => {
    const { result } = renderHook(() => useBookmarks(null, ""), { wrapper });
    expect(result.current).toHaveProperty("bookmarks");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.bookmarks)).toBe(true);
  });
});
