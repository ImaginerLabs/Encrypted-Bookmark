import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFolderActions } from "@/popup/hooks/useFolderActions";
import { ServiceProvider } from "@/popup/context/ServiceContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ServiceProvider masterKey="test-master-key">{children}</ServiceProvider>
);

describe("useFolderActions", () => {
  it("应返回文件夹操作方法", () => {
    const { result } = renderHook(() => useFolderActions(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
    expect(typeof result.current.createFolder).toBe("function");
    expect(typeof result.current.renameFolder).toBe("function");
    expect(typeof result.current.deleteFolder).toBe("function");
  });
});
