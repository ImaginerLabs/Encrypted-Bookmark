import { useState, useEffect, useCallback } from "react";
import type { Tag } from "@/types/data";
import { useServices } from "./useServices";

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
  const { tagService } = useServices();

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
  }, [tagService]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  /** 刷新标签列表 */
  const refetch = useCallback(() => {
    void loadTags();
  }, [loadTags]);

  return { tags, loading, error, refetch };
};
