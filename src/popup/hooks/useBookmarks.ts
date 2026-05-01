import { useState, useEffect, useCallback } from "react";
import type { Bookmark } from "@/types/data";
import { useServices } from "./useServices";

/**
 * 书签数据管理 Hook
 * 负责获取、过滤、搜索书签
 */
export const useBookmarks = (
  folderId: string | null,
  searchKeyword: string,
  isReadLater?: boolean,
) => {
  const { bookmarkService } = useServices();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
  }, [folderId, searchKeyword, isReadLater, bookmarkService]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const refetch = useCallback(async () => {
    await loadBookmarks();
  }, [loadBookmarks]);

  return { bookmarks, loading, error, refetch };
};
