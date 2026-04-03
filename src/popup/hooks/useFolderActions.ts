import { useCallback, useState } from "react";
import { FolderService } from "@/services/FolderService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";
import type {
  CreateFolderInput,
  Result,
  BatchOperationResult,
} from "@/types/bookmark";
import type { Folder } from "@/types/data";

/**
 * 文件夹操作 Hook
 * 封装文件夹的新建、重命名、删除操作
 */
export const useFolderActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 创建 FolderService 实例 */
  const createService = useCallback(() => {
    const folderStorage = ChromeStorageAdapter.getFolderInstance();
    const bookmarkStorage = ChromeStorageAdapter.getInstance();
    const service = new FolderService(folderStorage, bookmarkStorage);

    const masterKey = sessionStorage.getItem("masterKey");
    if (!masterKey) {
      throw new Error("未解锁，请先输入密码");
    }
    service.setMasterKey(masterKey);
    return service;
  }, []);

  /** 新建文件夹 */
  const createFolder = useCallback(
    async (name: string): Promise<Result<Folder>> => {
      setLoading(true);
      setError(null);
      try {
        const service = createService();
        const input: CreateFolderInput = { name };
        const result = await service.createFolder(input);
        if (!result.success) {
          setError(result.error || "创建文件夹失败");
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "创建文件夹失败";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [createService],
  );

  /** 重命名文件夹 */
  const renameFolder = useCallback(
    async (id: string, newName: string): Promise<Result<Folder>> => {
      setLoading(true);
      setError(null);
      try {
        const service = createService();
        const result = await service.renameFolder(id, newName);
        if (!result.success) {
          setError(result.error || "重命名失败");
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "重命名失败";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [createService],
  );

  /** 删除文件夹 */
  const deleteFolder = useCallback(
    async (id: string): Promise<Result<BatchOperationResult>> => {
      setLoading(true);
      setError(null);
      try {
        const service = createService();
        const result = await service.deleteFolder(id);
        if (!result.success) {
          setError(result.error || "删除文件夹失败");
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "删除文件夹失败";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [createService],
  );

  /** 获取文件夹下书签数量 */
  const getFolderBookmarkCount = useCallback(
    async (folderId: string): Promise<number> => {
      try {
        const service = createService();
        const result = await service.getFolderBookmarkCount(folderId);
        return result.success && result.data !== undefined ? result.data : 0;
      } catch {
        return 0;
      }
    },
    [createService],
  );

  return {
    loading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    getFolderBookmarkCount,
  };
};
