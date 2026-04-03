import React, { useState, useCallback } from "react";
import { SearchBox } from "./components/SearchBox";
import { FolderList } from "./components/FolderList";
import { TagList } from "./components/TagList";
import { SidebarTabs } from "./components/SidebarTabs";
import type { SidebarTabType } from "./components/SidebarTabs";
import { BookmarkList } from "./components/BookmarkList";
import { QuickAddPanel } from "./components/QuickAddPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { useBookmarks } from "./hooks/useBookmarks";
import { useFolders } from "./hooks/useFolders";
import { useTags } from "./hooks/useTags";
import { useFolderActions } from "./hooks/useFolderActions";
import { useTagActions } from "./hooks/useTagActions";
import { useSearch } from "./hooks/useSearch";
import { BookmarkService } from "@/services/BookmarkService";
import { PasswordService } from "@/services";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";
import type { AddBookmarkInput } from "@/types/bookmark";
import "./styles/Popup.css";

/**
 * Popup 主组件
 * 浏览器扩展弹窗的核心界面
 */
export const Popup: React.FC = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTabType>("folders");

  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

  // Hooks
  const { searchKeyword, handleSearch } = useSearch();
  const { bookmarks, loading: bookmarksLoading } = useBookmarks(
    selectedFolderId,
    searchKeyword,
  );
  const { folders, refetch: refetchFolders } = useFolders();
  const { tags, refetch: refetchTags } = useTags();
  const { createFolder, renameFolder, deleteFolder } = useFolderActions();
  const { deleteTag } = useTagActions();

  // 计算总书签数和各文件夹书签数
  const totalBookmarkCount = bookmarks.length;
  const folderBookmarkCounts: Record<string, number> = {};
  bookmarks.forEach((b) => {
    const fid = b.folderId || "uncategorized";
    folderBookmarkCounts[fid] = (folderBookmarkCounts[fid] || 0) + 1;
  });

  // 侧边栏 Tab 切换
  const handleTabChange = useCallback((tab: SidebarTabType) => {
    setSidebarTab(tab);
    // 切换 Tab 时清除对应的筛选
    if (tab === "folders") {
      setSelectedTagId(null);
    } else {
      setSelectedFolderId(null);
    }
  }, []);

  // 选择文件夹
  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
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
  const handleSaveBookmark = useCallback(async (data: AddBookmarkInput) => {
    const storage = new ChromeStorageAdapter();
    const bookmarkService = new BookmarkService(storage);

    const masterKey = sessionStorage.getItem("masterKey");
    if (!masterKey) {
      throw new Error("未解锁，请先输入密码");
    }

    bookmarkService.setMasterKey(masterKey);

    const result = await bookmarkService.addBookmark(data);

    if (!result.success) {
      throw new Error(result.error || "保存书签失败");
    }

    // 刷新页面
    window.location.reload();
  }, []);

  // 编辑书签
  const handleEditBookmark = useCallback((id: string) => {
    console.log("编辑书签:", id);
    // TODO: 实现编辑功能（V1.2）
  }, []);

  // 删除书签
  const handleDeleteBookmark = useCallback(async (id: string) => {
    setConfirmDialog({
      visible: true,
      title: "删除书签",
      message: "确定要删除这个书签吗？此操作不可撤销。",
      onConfirm: async () => {
        try {
          const storage = new ChromeStorageAdapter();
          const bookmarkService = new BookmarkService(storage);

          const masterKey = sessionStorage.getItem("masterKey");
          if (!masterKey) {
            throw new Error("未解锁，请先输入密码");
          }

          bookmarkService.setMasterKey(masterKey);

          const result = await bookmarkService.deleteBookmark(id);

          if (result.success) {
            window.location.reload();
          } else {
            alert(result.error || "删除失败");
          }
        } catch (error) {
          console.error("删除书签失败:", error);
          alert(error instanceof Error ? error.message : "删除失败");
        }
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
      },
    });
  }, []);

  // 文件夹操作
  const handleCreateFolder = useCallback(
    async (name: string) => {
      const result = await createFolder(name);
      if (result) {
        await refetchFolders();
      }
    },
    [createFolder, refetchFolders],
  );

  const handleRenameFolder = useCallback(
    async (id: string, newName: string) => {
      const result = await renameFolder(id, newName);
      if (result) {
        await refetchFolders();
      }
    },
    [renameFolder, refetchFolders],
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
          if (result) {
            // 如果当前选中的是被删除的文件夹，切回全部
            if (selectedFolderId === id) {
              setSelectedFolderId(null);
            }
            await refetchFolders();
          }
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [
      folders,
      folderBookmarkCounts,
      deleteFolder,
      refetchFolders,
      selectedFolderId,
    ],
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
          if (result) {
            // 如果当前选中的是被删除的标签，切回全部
            if (selectedTagId === id) {
              setSelectedTagId(null);
            }
            await refetchTags();
          }
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [tags, deleteTag, refetchTags, selectedTagId],
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

  return (
    <div className="popup-container">
      {/* 顶部标题栏 */}
      <div className="popup-titlebar">
        <span className="popup-titlebar-brand">🔐 Encrypted Bookmark</span>
        <div className="popup-titlebar-actions">
          <button
            className="popup-titlebar-btn"
            onClick={handleOpenSettings}
            aria-label="设置"
            title="设置"
          >
            ⚙️
          </button>
          <button
            className="popup-titlebar-btn"
            onClick={handleLock}
            aria-label="锁定"
            title="锁定应用"
          >
            🔒
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="popup-searchbar">
        <SearchBox onSearch={handleSearch} />
        <button
          className="btn-quick-add"
          onClick={handleQuickAdd}
          aria-label="添加书签"
          title="添加书签"
        >
          +
        </button>
      </div>

      {/* 主体内容 */}
      <div className="popup-body">
        {/* 左侧侧边栏 */}
        <div className="popup-sidebar">
          <SidebarTabs activeTab={sidebarTab} onTabChange={handleTabChange} />
          {sidebarTab === "folders" ? (
            <FolderList
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={handleSelectFolder}
              totalBookmarkCount={totalBookmarkCount}
              folderBookmarkCounts={folderBookmarkCounts}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onCreate={handleCreateFolder}
            />
          ) : (
            <TagList
              tags={tags}
              selectedTagId={selectedTagId}
              onSelect={handleSelectTag}
              onDelete={handleDeleteTag}
            />
          )}
        </div>

        {/* 右侧书签列表 */}
        <BookmarkList
          bookmarks={bookmarks}
          loading={bookmarksLoading}
          searchKeyword={searchKeyword}
          onEdit={handleEditBookmark}
          onDelete={handleDeleteBookmark}
        />
      </div>

      {/* 底部状态栏 */}
      <div className="popup-footer">
        <span className="bookmark-count">{bookmarks.length} 个书签</span>
      </div>

      {/* 快速添加面板 */}
      <QuickAddPanel
        visible={showQuickAdd}
        folders={folders}
        onClose={() => setShowQuickAdd(false)}
        onSave={handleSaveBookmark}
      />

      {/* 确认弹窗 */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="确认删除"
        danger
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, visible: false }))
        }
      />
    </div>
  );
};
