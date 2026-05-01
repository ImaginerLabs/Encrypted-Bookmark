import React from "react";
import "./Toast.css";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning";
  onClose?: () => void;
}

/**
 * 统一消息提示组件
 * 用于成功/错误/警告的短暂反馈
 * 定时器由 useToast hook 统一管理
 */
export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const iconMap = {
    success: "✓",
    error: "✗",
    warning: "⚠",
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{iconMap[type]}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
};
