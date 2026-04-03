import React, { useState, useCallback } from "react";
import type { Folder } from "@/types/data";
import { FolderItem } from "./FolderItem";
import { InlineEdit } from "./InlineEdit";
import "./FolderList.css";

/**
 * 文件夹列表组件
 * 显示左侧文件夹导航，支持新建/重命名/删除文件夹
 */

interface FolderListProps {
  /** 文件夹列表 */
  folders: Folder[];
  /** 当前选中的文件夹 ID */
  selectedId: string | null;
  /** 选择文件夹回调 */
  onSelect: (folderId: string | null) => void;
  /** 总书签数量 */
  totalBookmarkCount?: number;
  /** 各文件夹书签数量映射 */
  folderBookmarkCounts?: Record<string, number>;
  /** 重命名文件夹回调 */
  onRename?: (id: string, newName: string) => void;
  /** 删除文件夹回调 */
  onDelete?: (id: string) => void;
  /** 新建文件夹回调 */
  onCreate?: (name: string) => void;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedId,
  onSelect,
  totalBookmarkCount,
  folderBookmarkCounts,
  onRename,
  onDelete,
  onCreate,
}) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // 开始新建文件夹
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
  }, []);

  // 确认新建文件夹
  const handleConfirmCreate = useCallback(
    (name: string) => {
      if (onCreate) {
        onCreate(name);
      }
      setIsCreating(false);
    },
    [onCreate],
  );

  // 取消新建
  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
  }, []);

  return (
    <div className="folder-list">
      {/* 全部书签 */}
      <FolderItem
        folder={null}
        isSelected={selectedId === null}
        onClick={() => onSelect(null)}
        bookmarkCount={totalBookmarkCount}
      />

      {/* 文件夹列表 */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={selectedId === folder.id}
          onClick={() => onSelect(folder.id)}
          bookmarkCount={folderBookmarkCounts?.[folder.id]}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}

      {/* 新建文件夹输入框 */}
      {isCreating && (
        <div className="folder-create-row">
          <span className="folder-icon">📁</span>
          <InlineEdit
            value=""
            onConfirm={handleConfirmCreate}
            onCancel={handleCancelCreate}
            maxLength={50}
            placeholder="新文件夹名称"
          />
        </div>
      )}

      {/* 新建文件夹按钮 */}
      {!isCreating && onCreate && (
        <button
          className="folder-create-btn"
          onClick={handleStartCreate}
          title="新建文件夹"
        >
          <span className="folder-create-icon">+</span>
          <span className="folder-create-text">新建文件夹</span>
        </button>
      )}
    </div>
  );
};
