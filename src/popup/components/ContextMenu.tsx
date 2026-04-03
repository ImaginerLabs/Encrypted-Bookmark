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
      const popupContainer = document.querySelector(".popup-container");
      const containerRect = popupContainer?.getBoundingClientRect() || {
        top: 0,
        left: 0,
        bottom: window.innerHeight,
        right: window.innerWidth,
      };

      let adjustedX = position.x;
      let adjustedY = position.y;

      // 右边溢出
      if (adjustedX + rect.width > containerRect.right) {
        adjustedX = position.x - rect.width;
      }

      // 底部溢出：向上翻转
      if (adjustedY + rect.height > containerRect.bottom) {
        adjustedY = position.y - rect.height;
      }

      // 防止翻转后超出顶部
      if (adjustedY < containerRect.top) {
        adjustedY = containerRect.top + 4;
      }

      // 防止超出左侧
      if (adjustedX < containerRect.left) {
        adjustedX = containerRect.left + 4;
      }

      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
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
