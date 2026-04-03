import { useCallback, useState } from "react";
import { TagService } from "@/services/TagService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";
import type { Result } from "@/types/bookmark";

/**
 * 标签操作 Hook
 * 封装标签的删除操作
 */
export const useTagActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 创建 TagService 实例 */
  const createService = useCallback(() => {
    const tagStorage = ChromeStorageAdapter.getTagInstance();
    const bookmarkStorage = ChromeStorageAdapter.getInstance();
    const service = new TagService(tagStorage, bookmarkStorage);

    const masterKey = sessionStorage.getItem("masterKey");
    if (!masterKey) {
      throw new Error("未解锁，请先输入密码");
    }
    service.setMasterKey(masterKey);
    return service;
  }, []);

  /** 删除标签 */
  const deleteTag = useCallback(
    async (id: string): Promise<Result<{ affectedBookmarks: number }>> => {
      setLoading(true);
      setError(null);
      try {
        const service = createService();
        const result = await service.deleteTag(id);
        if (!result.success) {
          setError(result.error || "删除标签失败");
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "删除标签失败";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [createService],
  );

  return {
    loading,
    error,
    deleteTag,
  };
};
