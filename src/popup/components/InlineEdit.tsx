import React, { useState, useRef, useEffect, useCallback } from "react";
import "./InlineEdit.css";

/**
 * 行内编辑组件
 * 用于文件夹重命名等场景
 */

interface InlineEditProps {
  /** 初始值 */
  value: string;
  /** 确认编辑回调 */
  onConfirm: (newValue: string) => void;
  /** 取消编辑回调 */
  onCancel: () => void;
  /** 最大长度 */
  maxLength?: number;
  /** 占位符 */
  placeholder?: string;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onConfirm,
  onCancel,
  maxLength = 50,
  placeholder = "请输入名称",
}) => {
  const [inputValue, setInputValue] = useState<string>(value);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦并全选
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // 验证并提交
  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError("名称不能为空");
      return;
    }

    if (trimmed.length > maxLength) {
      setError(`名称不能超过${maxLength}个字符`);
      return;
    }

    // 值未变化时视为取消
    if (trimmed === value) {
      onCancel();
      return;
    }

    onConfirm(trimmed);
  }, [inputValue, maxLength, value, onConfirm, onCancel]);

  // 键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel],
  );

  // 失焦时提交
  const handleBlur = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="inline-edit">
      <input
        ref={inputRef}
        type="text"
        className={`inline-edit-input ${error ? "has-error" : ""}`}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setError("");
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        maxLength={maxLength}
        placeholder={placeholder}
      />
      {error && <span className="inline-edit-error">{error}</span>}
    </div>
  );
};
