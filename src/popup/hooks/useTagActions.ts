import { useCallback, useState } from "react";
import { useServices } from "./useServices";
import type { Result } from "@/types/bookmark";

/**
 * 标签操作 Hook
 * 封装标签的删除操作
 */
export const useTagActions = () => {
  const { tagService } = useServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 删除标签 */
  const deleteTag = useCallback(
    async (id: string): Promise<Result<{ affectedBookmarks: number }>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await tagService.deleteTag(id);
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
    [tagService],
  );

  return {
    loading,
    error,
    deleteTag,
  };
};
