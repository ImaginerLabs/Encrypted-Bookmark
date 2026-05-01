import { useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "warning";

interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * Toast 状态管理 Hook
 * 管理 Toast 的显示/隐藏和定时清除
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      // 清除上一个定时器，避免旧定时器提前关闭新 Toast
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast({ message, type });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, 3000);
    },
    [],
  );

  return { toast, showToast, hideToast };
}

export type { ToastType, ToastState };
