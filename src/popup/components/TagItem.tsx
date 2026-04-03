import React, { useState, useCallback } from "react";
import type { Tag } from "@/types/data";
import { ContextMenu } from "./ContextMenu";
import "./TagItem.css";

/**
 * 标签项组件
 * 显示单个标签，支持点击筛选和右键菜单
 */

interface TagItemProps {
  /** 标签数据，null 表示"全部书签" */
  tag: (Tag & { usageCount: number }) | null;
  /** 是否选中 */
  isSelected: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 删除回调 */
  onDelete?: (id: string) => void;
}

export const TagItem: React.FC<TagItemProps> = ({
  tag,
  isSelected,
  onClick,
  onDelete,
}) => {
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // "全部书签"不显示右键菜单
      if (!tag) return;
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    [tag],
  );

  const handleCloseMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // 删除标签
  const handleDelete = useCallback(() => {
    if (tag && onDelete) {
      onDelete(tag.id);
    }
    handleCloseMenu();
  }, [tag, onDelete, handleCloseMenu]);

  const displayName = tag ? tag.name : "全部书签";
  const icon = tag ? null : "📚";

  return (
    <>
      <div
        className={`tag-item ${isSelected ? "selected" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {icon ? (
          <span className="tag-item-icon">{icon}</span>
        ) : (
          <span
            className="tag-color-dot"
            style={{ backgroundColor: tag?.color || "#6B7280" }}
          />
        )}
        <span className="tag-item-name">{displayName}</span>
        {tag && <span className="tag-usage-badge">{tag.usageCount}</span>}
      </div>

      {/* 右键菜单 */}
      {showContextMenu && tag && (
        <ContextMenu
          position={menuPosition}
          onClose={handleCloseMenu}
          items={[{ label: "🗑️ 删除", onClick: handleDelete, danger: true }]}
        />
      )}
    </>
  );
};
