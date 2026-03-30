import React, { useEffect } from 'react';
import './ContextMenu.css';

/**
 * 右键菜单组件
 * 显示书签操作菜单
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
  items 
}) => {
  // 点击外部关闭菜单
  useEffect(() => {
    const handleClick = () => {
      onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu-item ${item.danger ? 'danger' : ''}`}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
