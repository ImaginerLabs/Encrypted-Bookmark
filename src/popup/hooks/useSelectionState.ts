import { useState, useCallback } from "react";
import type { SidebarTabType } from "../components/SidebarTabs";

export function useSelectionState() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isReadLaterMode, setIsReadLaterMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTabType>("folders");

  const handleTabChange = useCallback((tab: SidebarTabType) => {
    setSidebarTab(tab);
    if (tab === "folders") {
      setSelectedTagId(null);
    } else {
      setSelectedFolderId(null);
      setIsReadLaterMode(false);
    }
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedTagId(null);
    setIsReadLaterMode(false);
  }, []);

  const handleSelectReadLater = useCallback(() => {
    setIsReadLaterMode(true);
    setSelectedFolderId(null);
    setSelectedTagId(null);
  }, []);

  const handleSelectTag = useCallback((tagId: string | null) => {
    setSelectedTagId(tagId);
    setSelectedFolderId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFolderId(null);
    setSelectedTagId(null);
    setIsReadLaterMode(false);
  }, []);

  return {
    selectedFolderId,
    selectedTagId,
    isReadLaterMode,
    sidebarTab,
    handleTabChange,
    handleSelectFolder,
    handleSelectReadLater,
    handleSelectTag,
    clearSelection,
  };
}