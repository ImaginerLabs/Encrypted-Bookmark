import React, { useState, useCallback, useEffect } from "react";
import type { Bookmark, Tag } from "@/types/data";
import { getFaviconUrl } from "@/utils/favicon";
import { highlightText } from "@/utils/highlight";
import { ContextMenu } from "./ContextMenu";
import { TagService } from "@/services/TagService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";
import "./BookmarkItem.css";

/**
 * 书签项组件
 * 显示单个书签的完整信息，标签显示真实名称和颜色
 */

interface BookmarkItemProps {
  bookmark: Bookmark;
  searchKeyword?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** 标签缓存（避免每个书签项重复请求） */
const tagCache = new Map<string, Tag>();

export const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  searchKeyword,
  onEdit,
  onDelete,
}) => {
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [faviconError, setFaviconError] = useState<boolean>(false);
  const [resolvedTags, setResolvedTags] = useState<Tag[]>([]);

  // 解析标签 ID 为真实标签对象
  useEffect(() => {
    const resolveTags = async () => {
      if (!bookmark.tags || bookmark.tags.length === 0) {
        setResolvedTags([]);
        return;
      }

      try {
        // 检查缓存中是否已有所有标签
        const uncachedIds = bookmark.tags.filter((id) => !tagCache.has(id));

        if (uncachedIds.length > 0) {
          const storage = new ChromeStorageAdapter();
          const tagService = new TagService(storage, storage);
          const masterKey = sessionStorage.getItem("masterKey");
          if (masterKey) {
            tagService.setMasterKey(masterKey);
            const result = await tagService.getTags();
            if (result.success && result.data) {
              result.data.forEach((tag) => tagCache.set(tag.id, tag));
            }
          }
        }

        const tags = bookmark.tags
          .map((id) => tagCache.get(id))
          .filter((tag): tag is Tag => tag !== undefined);
        setResolvedTags(tags);
      } catch {
        // 标签解析失败时直接显示 ID
        setResolvedTags([]);
      }
    };

    resolveTags();
  }, [bookmark.tags]);

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
          src={faviconError ? "/icons/icon16.png" : getFaviconUrl(bookmark.url)}
          alt=""
          className="favicon"
          onError={handleFaviconError}
        />

        {/* 书签信息 */}
        <div className="bookmark-info">
          <div className="bookmark-title">
            {highlightText(bookmark.title, searchKeyword)}
          </div>
          <div className="bookmark-url" title={bookmark.url}>
            {bookmark.url}
          </div>

          {/* 标签云 - 显示真实名称和颜色 */}
          {(resolvedTags.length > 0 ||
            (bookmark.tags && bookmark.tags.length > 0)) && (
            <div className="bookmark-tags">
              {resolvedTags.length > 0
                ? resolvedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bookmark-tag"
                      style={{
                        backgroundColor: `${tag.color}18`,
                        color: tag.color,
                        borderColor: `${tag.color}30`,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))
                : bookmark.tags?.map((tagId) => (
                    <span key={tagId} className="bookmark-tag">
                      {tagId}
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
            { label: "📋 复制链接", onClick: handleCopyLink },
            { label: "✏️ 编辑", onClick: handleEdit },
            { label: "🗑️ 删除", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </>
  );
};
