import React from 'react';
import type { Folder } from '@/types/data';
import './FolderItem.css';

/**
 * 文件夹项组件
 * 单个文件夹的显示
 */

interface FolderItemProps {
  folder: Folder | null; // null 表示"全部书签"
  isSelected: boolean;
  onClick: () => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({ 
  folder, 
  isSelected, 
  onClick 
}) => {
  const displayName = folder ? folder.name : '全部书签';
  const icon = folder ? '📁' : '📚';

  return (
    <div
      className={`folder-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="folder-icon">{icon}</span>
      <span className="folder-name">{displayName}</span>
    </div>
  );
};
