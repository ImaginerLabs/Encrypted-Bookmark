import { useMemo, useCallback } from "react";
import { useBookmarks } from "./useBookmarks";
import { useFolders } from "./useFolders";
import { useTags } from "./useTags";
import { useSearch } from "./useSearch";
import { useToast } from "@/shared/hooks/useToast";
import { useSelectionState } from "./useSelectionState";
import { useConfirmDialog } from "./useConfirmDialog";
import { useBookmarkOperations } from "./useBookmarkOperations";
import { useCrudOperations } from "./useCrudOperations";
import { PasswordService } from "@/services";

/**
 * Popup 状态管理 Hook
 * 组合多个专注的小 hooks，提供完整的 popup 状态管理
 */
export function usePopupState() {
  const { toast, showToast, hideToast } = useToast();

  // 选择状态
  const {
    selectedFolderId,
    selectedTagId,
    isReadLaterMode,
    sidebarTab,
    handleTabChange,
    handleSelectFolder,
    handleSelectReadLater,
    handleSelectTag,
    clearSelection,
  } = useSelectionState();

  // 确认对话框
  const {
    confirmDialog,
    showConfirmDialog,
    hideConfirmDialog,
  } = useConfirmDialog();

  // 数据 Hooks
  const { searchKeyword, handleSearch } = useSearch();
  const {
    bookmarks: allBookmarks,
    loading: bookmarksLoading,
    error: bookmarksError,
    refetch: refetchBookmarks,
  } = useBookmarks(null, "");
  const {
    folders,
    loading: foldersLoading,
    refetch: refetchFolders,
  } = useFolders();
  const {
    tags,
    loading: tagsLoading,
    refetch: refetchTags,
  } = useTags();

  // 刷新所有数据
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchBookmarks(),
      refetchFolders(),
      refetchTags(),
    ]);
  }, [refetchBookmarks, refetchFolders, refetchTags]);

  // 计算属性
  const normalBookmarks = useMemo(
    () => allBookmarks.filter((b) => b.isReadLater !== true),
    [allBookmarks],
  );
  const readLaterCount = useMemo(
    () => allBookmarks.filter((b) => b.isReadLater === true).length,
    [allBookmarks],
  );
  const totalBookmarkCount = useMemo(
    () => normalBookmarks.length,
    [normalBookmarks],
  );
  const folderBookmarkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    normalBookmarks.forEach((b) => {
      const fid = b.folderId || "uncategorized";
      counts[fid] = (counts[fid] || 0) + 1;
    });
    return counts;
  }, [normalBookmarks]);

  // 前端筛选书签
  const bookmarks = useMemo(() => {
    let result = allBookmarks;

    if (isReadLaterMode) {
      result = result.filter((b) => b.isReadLater === true);
    }

    if (!isReadLaterMode && selectedFolderId) {
      result = result.filter((b) => b.folderId === selectedFolderId);
    }

    if (selectedTagId) {
      result = result.filter((b) => b.tags?.includes(selectedTagId));
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(keyword) ||
          b.url.toLowerCase().includes(keyword),
      );
    }

    return result;
  }, [allBookmarks, isReadLaterMode, selectedFolderId, selectedTagId, searchKeyword]);

  const tagBookmarkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    normalBookmarks.forEach((b) => {
      b.tags?.forEach((tagId) => {
        counts[tagId] = (counts[tagId] || 0) + 1;
      });
    });
    return counts;
  }, [normalBookmarks]);

  // 书签操作
  const {
    showQuickAdd,
    handleQuickAdd,
    handleSaveBookmark,
    handleEditBookmark,
    handleDeleteBookmark,
    handleCloseQuickAdd,
  } = useBookmarkOperations({
    refetchAll,
    showToast,
  });

  // CRUD 操作
  const {
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleDeleteTag,
  } = useCrudOperations({
    folders,
    tags,
    folderBookmarkCounts,
    tagBookmarkCounts,
    selectedFolderId,
    selectedTagId,
    refetchAll,
    showConfirmDialog,
    clearSelection,
    showToast,
  });

  // 锁定应用
  const handleLock = useCallback(async () => {
    await PasswordService.lock();
    clearSelection();
    handleCloseQuickAdd();
    hideConfirmDialog();
  }, [clearSelection, handleCloseQuickAdd, hideConfirmDialog]);

  // 打开设置页面
  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  return {
    // 选中状态
    selectedFolderId,
    selectedTagId,
    showQuickAdd,
    sidebarTab,
    isReadLaterMode,
    confirmDialog,

    // 数据
    bookmarks,
    bookmarksLoading,
    bookmarksError,
    folders,
    foldersLoading,
    tags,
    tagsLoading,
    searchKeyword,

    // 计算属性
    totalBookmarkCount,
    readLaterCount,
    folderBookmarkCounts,
    tagBookmarkCounts,

    // Toast
    toast,
    showToast,
    hideToast,

    // 操作
    handleSearch,
    handleTabChange,
    handleSelectFolder,
    handleSelectReadLater,
    handleSelectTag,
    handleQuickAdd,
    handleSaveBookmark,
    handleEditBookmark,
    handleDeleteBookmark,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleDeleteTag,
    handleLock,
    handleOpenSettings,
    hideConfirmDialog,
    handleCloseQuickAdd,
  };
}
