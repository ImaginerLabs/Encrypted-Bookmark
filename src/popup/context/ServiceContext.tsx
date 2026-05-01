import React, { createContext, useMemo } from "react";
import { BookmarkService } from "@/services/BookmarkService";
import { FolderService } from "@/services/FolderService";
import { TagService } from "@/services/TagService";
import { ChromeStorageAdapter } from "@/storage/adapters/ChromeStorageAdapter";

/**
 * ServiceContext 提供的值
 * 统一管理所有 Service 实例和 masterKey
 */
export interface ServiceContextValue {
  bookmarkService: BookmarkService;
  folderService: FolderService;
  tagService: TagService;
  masterKey: string;
  isUnlocked: boolean;
}

export const ServiceContext = createContext<ServiceContextValue | null>(null);

interface ServiceProviderProps {
  masterKey: string;
  children: React.ReactNode;
}

/**
 * ServiceProvider
 * 根据 masterKey 创建并注入所有 Service 实例
 * masterKey 变化时自动重建所有实例
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  masterKey,
  children,
}) => {
  const value = useMemo<ServiceContextValue>(() => {
    const bookmarkStorage = ChromeStorageAdapter.getInstance();
    const folderStorage = ChromeStorageAdapter.getFolderInstance();
    const tagStorage = ChromeStorageAdapter.getTagInstance();

    const bookmarkService = new BookmarkService(bookmarkStorage);
    bookmarkService.setMasterKey(masterKey);

    const folderService = new FolderService(folderStorage, bookmarkStorage);
    folderService.setMasterKey(masterKey);

    const tagService = new TagService(tagStorage, bookmarkStorage);
    tagService.setMasterKey(masterKey);

    return {
      bookmarkService,
      folderService,
      tagService,
      masterKey,
      isUnlocked: true,
    };
  }, [masterKey]);

  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
};
