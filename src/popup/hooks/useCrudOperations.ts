import { useCallback } from "react";
import { useFolderActions } from "./useFolderActions";
import { useTagActions } from "./useTagActions";
import type { Folder, Tag } from "@/types/data";

interface UseCrudOperationsOptions {
  folders: Folder[];
  tags: Tag[];
  folderBookmarkCounts: Record<string, number>;
  tagBookmarkCounts: Record<string, number>;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  refetchAll: () => Promise<void>;
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
  ) => void;
  clearSelection: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useCrudOperations({
  folders,
  tags,
  folderBookmarkCounts,
  tagBookmarkCounts,
  selectedFolderId,
  selectedTagId,
  refetchAll,
  showConfirmDialog,
  clearSelection,
  showToast,
}: UseCrudOperationsOptions) {
  const { createFolder, renameFolder, deleteFolder } = useFolderActions();
  const { deleteTag } = useTagActions();

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const result = await createFolder(name);
      if (result.success) {
        showToast("文件夹已创建", "success");
        await refetchAll();
      } else {
        showToast(result.error || "创建文件夹失败", "error");
      }
    },
    [createFolder, refetchAll, showToast],
  );

  const handleRenameFolder = useCallback(
    async (id: string, newName: string) => {
      const result = await renameFolder(id, newName);
      if (result.success) {
        showToast("文件夹已重命名", "success");
        await refetchAll();
      } else {
        showToast(result.error || "重命名失败", "error");
      }
    },
    [renameFolder, refetchAll, showToast],
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id);
      const folderName = folder?.name || "未知文件夹";
      const count = folderBookmarkCounts[id] || 0;

      showConfirmDialog(
        "删除文件夹",
        `确定要删除文件夹「${folderName}」吗？${count > 0 ? `该文件夹下的 ${count} 个书签将移至「未分类」。` : ""}`,
        async () => {
          const result = await deleteFolder(id);
          if (result.success) {
            showToast("文件夹已删除", "success");
            if (selectedFolderId === id) {
              clearSelection();
            }
            await refetchAll();
          } else {
            showToast(result.error || "删除文件夹失败", "error");
          }
        },
      );
    },
    [
      folders,
      folderBookmarkCounts,
      deleteFolder,
      refetchAll,
      selectedFolderId,
      showToast,
      showConfirmDialog,
      clearSelection,
    ],
  );

  const handleDeleteTag = useCallback(
    (id: string) => {
      const tag = tags.find((t) => t.id === id);
      const tagName = tag?.name || "未知标签";
      const count = tagBookmarkCounts[id] || 0;

      showConfirmDialog(
        "删除标签",
        `确定要删除标签「${tagName}」吗？${count > 0 ? `该标签将从 ${count} 个书签中移除。` : ""}`,
        async () => {
          const result = await deleteTag(id);
          if (result.success) {
            showToast("标签已删除", "success");
            if (selectedTagId === id) {
              clearSelection();
            }
            await refetchAll();
          } else {
            showToast(result.error || "删除标签失败", "error");
          }
        },
      );
    },
    [
      tags,
      tagBookmarkCounts,
      deleteTag,
      refetchAll,
      selectedTagId,
      showToast,
      showConfirmDialog,
      clearSelection,
    ],
  );

  return {
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleDeleteTag,
  };
}