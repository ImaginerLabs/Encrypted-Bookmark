import type { IStorageAdapter } from '@/storage/interfaces/IStorageAdapter';
import { EncryptionService } from './EncryptionService';
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
import { StorageError, DataCorruptionError } from '@/types/errors';
import type { BookmarkWithDeletion } from '@/types/bookmark';

// 导入颜色映射
const TAG_COLORS: Record<TagColor, string> = {
  red: '#F44336',
  blue: '#2196F3',
  green: '#4CAF50',
  yellow: '#FFEB3B',
  purple: '#9C27B0',
  orange: '#FF9800',
  pink: '#E91E63'
};

/**
 * 标签服务
 * 负责标签的增删改查、颜色管理、书签关联等业务
 */
export class TagService {
  /** 存储适配器 - 标签数据 */
  private tagStorage: IStorageAdapter;
  /** 存储适配器 - 书签数据（用于关联操作） */
  private bookmarkStorage: IStorageAdapter;
  /** 当前解锁的主密钥 */
  private masterKey: string | null = null;

  constructor(tagStorage: IStorageAdapter, bookmarkStorage: IStorageAdapter) {
    this.tagStorage = tagStorage;
    this.bookmarkStorage = bookmarkStorage;
  }

  /**
   * 设置主密钥
   */
  setMasterKey(key: string): void {
    this.masterKey = key;
  }

  /**
   * 清除主密钥
   */
  clearMasterKey(): void {
    this.masterKey = null;
  }

  /**
   * 检查是否已解锁
   */
  private ensureUnlocked(): void {
    if (!this.masterKey) {
      throw new StorageError('应用未解锁，请先输入密码');
    }
  }

  /**
   * 读取所有标签
   */
  private async readTags(): Promise<Tag[]> {
    this.ensureUnlocked();

    const encryptedData = await this.tagStorage.read();
    if (!encryptedData) {
      return [];
    }

    try {
      const decrypted = await EncryptionService.decrypt(encryptedData, this.masterKey!);
      const tags = JSON.parse(decrypted) as Tag[];
      return Array.isArray(tags) ? tags : [];
    } catch (error) {
      throw new DataCorruptionError('标签数据解密失败', error);
    }
  }

  /**
   * 写入所有标签
   */
  private async writeTags(tags: Tag[]): Promise<void> {
    this.ensureUnlocked();

    const plaintext = JSON.stringify(tags);
    const encrypted = await EncryptionService.encrypt(plaintext, this.masterKey!);
    await this.tagStorage.write(encrypted);
  }

  /**
   * 读取所有书签
   */
  private async readBookmarks(): Promise<BookmarkWithDeletion[]> {
    this.ensureUnlocked();

    const encryptedData = await this.bookmarkStorage.read();
    if (!encryptedData) {
      return [];
    }

    try {
      const decrypted = await EncryptionService.decrypt(encryptedData, this.masterKey!);
      const bookmarks = JSON.parse(decrypted) as BookmarkWithDeletion[];
      return Array.isArray(bookmarks) ? bookmarks : [];
    } catch (error) {
      throw new DataCorruptionError('书签数据解密失败', error);
    }
  }

  /**
   * 写入所有书签
   */
  private async writeBookmarks(bookmarks: BookmarkWithDeletion[]): Promise<void> {
    this.ensureUnlocked();

    const plaintext = JSON.stringify(bookmarks);
    const encrypted = await EncryptionService.encrypt(plaintext, this.masterKey!);
    await this.bookmarkStorage.write(encrypted);
  }

  /**
   * 生成UUID v4
   */
  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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
    return Object.values(TAG_COLORS).includes(color);
  }

  /**
   * 获取默认颜色
   */
  private getDefaultColor(): string {
    return TAG_COLORS.blue;
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
      if (input.color && TAG_COLORS[input.color]) {
        color = TAG_COLORS[input.color];
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
      let affectedCount = 0;

      bookmarks.forEach(bookmark => {
        if (bookmark.tags && bookmark.tags.includes(id)) {
          bookmark.tags = bookmark.tags.filter(tagId => tagId !== id);
          bookmark.updateTime = Date.now();
          affectedCount++;
        }
      });

      // 保存书签
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除标签失败'
      };
    }
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
        colorValue = TAG_COLORS[color as TagColor] || this.getDefaultColor();
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
    return Object.entries(TAG_COLORS).map(([name, hex]) => ({
      name: name as TagColor,
      hex
    }));
  }
}
