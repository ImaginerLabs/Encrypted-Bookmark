import React, { useState, useCallback } from "react";
import type { Folder } from "@/types/data";
import { ContextMenu } from "./ContextMenu";
import { InlineEdit } from "./InlineEdit";
import "./FolderItem.css";

/**
 * 文件夹项组件
 * 支持点击筛选、右键菜单（重命名/删除）、行内编辑、书签数量显示
 */

interface FolderItemProps {
  /** 文件夹数据，null 表示"全部书签" */
  folder: Folder | null;
  /** 是否选中 */
  isSelected: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 书签数量 */
  bookmarkCount?: number;
  /** 自定义图标（覆盖默认的 📁/📚） */
  icon?: string;
  /** 是否为系统虚拟文件夹（不显示右键菜单） */
  isSystem?: boolean;
  /** 重命名回调 */
  onRename?: (id: string, newName: string) => void;
  /** 删除回调 */
  onDelete?: (id: string) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  isSelected,
  onClick,
  bookmarkCount,
  icon,
  isSystem,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const displayName = folder ? folder.name : "全部书签";
  const displayIcon = icon || (folder ? "📁" : "📚");
  const isDefault = !folder || folder.id === "uncategorized" || isSystem;

  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // 默认文件夹和"全部书签"不显示右键菜单
      if (isDefault) return;
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    [isDefault],
  );

  const handleCloseMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // 开始重命名
  const handleStartRename = useCallback(() => {
    setIsEditing(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  // 确认重命名
  const handleConfirmRename = useCallback(
    (newName: string) => {
      if (folder && onRename) {
        onRename(folder.id, newName);
      }
      setIsEditing(false);
    },
    [folder, onRename],
  );

  // 取消重命名
  const handleCancelRename = useCallback(() => {
    setIsEditing(false);
  }, []);

  // 删除
  const handleDelete = useCallback(() => {
    if (folder && onDelete) {
      onDelete(folder.id);
    }
    handleCloseMenu();
  }, [folder, onDelete, handleCloseMenu]);

  return (
    <>
      <div
        className={`folder-item ${isSelected ? "selected" : ""}`}
        onClick={!isEditing ? onClick : undefined}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <span className="folder-icon">{displayIcon}</span>

        {isEditing && folder ? (
          <InlineEdit
            value={folder.name}
            onConfirm={handleConfirmRename}
            onCancel={handleCancelRename}
            maxLength={50}
            placeholder="文件夹名称"
          />
        ) : (
          <>
            <span className="folder-name">{displayName}</span>
            {bookmarkCount !== undefined && (
              <span className="folder-count">{bookmarkCount}</span>
            )}
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {showContextMenu && !isDefault && (
        <ContextMenu
          position={menuPosition}
          onClose={handleCloseMenu}
          items={[
            { label: "✏️ 重命名", onClick: handleStartRename },
            { label: "🗑️ 删除", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </>
  );
};
