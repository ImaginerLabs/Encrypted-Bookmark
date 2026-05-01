import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTags } from "@/popup/hooks/useTags";
import { ServiceProvider } from "@/popup/context/ServiceContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ServiceProvider masterKey="test-master-key">{children}</ServiceProvider>
);

describe("useTags", () => {
  it("应返回 tags、loading、error 和 refetch", () => {
    const { result } = renderHook(() => useTags(), { wrapper });
    expect(result.current).toHaveProperty("tags");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.tags)).toBe(true);
  });
});
