import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFolders } from "@/popup/hooks/useFolders";
import { ServiceProvider } from "@/popup/context/ServiceContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ServiceProvider masterKey="test-master-key">{children}</ServiceProvider>
);

describe("useFolders", () => {
  it("应返回 folders、loading、error 和 refetch", () => {
    const { result } = renderHook(() => useFolders(), { wrapper });
    expect(result.current).toHaveProperty("folders");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.folders)).toBe(true);
    expect(typeof result.current.refetch).toBe("function");
  });
});
