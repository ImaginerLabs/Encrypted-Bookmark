import React from "react";
import { SearchBox } from "./components/SearchBox";
import { FolderList } from "./components/FolderList";
import { TagList } from "./components/TagList";
import { SidebarTabs } from "./components/SidebarTabs";
import { BookmarkList } from "./components/BookmarkList";
import { QuickAddPanel } from "./components/QuickAddPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Toast } from "@/shared/components/Toast";
import { usePopupState } from "./hooks/usePopupState";
import "./styles/Popup.css";

/**
 * Popup 主组件
 * 浏览器扩展弹窗的核心界面
 */
export const Popup: React.FC = () => {
  const state = usePopupState();

  return (
    <div className="popup-container">
      {/* 顶部标题栏 */}
      <div className="popup-titlebar">
        <span className="popup-titlebar-brand">🔐 Encrypted Bookmark</span>
        <div className="popup-titlebar-actions">
          <button
            className="popup-titlebar-btn"
            onClick={state.handleOpenSettings}
            aria-label="设置"
            title="设置"
          >
            ⚙️
          </button>
          <button
            className="popup-titlebar-btn"
            onClick={state.handleLock}
            aria-label="锁定"
            title="锁定应用"
          >
            🔒
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="popup-searchbar">
        <SearchBox onSearch={state.handleSearch} />
        <button
          className="btn-quick-add"
          onClick={state.handleQuickAdd}
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
          <SidebarTabs
            activeTab={state.sidebarTab}
            onTabChange={state.handleTabChange}
          />
          {state.sidebarTab === "folders" ? (
            state.foldersLoading ? (
              <div className="sidebar-loading">
                <div className="sidebar-loading-spinner" />
              </div>
            ) : (
              <FolderList
                folders={state.folders.filter((f) => f.id !== "uncategorized")}
                selectedId={state.selectedFolderId}
                onSelect={state.handleSelectFolder}
                totalBookmarkCount={state.totalBookmarkCount}
                folderBookmarkCounts={state.folderBookmarkCounts}
                readLaterCount={state.readLaterCount}
                isReadLaterSelected={state.isReadLaterMode}
                onSelectReadLater={state.handleSelectReadLater}
                onRename={state.handleRenameFolder}
                onDelete={state.handleDeleteFolder}
                onCreate={state.handleCreateFolder}
              />
            )
          ) : state.tagsLoading ? (
            <div className="sidebar-loading">
              <div className="sidebar-loading-spinner" />
            </div>
          ) : (
            <TagList
              tags={state.tags}
              selectedTagId={state.selectedTagId}
              onSelect={state.handleSelectTag}
              onDelete={state.handleDeleteTag}
            />
          )}
        </div>

        {/* 右侧书签列表 */}
        {state.bookmarksError ? (
          <div className="bookmark-error">
            <div className="bookmark-error-icon">⚠️</div>
            <p className="bookmark-error-message">
              {state.bookmarksError.message || "加载书签失败"}
            </p>
            <button
              className="bookmark-error-retry"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
          </div>
        ) : (
          <BookmarkList
            bookmarks={state.bookmarks}
            loading={state.bookmarksLoading}
            searchKeyword={state.searchKeyword}
            onEdit={state.handleEditBookmark}
            onDelete={state.handleDeleteBookmark}
          />
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="popup-footer">
        <span className="bookmark-count">
          {state.isReadLaterMode
            ? `${state.bookmarks.length} 个待读书签`
            : `${state.bookmarks.length} 个书签`}
        </span>
      </div>

      {/* 快速添加面板 */}
      <QuickAddPanel
        visible={state.showQuickAdd}
        folders={state.folders.filter((f) => f.id !== "uncategorized")}
        onClose={state.handleCloseQuickAdd}
        onSave={state.handleSaveBookmark}
        showToast={state.showToast}
      />

      {/* 确认弹窗 */}
      <ConfirmDialog
        visible={state.confirmDialog.visible}
        title={state.confirmDialog.title}
        message={state.confirmDialog.message}
        confirmText="确认删除"
        danger
        onConfirm={state.confirmDialog.onConfirm}
        onCancel={state.handleCancelConfirm}
      />

      {/* Toast 提示 */}
      {state.toast && (
        <div className="toast-container">
          <Toast
            message={state.toast.message}
            type={state.toast.type}
            onClose={state.hideToast}
          />
        </div>
      )}
    </div>
  );
};
