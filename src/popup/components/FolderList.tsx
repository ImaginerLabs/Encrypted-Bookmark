import React from 'react';
import type { Folder } from '@/types/data';
import { FolderItem } from './FolderItem';
import './FolderList.css';

/**
 * 文件夹列表组件
 * 显示左侧文件夹导航
 */

interface FolderListProps {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (folderId: string | null) => void;
}

export const FolderList: React.FC<FolderListProps> = ({ 
  folders, 
  selectedId, 
  onSelect 
}) => {
  return (
    <div className="folder-list">
      {/* 全部书签 */}
      <FolderItem
        folder={null}
        isSelected={selectedId === null}
        onClick={() => onSelect(null)}
      />

      {/* 文件夹列表 */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={selectedId === folder.id}
          onClick={() => onSelect(folder.id)}
        />
      ))}
    </div>
  );
};
