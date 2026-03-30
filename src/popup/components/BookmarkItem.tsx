import React, { useState, useCallback } from 'react';
import type { Bookmark } from '@/types/data';
import { getFaviconUrl } from '@/utils/favicon';
import { highlightText } from '@/utils/highlight';
import { ContextMenu } from './ContextMenu';
import './BookmarkItem.css';

/**
 * 书签项组件
 * 显示单个书签的完整信息
 */

interface BookmarkItemProps {
  bookmark: Bookmark;
  searchKeyword?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const BookmarkItem: React.FC<BookmarkItemProps> = ({ 
  bookmark, 
  searchKeyword,
  onEdit,
  onDelete
}) => {
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [faviconError, setFaviconError] = useState<boolean>(false);

  // 点击书签 - 在新标签页打开
  const handleClick = useCallback(() => {
    chrome.tabs.create({ url: bookmark.url });
  }, [bookmark.url]);

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // 关闭右键菜单
  const handleCloseMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // Favicon 加载失败处理
  const handleFaviconError = useCallback(() => {
    setFaviconError(true);
  }, []);

  // 复制链接
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(bookmark.url);
    handleCloseMenu();
  }, [bookmark.url, handleCloseMenu]);

  // 编辑
  const handleEdit = useCallback(() => {
    onEdit?.(bookmark.id);
    handleCloseMenu();
  }, [bookmark.id, onEdit, handleCloseMenu]);

  // 删除
  const handleDelete = useCallback(() => {
    onDelete?.(bookmark.id);
    handleCloseMenu();
  }, [bookmark.id, onDelete, handleCloseMenu]);

  return (
    <>
      <div
        className="bookmark-item"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Favicon */}
        <img
          src={faviconError ? '/icons/icon16.png' : getFaviconUrl(bookmark.url)}
          alt=""
          className="favicon"
          onError={handleFaviconError}
        />

        {/* 书签信息 */}
        <div className="bookmark-info">
          <div className="title">
            {highlightText(bookmark.title, searchKeyword)}
          </div>
          <div className="url" title={bookmark.url}>
            {bookmark.url}
          </div>

          {/* 标签云 */}
          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="tags">
              {bookmark.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <ContextMenu
          position={menuPosition}
          onClose={handleCloseMenu}
          items={[
            { label: '复制链接', onClick: handleCopyLink },
            { label: '编辑', onClick: handleEdit },
            { label: '删除', onClick: handleDelete, danger: true }
          ]}
        />
      )}
    </>
  );
};
