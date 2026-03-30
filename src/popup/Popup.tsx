import React, { useState, useCallback } from 'react';
import { SearchBox } from './components/SearchBox';
import { FolderList } from './components/FolderList';
import { BookmarkList } from './components/BookmarkList';
import { QuickAddPanel } from './components/QuickAddPanel';
import { useBookmarks } from './hooks/useBookmarks';
import { useFolders } from './hooks/useFolders';
import { useSearch } from './hooks/useSearch';
import { BookmarkService } from '@/services/BookmarkService';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';
import type { AddBookmarkInput } from '@/types/bookmark';
import './styles/Popup.css';

/**
 * Popup 主组件
 * 浏览器扩展弹窗的核心界面
 */
export const Popup: React.FC = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  // Hooks
  const { searchKeyword, handleSearch } = useSearch();
  const { bookmarks, loading: bookmarksLoading } = useBookmarks(selectedFolderId, searchKeyword);
  const { folders } = useFolders();

  // 快速添加书签
  const handleQuickAdd = useCallback(() => {
    setShowQuickAdd(true);
  }, []);

  // 保存书签
  const handleSaveBookmark = useCallback(async (data: AddBookmarkInput) => {
    const storage = new ChromeStorageAdapter();
    const bookmarkService = new BookmarkService(storage);

    const masterKey = sessionStorage.getItem('masterKey');
    if (!masterKey) {
      throw new Error('未解锁，请先输入密码');
    }

    bookmarkService.setMasterKey(masterKey);

    const result = await bookmarkService.addBookmark(data);

    if (!result.success) {
      throw new Error(result.error || '保存书签失败');
    }

    // 刷新页面
    window.location.reload();
  }, []);

  // 编辑书签
  const handleEditBookmark = useCallback((id: string) => {
    console.log('编辑书签:', id);
    // TODO: 实现编辑功能（V1.1）
  }, []);

  // 删除书签
  const handleDeleteBookmark = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个书签吗？')) return;

    try {
      const storage = new ChromeStorageAdapter();
      const bookmarkService = new BookmarkService(storage);

      const masterKey = sessionStorage.getItem('masterKey');
      if (!masterKey) {
        throw new Error('未解锁，请先输入密码');
      }

      bookmarkService.setMasterKey(masterKey);

      const result = await bookmarkService.deleteBookmark(id);

      if (result.success) {
        // 刷新页面
        window.location.reload();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除书签失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  }, []);

  // 锁定应用
  const handleLock = useCallback(() => {
    sessionStorage.removeItem('masterKey');
    window.location.reload();
  }, []);

  return (
    <div className="popup-container">
      {/* 顶部搜索栏 */}
      <div className="popup-header">
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
        {/* 左侧文件夹列表 */}
        <FolderList
          folders={folders}
          selectedId={selectedFolderId}
          onSelect={setSelectedFolderId}
        />

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
        <span className="bookmark-count">
          {bookmarks.length} 个书签
        </span>
        <button
          className="btn-lock"
          onClick={handleLock}
          aria-label="锁定"
          title="锁定应用"
        >
          🔒 锁定
        </button>
      </div>

      {/* 快速添加面板 */}
      <QuickAddPanel
        visible={showQuickAdd}
        folders={folders}
        onClose={() => setShowQuickAdd(false)}
        onSave={handleSaveBookmark}
      />
    </div>
  );
};
