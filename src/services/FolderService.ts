import type { IStorageAdapter } from '@/storage/interfaces/IStorageAdapter';
import { EncryptedDataService } from './EncryptedDataService';
import { globalLockManager } from '@/storage';
import type { StorageLockManager } from '@/storage/services/StorageLockManager';
import type { Folder } from '@/types/data';
import type {
  FolderWithDefault,
  CreateFolderInput,
  Result,
  ValidationError,
  BatchOperationResult
} from '@/types/bookmark';
import {
  MAX_FOLDER_NAME_LENGTH,
  MIN_FOLDER_NAME_LENGTH,
  DEFAULT_FOLDER_ID,
  DEFAULT_FOLDER_NAME
} from '@/types/bookmark';
import type { BookmarkWithDeletion } from '@/types/bookmark';

/**
 * 文件夹服务
 * 负责文件夹的增删改查、书签级联迁移等业务
 */
export class FolderService extends EncryptedDataService {
  /** 存储适配器 - 书签数据（用于级联操作） */
  private bookmarkStorage: IStorageAdapter;
  /** 锁管理器 */
  private lockManager: StorageLockManager;

  constructor(
    folderStorage: IStorageAdapter,
    bookmarkStorage: IStorageAdapter,
    lockManager: StorageLockManager = globalLockManager
  ) {
    super(folderStorage);
    this.bookmarkStorage = bookmarkStorage;
    this.lockManager = lockManager;
  }

  /**
   * 读取所有文件夹
   */
  private async readFolders(): Promise<FolderWithDefault[]> {
    const folders = await this.readEncrypted<FolderWithDefault>();

    // 初始化或确保默认文件夹存在
    if (folders.length === 0) {
      return [this.createDefaultFolder()];
    }

    const hasDefault = folders.some(f => f.id === DEFAULT_FOLDER_ID);
    if (!hasDefault) {
      folders.unshift(this.createDefaultFolder());
    }

    return folders;
  }

  /**
   * 写入所有文件夹
   */
  private async writeFolders(folders: FolderWithDefault[]): Promise<void> {
    await this.writeEncrypted(folders);
  }

  /**
   * 读取所有书签（用于级联操作）
   */
  private async readBookmarks(): Promise<BookmarkWithDeletion[]> {
    return this.readEncrypted<BookmarkWithDeletion>(this.bookmarkStorage);
  }

  /**
   * 写入所有书签
   */
  private async writeBookmarks(bookmarks: BookmarkWithDeletion[]): Promise<void> {
    await this.writeEncrypted(bookmarks, this.bookmarkStorage);
  }

  /**
   * 创建默认"未分类"文件夹
   */
  private createDefaultFolder(): FolderWithDefault {
    return {
      id: DEFAULT_FOLDER_ID,
      name: DEFAULT_FOLDER_NAME,
      parentId: undefined,
      sort: 0,
      createTime: Date.now(),
      isDefault: true
    };
  }

  /**
   * 校验文件夹名称
   */
  private validateFolderName(name: string): ValidationError | null {
    if (!name || name.trim().length === 0) {
      return { field: 'name', message: '文件夹名称不能为空' };
    }
    if (name.length < MIN_FOLDER_NAME_LENGTH) {
      return { field: 'name', message: `文件夹名称至少${MIN_FOLDER_NAME_LENGTH}个字符` };
    }
    if (name.length > MAX_FOLDER_NAME_LENGTH) {
      return { field: 'name', message: `文件夹名称不能超过${MAX_FOLDER_NAME_LENGTH}个字符` };
    }
    return null;
  }

  /**
   * 创建文件夹
   */
  async createFolder(input: CreateFolderInput): Promise<Result<Folder>> {
    try {
      // 数据校验
      const validationErrors: ValidationError[] = [];

      const nameError = this.validateFolderName(input.name);
      if (nameError) validationErrors.push(nameError);

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: '数据校验失败',
          validationErrors
        };
      }

      // 检查名称唯一性
      const folders = await this.readFolders();
      const duplicate = folders.find(f => f.name === input.name);
      if (duplicate) {
        return {
          success: false,
          error: '文件夹名称已存在',
          validationErrors: [{ field: 'name', message: '名称已存在', actualValue: input.name }]
        };
      }

      // 创建文件夹
      const safeName = this.escapeHtml(input.name);
      const folder: Folder = {
        id: this.generateUuid(),
        name: safeName,
        parentId: input.parentId || undefined,
        sort: input.sort !== undefined ? input.sort : folders.length,
        createTime: Date.now()
      };

      folders.push(folder);
      await this.writeFolders(folders);

      return {
        success: true,
        data: folder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建文件夹失败'
      };
    }
  }

  /**
   * 删除文件夹（级联迁移书签至"未分类"）
   */
  async deleteFolder(id: string): Promise<Result<BatchOperationResult>> {
    // 使用锁保护整个删除流程，确保原子性
    return this.lockManager.withLock(
      this.storage,
      async () => {
        try {
          // 禁止删除默认文件夹
          if (id === DEFAULT_FOLDER_ID) {
            return {
              success: false,
              error: '默认"未分类"文件夹不可删除'
            };
          }

          const folders = await this.readFolders();
          const folderIndex = folders.findIndex(f => f.id === id);

          if (folderIndex === -1) {
            return {
              success: false,
              error: '文件夹不存在'
            };
          }

          // 查找该文件夹下的所有书签
          const bookmarks = await this.readBookmarks();
          const affectedBookmarks = bookmarks.filter(b => b.folderId === id && !b.isDeleted);

          // 如果没有书签,直接删除文件夹
          if (affectedBookmarks.length === 0) {
            folders.splice(folderIndex, 1);
            await this.writeFolders(folders);
            return {
              success: true,
              data: {
                successCount: 0,
                failedCount: 0
              }
            };
          }

          // === 事务性操作:先迁移书签,再删除文件夹 ===

          // 1. 备份完整书签数据(用于回滚)
          const originalBookmarks = bookmarks.map(b => ({ ...b }));

          try {
            // 2. 迁移书签至"未分类"
            affectedBookmarks.forEach(bookmark => {
              bookmark.folderId = DEFAULT_FOLDER_ID;
              bookmark.updateTime = Date.now();
            });

            // 3. 先保存书签(如果失败会抛异常)
            await this.writeBookmarks(bookmarks);

            // 4. 保存成功后,删除文件夹
            folders.splice(folderIndex, 1);
            await this.writeFolders(folders);

            // 5. 全部成功
            return {
              success: true,
              data: {
                successCount: affectedBookmarks.length,
                failedCount: 0
              }
            };

          } catch (saveError) {
            // === 回滚机制 ===
            // 恢复书签的原始数据
            affectedBookmarks.forEach((bookmark, index) => {
              Object.assign(bookmark, originalBookmarks[index]);
            });

            // 尝试回滚书签数据
            try {
              await this.writeBookmarks(bookmarks);
            } catch (rollbackError) {
              // 回滚失败,记录日志
              console.error('回滚失败:', rollbackError);
            }

            // 返回错误
            return {
              success: false,
              error: `删除文件夹失败: ${saveError instanceof Error ? saveError.message : '未知错误'}`,
              data: {
                successCount: 0,
                failedCount: affectedBookmarks.length,
                errors: ['书签迁移失败,已回滚操作']
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '删除文件夹失败'
          };
        }
      },
      'write'
    );
  }

  /**
   * 重命名文件夹
   */
  async renameFolder(id: string, newName: string): Promise<Result<Folder>> {
    try {
      // 数据校验
      const nameError = this.validateFolderName(newName);
      if (nameError) {
        return {
          success: false,
          error: '数据校验失败',
          validationErrors: [nameError]
        };
      }

      const folders = await this.readFolders();
      const index = folders.findIndex(f => f.id === id);

      if (index === -1) {
        return {
          success: false,
          error: '文件夹不存在'
        };
      }

      // 检查名称唯一性（排除自己）
      const duplicate = folders.find(f => f.name === newName && f.id !== id);
      if (duplicate) {
        return {
          success: false,
          error: '文件夹名称已存在',
          validationErrors: [{ field: 'name', message: '名称已存在', actualValue: newName }]
        };
      }

      // 更新名称
      const safeName = this.escapeHtml(newName);
      folders[index].name = safeName;
      await this.writeFolders(folders);

      return {
        success: true,
        data: folders[index]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '重命名文件夹失败'
      };
    }
  }

  /**
   * 获取所有文件夹
   */
  async getFolders(): Promise<Result<Folder[]>> {
    try {
      const folders = await this.readFolders();
      
      // 按 sort 字段排序
      folders.sort((a, b) => a.sort - b.sort);

      return {
        success: true,
        data: folders
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件夹列表失败'
      };
    }
  }

  /**
   * 获取默认"未分类"文件夹
   */
  async getDefaultFolder(): Promise<Result<Folder>> {
    try {
      const folders = await this.readFolders();
      const defaultFolder = folders.find(f => f.id === DEFAULT_FOLDER_ID);

      if (!defaultFolder) {
        // 理论上不应该发生，因为 readFolders 会确保默认文件夹存在
        const folder = this.createDefaultFolder();
        folders.push(folder);
        await this.writeFolders(folders);
        return { success: true, data: folder };
      }

      return {
        success: true,
        data: defaultFolder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取默认文件夹失败'
      };
    }
  }

  /**
   * 根据ID获取文件夹
   */
  async getFolderById(id: string): Promise<Result<Folder>> {
    try {
      const folders = await this.readFolders();
      const folder = folders.find(f => f.id === id);

      if (!folder) {
        return {
          success: false,
          error: '文件夹不存在'
        };
      }

      return {
        success: true,
        data: folder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件夹失败'
      };
    }
  }

  /**
   * 批量移动书签到指定文件夹
   * @param bookmarkIds 书签ID数组
   * @param targetFolderId 目标文件夹ID
   * @param expectedVersions 期望版本号映射(可选,用于并发控制)
   */
  async moveBooksToFolder(
    bookmarkIds: string[],
    targetFolderId: string,
    expectedVersions?: Record<string, number>
  ): Promise<Result<BatchOperationResult>> {
    try {
      // 检查目标文件夹是否存在
      const folders = await this.readFolders();
      const targetFolder = folders.find(f => f.id === targetFolderId);

      if (!targetFolder) {
        return {
          success: false,
          error: '目标文件夹不存在'
        };
      }

      // 批量更新书签
      const bookmarks = await this.readBookmarks();
      let successCount = 0;
      let failedCount = 0;
      const failedIds: string[] = [];
      const errors: string[] = [];

      for (const bookmarkId of bookmarkIds) {
        const index = bookmarks.findIndex(b => b.id === bookmarkId && !b.isDeleted);
        if (index === -1) {
          failedCount++;
          failedIds.push(bookmarkId);
          errors.push(`书签不存在或已删除: ${bookmarkId}`);
          continue;
        }

        // === 乐观锁冲突检测 ===
        if (expectedVersions && Object.prototype.hasOwnProperty.call(expectedVersions, bookmarkId)) {
          const currentVersion = bookmarks[index].version || 1;
          const expectedVersion = expectedVersions[bookmarkId];
          if (currentVersion !== expectedVersion) {
            failedCount++;
            failedIds.push(bookmarkId);
            errors.push(`书签(${bookmarkId})已被其他窗口修改(当前版本:${currentVersion},期望:${expectedVersion})`);
            continue;
          }
        }

        bookmarks[index].folderId = targetFolderId;
        bookmarks[index].updateTime = Date.now();
        bookmarks[index].version = (bookmarks[index].version || 1) + 1;
        successCount++;
      }

      // 如果有版本冲突,返回错误信息
      if (failedCount > 0 && errors.length > 0) {
        return {
          success: false,
          error: '部分书签已被其他窗口修改,请刷新后重试',
          data: {
            successCount,
            failedCount,
            failedIds,
            errors
          }
        };
      }

      // 保存书签
      if (successCount > 0) {
        await this.writeBookmarks(bookmarks);
      }

      return {
        success: true,
        data: {
          successCount,
          failedCount,
          failedIds: failedIds.length > 0 ? failedIds : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '移动书签失败'
      };
    }
  }

  /**
   * 获取文件夹内的书签数量
   */
  async getFolderBookmarkCount(folderId: string): Promise<Result<number>> {
    try {
      const bookmarks = await this.readBookmarks();
      const count = bookmarks.filter(b => b.folderId === folderId && !b.isDeleted).length;

      return {
        success: true,
        data: count
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取书签数量失败'
      };
    }
  }
}
