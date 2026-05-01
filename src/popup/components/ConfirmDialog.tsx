import React, { useEffect, useCallback, useState } from "react";
import "./ConfirmDialog.css";

/**
 * 通用确认弹窗组件
 * 用于删除文件夹/标签等危险操作的二次确认
 */

interface ConfirmDialogProps {
  /** 是否显示 */
  visible: boolean;
  /** 弹窗标题 */
  title: string;
  /** 弹窗内容 */
  message: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否为危险操作（红色确认按钮） */
  danger?: boolean;
  /** 确认回调（支持异步） */
  onConfirm: () => Promise<void> | void;
  /** 取消回调 */
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const [confirming, setConfirming] = useState(false);

  // 处理确认操作，支持异步 + 防重复点击
  const handleConfirm = useCallback(async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } catch {
      // 错误由调用方处理
    } finally {
      setConfirming(false);
    }
  }, [confirming, onConfirm]);

  // Escape 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) {
        onCancel();
      }
    },
    [onCancel, confirming],
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  // 弹窗关闭时重置 confirming 状态
  useEffect(() => {
    if (!visible) {
      setConfirming(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={confirming ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-btn confirm-dialog-btn-cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-btn confirm-dialog-btn-confirm ${danger ? "danger" : ""}`}
            onClick={handleConfirm}
            disabled={confirming}
            autoFocus
          >
            {confirming ? (
              <span className="confirm-dialog-btn-loading">
                <span className="confirm-dialog-spinner" />
                处理中...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
