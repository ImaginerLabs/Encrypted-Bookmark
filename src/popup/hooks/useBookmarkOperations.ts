import { useState, useCallback } from "react";
import { useServices } from "./useServices";
import type { AddBookmarkInput } from "@/types/bookmark";

interface UseBookmarkOperationsOptions {
  refetchAll: () => Promise<void>;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useBookmarkOperations({
  refetchAll,
  showToast,
}: UseBookmarkOperationsOptions) {
  const { bookmarkService } = useServices();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleQuickAdd = useCallback(() => {
    setShowQuickAdd(true);
  }, []);

  const handleSaveBookmark = useCallback(
    async (data: AddBookmarkInput) => {
      const result = await bookmarkService.addBookmark(data);
      if (!result.success) {
        throw new Error(result.error || "保存书签失败");
      }
      showToast("书签已保存", "success");
      await refetchAll();
      setShowQuickAdd(false);
    },
    [bookmarkService, refetchAll, showToast],
  );

  const handleEditBookmark = useCallback((id: string) => {
    console.log("编辑书签:", id);
  }, []);

  const handleDeleteBookmark = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const result = await bookmarkService.deleteBookmark(id);
        if (result.success) {
          showToast("书签已删除", "success");
          await refetchAll();
          return true;
        } else {
          showToast(result.error || "删除失败", "error");
          return false;
        }
      } catch (error) {
        console.error("删除书签失败:", error);
        showToast(
          error instanceof Error ? error.message : "删除失败",
          "error",
        );
        return false;
      }
    },
    [bookmarkService, refetchAll, showToast],
  );

  const handleCloseQuickAdd = useCallback(() => {
    setShowQuickAdd(false);
  }, []);

  return {
    showQuickAdd,
    handleQuickAdd,
    handleSaveBookmark,
    handleEditBookmark,
    handleDeleteBookmark,
    handleCloseQuickAdd,
  };
}