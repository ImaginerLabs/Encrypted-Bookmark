import { useState, useEffect } from "react";
import type { Bookmark } from "@/types/data";
import { BookmarkService } from "@/services/BookmarkService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";

/**
 * 书签数据管理 Hook
 * 负责获取、过滤、搜索书签
 */
export const useBookmarks = (
  folderId: string | null,
  searchKeyword: string,
  isReadLater?: boolean,
) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        setLoading(true);
        setError(null);

        // 创建 BookmarkService 实例
        const storage = ChromeStorageAdapter.getInstance();
        const bookmarkService = new BookmarkService(storage);

        // 从 sessionStorage 获取主密钥（Task4 会话管理）
        const masterKey = sessionStorage.getItem("masterKey");
        if (!masterKey) {
          throw new Error("未解锁，请先输入密码");
        }

        bookmarkService.setMasterKey(masterKey);

        // 查询书签
        const result = await bookmarkService.getBookmarks({
          folderId: folderId || undefined,
          searchText: searchKeyword || undefined,
          isReadLater: isReadLater,
          includeDeleted: false,
          sortBy: "updateTime",
          sortOrder: "desc",
        });

        if (result.success && result.data) {
          setBookmarks(result.data);
        } else {
          throw new Error(result.error || "获取书签失败");
        }
      } catch (err) {
        console.error("加载书签失败:", err);
        setError(err as Error);
        setBookmarks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookmarks();
  }, [folderId, searchKeyword, isReadLater]);

  return { bookmarks, loading, error };
};
