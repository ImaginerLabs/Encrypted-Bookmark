import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import { EncryptedDataService } from "./EncryptedDataService";
import type { Bookmark } from "@/types/data";
import type {
  BookmarkWithDeletion,
  AddBookmarkInput,
  EditBookmarkInput,
  BookmarkFilter,
  Result,
  UndoDeleteInfo,
  ValidationError,
} from "@/types/bookmark";
import {
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
  DEFAULT_FOLDER_ID,
  UNDO_TIMEOUT_MS,
} from "@/types/bookmark";

/**
 * 书签服务
 * 负责书签的增删改查、URL校验、撤销删除等核心业务
 */
export class BookmarkService extends EncryptedDataService {
  /** 待删除书签的定时器映射 */
  private deleteTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(storage: IStorageAdapter) {
    super(storage);
  }

  /**
   * 清除主密钥（重写以清理定时器）
   */
  override clearMasterKey(): void {
    super.clearMasterKey();
    // 清除所有删除定时器
    this.deleteTimers.forEach((timer) => clearTimeout(timer));
    this.deleteTimers.clear();
  }

  /**
   * 读取所有书签
   */
  private async readBookmarks(): Promise<BookmarkWithDeletion[]> {
    const bookmarks = await this.readEncrypted<BookmarkWithDeletion>();
    return bookmarks;
  }

  /**
   * 写入所有书签
   */
  private async writeBookmarks(
    bookmarks: BookmarkWithDeletion[],
  ): Promise<void> {
    await this.writeEncrypted(bookmarks);
  }

  /**
   * 校验URL格式
   */
  private validateUrl(url: string): ValidationError | null {
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return {
          field: "url",
          message: "URL必须使用http或https协议",
          actualValue: url,
        };
      }
      return null;
    } catch {
      return {
        field: "url",
        message: "URL格式无效",
        actualValue: url,
      };
    }
  }

  /**
   * 校验标题
   */
  private validateTitle(title: string): ValidationError | null {
    if (!title || title.trim().length === 0) {
      return { field: "title", message: "标题不能为空" };
    }
    if (title.length < MIN_TITLE_LENGTH) {
      return { field: "title", message: `标题至少${MIN_TITLE_LENGTH}个字符` };
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return {
        field: "title",
        message: `标题不能超过${MAX_TITLE_LENGTH}个字符`,
      };
    }
    return null;
  }

  /**
   * 检查URL是否重复
   */
  private async checkDuplicateUrl(
    url: string,
    excludeId?: string,
  ): Promise<Bookmark | null> {
    const bookmarks = await this.readBookmarks();
    const found = bookmarks.find(
      (b) => !b.isDeleted && b.url === url && b.id !== excludeId,
    );
    return found || null;
  }

  /**
   * 添加书签
   */
  async addBookmark(input: AddBookmarkInput): Promise<Result<Bookmark>> {
    try {
      // 数据校验
      const validationErrors: ValidationError[] = [];

      const titleError = this.validateTitle(input.title);
      if (titleError) validationErrors.push(titleError);

      const urlError = this.validateUrl(input.url);
      if (urlError) validationErrors.push(urlError);

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: "数据校验失败",
          validationErrors,
        };
      }

      // 检查重复URL（不强制拦截，仅提示）
      const duplicate = await this.checkDuplicateUrl(input.url);
      if (duplicate) {
        console.warn(`URL已存在: ${input.url} (ID: ${duplicate.id})`);
      }

      // XSS防护
      const safeTitle = this.escapeHtml(input.title);
      const safeNote = input.note ? this.escapeHtml(input.note) : undefined;

      // 创建书签对象
      const now = Date.now();
      const bookmark: BookmarkWithDeletion = {
        id: this.generateUuid(),
        title: safeTitle,
        url: input.url,
        folderId: input.folderId || DEFAULT_FOLDER_ID,
        tags: input.tags || [],
        note: safeNote,
        createTime: now,
        updateTime: now,
        visitCount: 0,
        isReadLater: input.isReadLater || undefined,
        version: 1, // 初始版本号
      };

      // 保存
      const bookmarks = await this.readBookmarks();
      bookmarks.push(bookmark);
      await this.writeBookmarks(bookmarks);

      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "添加书签失败",
      };
    }
  }

  /**
   * 删除书签（标记删除，5秒内可撤销）
   */
  async deleteBookmark(id: string): Promise<Result<UndoDeleteInfo>> {
    try {
      const bookmarks = await this.readBookmarks();
      const index = bookmarks.findIndex((b) => b.id === id && !b.isDeleted);

      if (index === -1) {
        return {
          success: false,
          error: "书签不存在或已被删除",
        };
      }

      // 标记为待删除
      const deleteTime = Date.now();
      bookmarks[index].isDeleted = true;
      bookmarks[index].deleteTime = deleteTime;
      await this.writeBookmarks(bookmarks);

      // 设置5秒后永久删除的定时器
      const timer = setTimeout(() => {
        this.permanentlyDelete(id).catch((err) => {
          console.error(`永久删除书签失败 (ID: ${id}):`, err);
        });
      }, UNDO_TIMEOUT_MS);

      this.deleteTimers.set(id, timer);

      return {
        success: true,
        data: {
          bookmarkId: id,
          deleteTime,
          remainingTime: UNDO_TIMEOUT_MS,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "删除书签失败",
      };
    }
  }

  /**
   * 撤销删除
   */
  async undoDelete(id: string): Promise<Result<Bookmark>> {
    try {
      const bookmarks = await this.readBookmarks();
      const index = bookmarks.findIndex((b) => b.id === id && b.isDeleted);

      if (index === -1) {
        return {
          success: false,
          error: "书签不存在或未处于删除状态",
        };
      }

      // 检查是否超时
      const bookmark = bookmarks[index];
      if (
        bookmark.deleteTime &&
        Date.now() - bookmark.deleteTime > UNDO_TIMEOUT_MS
      ) {
        return {
          success: false,
          error: "撤销时间已过，书签已被永久删除",
        };
      }

      // 恢复书签
      delete bookmark.isDeleted;
      delete bookmark.deleteTime;
      await this.writeBookmarks(bookmarks);

      // 清除定时器
      const timer = this.deleteTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.deleteTimers.delete(id);
      }

      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "撤销删除失败",
      };
    }
  }

  /**
   * 永久删除书签（内部方法）
   */
  private async permanentlyDelete(id: string): Promise<void> {
    const bookmarks = await this.readBookmarks();
    const filtered = bookmarks.filter((b) => b.id !== id);
    await this.writeBookmarks(filtered);
    this.deleteTimers.delete(id);
  }

  /**
   * 编辑书签 (V1.2 - 添加并发控制)
   * @param id 书签ID
   * @param input 更新内容
   * @param expectedVersion 期望版本号(用于并发控制,可选)
   */
  async editBookmark(
    id: string,
    input: EditBookmarkInput,
    expectedVersion?: number,
  ): Promise<Result<Bookmark>> {
    try {
      const bookmarks = await this.readBookmarks();
      const index = bookmarks.findIndex((b) => b.id === id && !b.isDeleted);

      if (index === -1) {
        return {
          success: false,
          error: "书签不存在",
        };
      }

      const bookmark = bookmarks[index];

      // === 并发冲突检测 ===
      if (expectedVersion !== undefined) {
        const currentVersion = bookmark.version || 1;
        if (currentVersion !== expectedVersion) {
          return {
            success: false,
            error: `数据已在其他窗口变更(当前版本:${currentVersion}, 期望:${expectedVersion}),请刷新后重试`,
            validationErrors: [
              {
                field: "version",
                message: "版本号冲突",
                actualValue: currentVersion,
              },
            ],
          };
        }
      }

      // 数据校验
      const validationErrors: ValidationError[] = [];

      if (input.title !== undefined) {
        const titleError = this.validateTitle(input.title);
        if (titleError) validationErrors.push(titleError);
      }

      if (input.url !== undefined) {
        const urlError = this.validateUrl(input.url);
        if (urlError) validationErrors.push(urlError);

        // 检查重复URL
        const duplicate = await this.checkDuplicateUrl(input.url, id);
        if (duplicate) {
          console.warn(`URL已存在: ${input.url} (ID: ${duplicate.id})`);
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: "数据校验失败",
          validationErrors,
        };
      }

      // 更新书签
      if (input.title !== undefined) {
        bookmark.title = this.escapeHtml(input.title);
      }
      if (input.url !== undefined) {
        bookmark.url = input.url;
      }
      if (input.folderId !== undefined) {
        bookmark.folderId = input.folderId;
      }
      if (input.tags !== undefined) {
        bookmark.tags = input.tags;
      }
      if (input.note !== undefined) {
        bookmark.note = this.escapeHtml(input.note);
      }
      bookmark.updateTime = Date.now();

      // === 递增版本号 ===
      bookmark.version = (bookmark.version || 1) + 1;

      await this.writeBookmarks(bookmarks);

      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "编辑书签失败",
      };
    }
  }

  /**
   * 查询书签
   */
  async getBookmarks(filter?: BookmarkFilter): Promise<Result<Bookmark[]>> {
    try {
      let bookmarks = await this.readBookmarks();

      // 默认不包含已删除的书签
      if (!filter?.includeDeleted) {
        bookmarks = bookmarks.filter((b) => !b.isDeleted);
      }

      // 按文件夹筛选
      if (filter?.folderId) {
        bookmarks = bookmarks.filter((b) => b.folderId === filter.folderId);
      }

      // 按"稍后再读"筛选
      if (filter?.isReadLater !== undefined) {
        if (filter.isReadLater) {
          bookmarks = bookmarks.filter((b) => b.isReadLater === true);
        } else {
          bookmarks = bookmarks.filter((b) => !b.isReadLater);
        }
      }

      // 按标签筛选（AND逻辑）
      if (filter?.tagIds && filter.tagIds.length > 0) {
        bookmarks = bookmarks.filter((b) =>
          filter.tagIds!.every((tagId) => b.tags?.includes(tagId)),
        );
      }

      // 搜索文本（标题或URL）
      if (filter?.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        bookmarks = bookmarks.filter(
          (b) =>
            b.title.toLowerCase().includes(searchLower) ||
            b.url.toLowerCase().includes(searchLower),
        );
      }

      // 排序
      const sortBy = filter?.sortBy || "createTime";
      const sortOrder = filter?.sortOrder || "desc";
      bookmarks.sort((a, b) => {
        let aVal: number | string = a[sortBy] || 0;
        let bVal: number | string = b[sortBy] || 0;

        if (sortBy === "title") {
          aVal = (a.title || "").toLowerCase();
          bVal = (b.title || "").toLowerCase();
          return sortOrder === "asc"
            ? aVal < bVal
              ? -1
              : 1
            : aVal > bVal
              ? -1
              : 1;
        }

        return sortOrder === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      // 分页
      if (filter?.offset !== undefined || filter?.limit !== undefined) {
        const offset = filter.offset || 0;
        const limit = filter.limit || 500;
        bookmarks = bookmarks.slice(offset, offset + limit);
      }

      return {
        success: true,
        data: bookmarks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "查询书签失败",
      };
    }
  }

  /**
   * 获取单个书签
   */
  async getBookmarkById(id: string): Promise<Result<Bookmark>> {
    try {
      const bookmarks = await this.readBookmarks();
      const bookmark = bookmarks.find((b) => b.id === id && !b.isDeleted);

      if (!bookmark) {
        return {
          success: false,
          error: "书签不存在",
        };
      }

      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "获取书签失败",
      };
    }
  }

  /**
   * 增加书签访问次数
   */
  async incrementVisitCount(id: string): Promise<Result<void>> {
    try {
      const bookmarks = await this.readBookmarks();
      const index = bookmarks.findIndex((b) => b.id === id && !b.isDeleted);

      if (index === -1) {
        return {
          success: false,
          error: "书签不存在",
        };
      }

      bookmarks[index].visitCount = (bookmarks[index].visitCount || 0) + 1;
      bookmarks[index].updateTime = Date.now();
      await this.writeBookmarks(bookmarks);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "更新访问次数失败",
      };
    }
  }

  /**
   * 获取待删除的书签列表（用于UI显示倒计时）
   */
  async getPendingDeletes(): Promise<Result<UndoDeleteInfo[]>> {
    try {
      const bookmarks = await this.readBookmarks();
      const now = Date.now();
      const pending = bookmarks
        .filter((b) => b.isDeleted && b.deleteTime)
        .map((b) => ({
          bookmarkId: b.id,
          deleteTime: b.deleteTime!,
          remainingTime: Math.max(0, UNDO_TIMEOUT_MS - (now - b.deleteTime!)),
        }))
        .filter((info) => info.remainingTime > 0);

      return {
        success: true,
        data: pending,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "获取待删除列表失败",
      };
    }
  }
}
