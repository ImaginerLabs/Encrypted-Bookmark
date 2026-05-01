import { useState, useCallback, useMemo } from "react";
import { useServices } from "./useServices";
import { useBookmarks } from "./useBookmarks";
import { useFolders } from "./useFolders";
import { useTags } from "./useTags";
import { useFolderActions } from "./useFolderActions";
import { useTagActions } from "./useTagActions";
import { useSearch } from "./useSearch";
import { useToast } from "@/shared/hooks/useToast";
import { PasswordService } from "@/services";
import type { AddBookmarkInput } from "@/types/bookmark";
import type { SidebarTabType } from "../components/SidebarTabs";

/** 确认弹窗状态 */
export interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}

const INITIAL_CONFIRM_DIALOG: ConfirmDialogState = {
  visible: false,
  title: "",
  message: "",
  onConfirm: async () => {},
};

/**
 * Popup 状态管理 Hook
 * 抽取 Popup 组件的所有状态和业务逻辑
 */
export function usePopupState() {
  const { bookmarkService } = useServices();
  const { toast, showToast, hideToast } = useToast();

  // 选中状态
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTabType>("folders");
  const [isReadLaterMode, setIsReadLaterMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(
    INITIAL_CONFIRM_DIALOG,
  );

  // 数据 Hooks - 只调用一次 useBookmarks 获取全量数据，前端筛选
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
  const { createFolder, renameFolder, deleteFolder } = useFolderActions();
  const { deleteTag } = useTagActions();

  // 计算属性（基于全量数据，不受筛选条件影响）
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

  // 前端筛选书签（替代第二次 useBookmarks 调用）
  const bookmarks = useMemo(() => {
    let result = allBookmarks;

    // 按稍后再读筛选
    if (isReadLaterMode) {
      result = result.filter((b) => b.isReadLater === true);
    }

    // 按文件夹筛选
    if (!isReadLaterMode && selectedFolderId) {
      result = result.filter((b) => b.folderId === selectedFolderId);
    }

    // 按标签筛选
    if (selectedTagId) {
      result = result.filter((b) => b.tags?.includes(selectedTagId));
    }

    // 按关键词搜索
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

  // 刷新所有数据（替代 window.location.reload()）
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchBookmarks(),
      refetchFolders(),
      refetchTags(),
    ]);
  }, [refetchBookmarks, refetchFolders, refetchTags]);

  // 侧边栏 Tab 切换
  const handleTabChange = useCallback((tab: SidebarTabType) => {
    setSidebarTab(tab);
    if (tab === "folders") {
      setSelectedTagId(null);
    } else {
      setSelectedFolderId(null);
      setIsReadLaterMode(false);
    }
  }, []);

  // 选择文件夹
  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedTagId(null);
    setIsReadLaterMode(false);
  }, []);

  // 选择稍后再读
  const handleSelectReadLater = useCallback(() => {
    setIsReadLaterMode(true);
    setSelectedFolderId(null);
    setSelectedTagId(null);
  }, []);

  // 选择标签
  const handleSelectTag = useCallback((tagId: string | null) => {
    setSelectedTagId(tagId);
    setSelectedFolderId(null);
  }, []);

  // 快速添加书签
  const handleQuickAdd = useCallback(() => {
    setShowQuickAdd(true);
  }, []);

  // 保存书签
  const handleSaveBookmark = useCallback(
    async (data: AddBookmarkInput) => {
      const result = await bookmarkService.addBookmark(data);
      if (!result.success) {
        throw new Error(result.error || "保存书签失败");
      }
      showToast("书签已保存", "success");
      await refetchAll();
      setShowQuickAdd(false);
    },
    [bookmarkService, refetchAll, showToast],
  );

  // 编辑书签
  const handleEditBookmark = useCallback((id: string) => {
    console.log("编辑书签:", id);
    // TODO: 实现编辑功能（V1.2）
  }, []);

  // 删除书签
  const handleDeleteBookmark = useCallback(
    (id: string) => {
      setConfirmDialog({
        visible: true,
        title: "删除书签",
        message: "确定要删除这个书签吗？此操作不可撤销。",
        onConfirm: async () => {
          try {
            const result = await bookmarkService.deleteBookmark(id);
            if (result.success) {
              showToast("书签已删除", "success");
              await refetchAll();
            } else {
              showToast(result.error || "删除失败", "error");
            }
          } catch (error) {
            console.error("删除书签失败:", error);
            showToast(
              error instanceof Error ? error.message : "删除失败",
              "error",
            );
          }
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [bookmarkService, refetchAll, showToast],
  );

  // 文件夹操作
  const handleCreateFolder = useCallback(
    async (name: string) => {
      const result = await createFolder(name);
      if (result.success) {
        showToast("文件夹已创建", "success");
        await refetchFolders();
      } else {
        showToast(result.error || "创建文件夹失败", "error");
      }
    },
    [createFolder, refetchFolders, showToast],
  );

  const handleRenameFolder = useCallback(
    async (id: string, newName: string) => {
      const result = await renameFolder(id, newName);
      if (result.success) {
        showToast("文件夹已重命名", "success");
        await refetchFolders();
      } else {
        showToast(result.error || "重命名失败", "error");
      }
    },
    [renameFolder, refetchFolders, showToast],
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id);
      const folderName = folder?.name || "未知文件夹";
      const count = folderBookmarkCounts[id] || 0;

      setConfirmDialog({
        visible: true,
        title: "删除文件夹",
        message: `确定要删除文件夹「${folderName}」吗？${count > 0 ? `该文件夹下的 ${count} 个书签将移至「未分类」。` : ""}`,
        onConfirm: async () => {
          const result = await deleteFolder(id);
          if (result.success) {
            showToast("文件夹已删除", "success");
            if (selectedFolderId === id) {
              setSelectedFolderId(null);
            }
            await refetchAll();
          } else {
            showToast(result.error || "删除文件夹失败", "error");
          }
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [folders, folderBookmarkCounts, deleteFolder, refetchAll, selectedFolderId, showToast],
  );

  // 标签操作
  const handleDeleteTag = useCallback(
    (id: string) => {
      const tag = tags.find((t) => t.id === id);
      const tagName = tag?.name || "未知标签";
      const count = tag?.usageCount || 0;

      setConfirmDialog({
        visible: true,
        title: "删除标签",
        message: `确定要删除标签「${tagName}」吗？${count > 0 ? `该标签将从 ${count} 个书签中移除。` : ""}`,
        onConfirm: async () => {
          const result = await deleteTag(id);
          if (result.success) {
            showToast("标签已删除", "success");
            if (selectedTagId === id) {
              setSelectedTagId(null);
            }
            await refetchAll();
          } else {
            showToast(result.error || "删除标签失败", "error");
          }
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [tags, deleteTag, refetchAll, selectedTagId, showToast],
  );

  // 锁定应用
  const handleLock = useCallback(async () => {
    await PasswordService.lock();
    window.location.reload();
  }, []);

  // 打开设置页面
  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  // 关闭确认弹窗
  const handleCancelConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  // 关闭快速添加面板
  const handleCloseQuickAdd = useCallback(() => {
    setShowQuickAdd(false);
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
    handleCancelConfirm,
    handleCloseQuickAdd,
  };
}
