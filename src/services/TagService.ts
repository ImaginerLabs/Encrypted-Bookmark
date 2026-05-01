import type { IStorageAdapter } from '@/storage/interfaces/IStorageAdapter';
import { EncryptedDataService } from './EncryptedDataService';
import { globalLockManager } from '@/storage';
import type { StorageLockManager } from '@/storage/services/StorageLockManager';
import type { Tag } from '@/types/data';
import type {
  AddTagInput,
  TagColor,
  Result,
  ValidationError
} from '@/types/bookmark';
import {
  MAX_TAG_NAME_LENGTH,
  MIN_TAG_NAME_LENGTH
} from '@/types/bookmark';
import type { BookmarkWithDeletion } from '@/types/bookmark';

// 从 types 导入颜色映射（单一数据源）
import { TAG_COLOR_MAP as COLORS } from '@/types/bookmark';

/**
 * 标签服务
 * 负责标签的增删改查、颜色管理、书签关联等业务
 */
export class TagService extends EncryptedDataService {
  /** 存储适配器 - 书签数据（用于关联操作） */
  private bookmarkStorage: IStorageAdapter;
  /** 锁管理器 */
  private lockManager: StorageLockManager;

  constructor(
    tagStorage: IStorageAdapter,
    bookmarkStorage: IStorageAdapter,
    lockManager: StorageLockManager = globalLockManager
  ) {
    super(tagStorage);
    this.bookmarkStorage = bookmarkStorage;
    this.lockManager = lockManager;
  }

  /**
   * 读取所有标签
   */
  private async readTags(): Promise<Tag[]> {
    return this.readEncrypted<Tag>();
  }

  /**
   * 写入所有标签
   */
  private async writeTags(tags: Tag[]): Promise<void> {
    await this.writeEncrypted(tags);
  }

  /**
   * 读取所有书签
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
   * 校验标签名称
   */
  private validateTagName(name: string): ValidationError | null {
    if (!name || name.trim().length === 0) {
      return { field: 'name', message: '标签名称不能为空' };
    }
    if (name.length < MIN_TAG_NAME_LENGTH) {
      return { field: 'name', message: `标签名称至少${MIN_TAG_NAME_LENGTH}个字符` };
    }
    if (name.length > MAX_TAG_NAME_LENGTH) {
      return { field: 'name', message: `标签名称不能超过${MAX_TAG_NAME_LENGTH}个字符` };
    }
    return null;
  }

  /**
   * 校验颜色值
   */
  private validateColor(color: string): boolean {
    return Object.values(COLORS).includes(color);
  }

  /**
   * 获取默认颜色
   */
  private getDefaultColor(): string {
    return COLORS.blue;
  }

  /**
   * 添加标签
   */
  async addTag(input: AddTagInput): Promise<Result<Tag>> {
    try {
      // 数据校验
      const validationErrors: ValidationError[] = [];

      const nameError = this.validateTagName(input.name);
      if (nameError) validationErrors.push(nameError);

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: '数据校验失败',
          validationErrors
        };
      }

      // 检查名称唯一性（不区分大小写）
      const tags = await this.readTags();
      const nameLower = input.name.toLowerCase();
      const duplicate = tags.find(t => t.name.toLowerCase() === nameLower);
      
      if (duplicate) {
        // 如果标签已存在，返回已有标签（复用）
        return {
          success: true,
          data: duplicate
        };
      }

      // 获取颜色值
      let color = this.getDefaultColor();
      if (input.color && COLORS[input.color]) {
        color = COLORS[input.color];
      }

      // 创建标签
      const safeName = this.escapeHtml(input.name);
      const tag: Tag = {
        id: this.generateUuid(),
        name: safeName,
        color,
        createTime: Date.now()
      };

      tags.push(tag);
      await this.writeTags(tags);

      return {
        success: true,
        data: tag
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加标签失败'
      };
    }
  }

  /**
   * 删除标签（从所有书签移除）
   */
  async deleteTag(id: string): Promise<Result<{ affectedBookmarks: number }>> {
    // 使用锁保护整个删除流程，确保原子性
    return this.lockManager.withLock(
      this.storage,
      async () => {
        try {
          const tags = await this.readTags();
          const tagIndex = tags.findIndex(t => t.id === id);

          if (tagIndex === -1) {
            return {
              success: false,
              error: '标签不存在'
            };
          }

          // 从所有书签中移除该标签
          const bookmarks = await this.readBookmarks();
          const affectedBookmarks = bookmarks.filter(
            b => b.tags && b.tags.includes(id)
          );

          // 备份所有书签原始数据（用于回滚）
          const originalBookmarks = bookmarks.map(b => ({ ...b }));

          let affectedCount = 0;

          try {
            // 修改书签，移除该标签
            bookmarks.forEach(bookmark => {
              if (bookmark.tags && bookmark.tags.includes(id)) {
                bookmark.tags = bookmark.tags.filter(tagId => tagId !== id);
                bookmark.updateTime = Date.now();
                affectedCount++;
              }
            });

            // 保存书签（如果失败会抛异常）
            if (affectedCount > 0) {
              await this.writeBookmarks(bookmarks);
            }

            // 删除标签
            tags.splice(tagIndex, 1);
            await this.writeTags(tags);

            return {
              success: true,
              data: { affectedBookmarks: affectedCount }
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
              console.error('回滚失败:', rollbackError);
            }

            return {
              success: false,
              error: `删除标签失败: ${saveError instanceof Error ? saveError.message : '未知错误'}`
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '删除标签失败'
          };
        }
      },
      'write'
    );
  }

  /**
   * 获取所有标签
   */
  async getTags(): Promise<Result<Tag[]>> {
    try {
      const tags = await this.readTags();
      
      // 按创建时间排序（最新的在前）
      tags.sort((a, b) => b.createTime - a.createTime);

      return {
        success: true,
        data: tags
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取标签列表失败'
      };
    }
  }

  /**
   * 根据ID获取标签
   */
  async getTagById(id: string): Promise<Result<Tag>> {
    try {
      const tags = await this.readTags();
      const tag = tags.find(t => t.id === id);

      if (!tag) {
        return {
          success: false,
          error: '标签不存在'
        };
      }

      return {
        success: true,
        data: tag
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取标签失败'
      };
    }
  }

  /**
   * 获取书签的所有标签
   */
  async getTagsByBookmark(bookmarkId: string): Promise<Result<Tag[]>> {
    try {
      const bookmarks = await this.readBookmarks();
      const bookmark = bookmarks.find(b => b.id === bookmarkId);

      if (!bookmark || !bookmark.tags || bookmark.tags.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const allTags = await this.readTags();
      const bookmarkTags = allTags.filter(t => bookmark.tags!.includes(t.id));

      return {
        success: true,
        data: bookmarkTags
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取书签标签失败'
      };
    }
  }

  /**
   * 按标签筛选书签
   */
  async getBookmarksByTag(tagId: string): Promise<Result<BookmarkWithDeletion[]>> {
    try {
      // 检查标签是否存在
      const tags = await this.readTags();
      const tag = tags.find(t => t.id === tagId);

      if (!tag) {
        return {
          success: false,
          error: '标签不存在'
        };
      }

      // 查找包含该标签的所有书签
      const bookmarks = await this.readBookmarks();
      const filtered = bookmarks.filter(
        b => !b.isDeleted && b.tags && b.tags.includes(tagId)
      );

      return {
        success: true,
        data: filtered
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '按标签筛选书签失败'
      };
    }
  }

  /**
   * 设置标签颜色
   */
  async setTagColor(id: string, color: TagColor | string): Promise<Result<Tag>> {
    try {
      const tags = await this.readTags();
      const index = tags.findIndex(t => t.id === id);

      if (index === -1) {
        return {
          success: false,
          error: '标签不存在'
        };
      }

      // 验证颜色值
      let colorValue: string;
      if (typeof color === 'string' && color.startsWith('#')) {
        // 直接传入HEX值
        if (!this.validateColor(color)) {
          colorValue = this.getDefaultColor();
        } else {
          colorValue = color;
        }
      } else {
        // 传入颜色名称
        colorValue = COLORS[color as TagColor] || this.getDefaultColor();
      }

      tags[index].color = colorValue;
      await this.writeTags(tags);

      return {
        success: true,
        data: tags[index]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置标签颜色失败'
      };
    }
  }

  /**
   * 重命名标签
   */
  async renameTag(id: string, newName: string): Promise<Result<Tag>> {
    try {
      // 数据校验
      const nameError = this.validateTagName(newName);
      if (nameError) {
        return {
          success: false,
          error: '数据校验失败',
          validationErrors: [nameError]
        };
      }

      const tags = await this.readTags();
      const index = tags.findIndex(t => t.id === id);

      if (index === -1) {
        return {
          success: false,
          error: '标签不存在'
        };
      }

      // 检查名称唯一性（排除自己）
      const nameLower = newName.toLowerCase();
      const duplicate = tags.find(t => t.name.toLowerCase() === nameLower && t.id !== id);
      
      if (duplicate) {
        return {
          success: false,
          error: '标签名称已存在',
          validationErrors: [{ field: 'name', message: '名称已存在', actualValue: newName }]
        };
      }

      // 更新名称
      const safeName = this.escapeHtml(newName);
      tags[index].name = safeName;
      await this.writeTags(tags);

      return {
        success: true,
        data: tags[index]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '重命名标签失败'
      };
    }
  }

  /**
   * 获取标签使用统计
   */
  async getTagUsageCount(tagId: string): Promise<Result<number>> {
    try {
      const bookmarks = await this.readBookmarks();
      const count = bookmarks.filter(
        b => !b.isDeleted && b.tags && b.tags.includes(tagId)
      ).length;

      return {
        success: true,
        data: count
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取标签使用统计失败'
      };
    }
  }

  /**
   * 获取所有标签及其使用统计
   */
  async getTagsWithUsage(): Promise<Result<Array<Tag & { usageCount: number }>>> {
    try {
      const tags = await this.readTags();
      const bookmarks = await this.readBookmarks();

      const tagsWithUsage = tags.map(tag => {
        const usageCount = bookmarks.filter(
          b => !b.isDeleted && b.tags && b.tags.includes(tag.id)
        ).length;

        return {
          ...tag,
          usageCount
        };
      });

      // 按使用次数排序（使用多的在前）
      tagsWithUsage.sort((a, b) => b.usageCount - a.usageCount);

      return {
        success: true,
        data: tagsWithUsage
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取标签使用统计失败'
      };
    }
  }

  /**
   * 获取可用的标签颜色列表
   */
  getAvailableColors(): Array<{ name: TagColor; hex: string }> {
    return Object.entries(COLORS).map(([name, hex]) => ({
      name: name as TagColor,
      hex
    }));
  }
}
