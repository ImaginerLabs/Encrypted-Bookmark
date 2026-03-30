import { useState, useEffect } from 'react';
import type { Folder } from '@/types/data';
import { FolderService } from '@/services/FolderService';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

/**
 * 文件夹数据管理 Hook
 * 负责获取文件夹列表
 */
export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        setLoading(true);
        setError(null);

        // 创建 FolderService 实例
        // 注意: ChromeStorageAdapter 目前使用同一个 key，需要根据实际情况调整
        const folderStorage = new ChromeStorageAdapter();
        const bookmarkStorage = new ChromeStorageAdapter();
        const folderService = new FolderService(folderStorage, bookmarkStorage);

        // 从 sessionStorage 获取主密钥
        const masterKey = sessionStorage.getItem('masterKey');
        if (!masterKey) {
          throw new Error('未解锁，请先输入密码');
        }

        folderService.setMasterKey(masterKey);

        // 获取文件夹列表
        const result = await folderService.getFolders();

        if (result.success && result.data) {
          setFolders(result.data);
        } else {
          throw new Error(result.error || '获取文件夹列表失败');
        }
      } catch (err) {
        console.error('加载文件夹失败:', err);
        setError(err as Error);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, []);

  return { folders, loading, error };
};
