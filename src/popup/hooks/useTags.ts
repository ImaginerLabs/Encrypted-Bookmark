import { useState, useEffect, useCallback } from "react";
import type { Tag } from "@/types/data";
import { TagService } from "@/services/TagService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";

/** 带使用统计的标签类型 */
export interface TagWithUsage extends Tag {
  usageCount: number;
}

/**
 * 标签数据管理 Hook
 * 负责获取标签列表和使用统计
 */
export const useTags = () => {
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tagStorage = ChromeStorageAdapter.getTagInstance();
      const bookmarkStorage = ChromeStorageAdapter.getInstance();
      const tagService = new TagService(tagStorage, bookmarkStorage);

      const masterKey = sessionStorage.getItem("masterKey");
      if (!masterKey) {
        throw new Error("未解锁，请先输入密码");
      }
      tagService.setMasterKey(masterKey);

      // 获取标签列表（含使用统计）
      const result = await tagService.getTagsWithUsage();

      if (result.success && result.data) {
        setTags(result.data);
      } else {
        throw new Error(result.error || "获取标签列表失败");
      }
    } catch (err) {
      console.error("加载标签失败:", err);
      setError(err as Error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  /** 刷新标签列表 */
  const refetch = useCallback(() => {
    void loadTags();
  }, [loadTags]);

  return { tags, loading, error, refetch };
};
