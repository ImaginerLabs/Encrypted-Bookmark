import { useContext } from "react";
import { ServiceContext } from "../context/ServiceContext";
import type { ServiceContextValue } from "../context/ServiceContext";

/**
 * 从 ServiceContext 中获取 Service 实例
 * 必须在 ServiceProvider 内部使用
 */
export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error("useServices must be used within ServiceProvider");
  }
  return context;
}
