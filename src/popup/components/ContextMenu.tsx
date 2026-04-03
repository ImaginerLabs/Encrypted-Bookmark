import React, { useEffect, useRef } from "react";
import "./ContextMenu.css";

/**
 * 右键菜单组件
 * 统一右键菜单样式，支持图标
 */

interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  items: Array<{
    label: string;
    onClick: () => void;
    danger?: boolean;
  }>;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  items,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭 + Escape 关闭 + 边界检测
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // 延迟注册，避免触发右键事件的冒泡导致菜单立即关闭
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    document.addEventListener("keydown", handleEscape);

    // 边界检测：确保菜单不溢出 Popup 窗口
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menu.style.left = `${position.x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menu.style.top = `${position.y - rect.height}px`;
      }
    }

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, position]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu-item ${item.danger ? "danger" : ""}`}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
