import { useState, useEffect, useCallback } from "react";
import type { Folder } from "@/types/data";
import { useServices } from "./useServices";

/**
 * 文件夹数据管理 Hook
 * 负责获取文件夹列表，支持手动刷新
 */
export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { folderService } = useServices();

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await folderService.getFolders();

      if (result.success && result.data) {
        setFolders(result.data);
      } else {
        throw new Error(result.error || "获取文件夹列表失败");
      }
    } catch (err) {
      console.error("加载文件夹失败:", err);
      setError(err as Error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [folderService]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  /** 刷新文件夹列表 */
  const refetch = useCallback(() => {
    void loadFolders();
  }, [loadFolders]);

  return { folders, loading, error, refetch };
};
