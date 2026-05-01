import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTagActions } from "@/popup/hooks/useTagActions";
import { ServiceProvider } from "@/popup/context/ServiceContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ServiceProvider masterKey="test-master-key">{children}</ServiceProvider>
);

describe("useTagActions", () => {
  it("应返回标签操作方法", () => {
    const { result } = renderHook(() => useTagActions(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
    expect(typeof result.current.deleteTag).toBe("function");
  });
});
