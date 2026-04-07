import type { IStorageAdapter } from "@/storage/interfaces/IStorageAdapter";
import type { Bookmark, Folder, Tag } from "@/types/data";
import type {
  ImportOptions,
  ImportResult,
  ExportOptions,
  ExportResult,
  ImportExportData,
  BackupFileData,
  ImportProgress,
} from "@/types/import-export";
import { EncryptionService } from "./EncryptionService";
import { FolderService } from "./FolderService";
import { TagService } from "./TagService";
import { HtmlParser } from "./parsers/HtmlParser";
import { JsonParser } from "./parsers/JsonParser";
import { HtmlGenerator } from "./parsers/HtmlGenerator";
import { StorageError } from "@/types/errors";

/**
 * 导入导出服务
 * 负责书签数据的导入导出、格式转换、数据迁移
 */
export class ImportExportService {
  private storage: IStorageAdapter;
  private masterKey: string | null = null;
  private progressCallback?: (progress: ImportProgress) => void;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
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
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 检查是否已解锁
   */
  private ensureUnlocked(): void {
    if (!this.masterKey) {
      throw new StorageError("应用未解锁，请先输入密码");
    }
  }

  /**
   * 报告进度
   */
  private reportProgress(current: number, total: number, stage: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        stage,
      });
    }
  }

  /**
   * 导入书签
   */
  async importBookmarks(options: ImportOptions): Promise<ImportResult> {
    try {
      this.ensureUnlocked();

      this.reportProgress(0, 100, "开始导入...");

      // 1. 解析文件
      let importData: ImportExportData;

      switch (options.format) {
        case "html":
          importData = await this.parseHtmlFile(options.fileContent);
          break;
        case "json":
          importData = await this.parseJsonFile(options.fileContent);
          break;
        case "pbm":
          importData = await this.parsePbmFile(
            options.fileContent,
            options.decryptionKey,
          );
          break;
        default:
          throw new Error(`不支持的格式: ${options.format}`);
      }

      this.reportProgress(30, 100, "文件解析完成");

      // 2. 数据清理和验证
      importData = JsonParser.sanitizeData(importData);

      this.reportProgress(40, 100, "数据验证完成");

      // 3. 执行导入策略
      const result = await this.executeImportStrategy(
        importData,
        options.strategy,
      );

      this.reportProgress(100, 100, "导入完成");

      return result;
    } catch (error) {
      return {
        success: false,
        importedBookmarks: 0,
        importedFolders: 0,
        importedTags: 0,
        skippedBookmarks: 0,
        error: error instanceof Error ? error.message : "导入失败",
      };
    }
  }

  /**
   * 解析 HTML 文件
   */
  private async parseHtmlFile(htmlContent: string): Promise<ImportExportData> {
    const validation = HtmlParser.validate(htmlContent);
    if (!validation.isValid) {
      throw new Error(validation.error || "HTML 格式验证失败");
    }

    const parser = new HtmlParser();
    const { bookmarks, folders } = parser.parse(htmlContent);

    return {
      version: __APP_VERSION__,
      exportTime: Date.now(),
      bookmarks,
      folders,
      tags: [],
    };
  }

  /**
   * 解析 JSON 文件
   */
  private async parseJsonFile(jsonContent: string): Promise<ImportExportData> {
    const jsonType = JsonParser.detectJsonType(jsonContent);

    if (jsonType === "pbm") {
      throw new Error("这是一个加密的 PBM 文件，请选择 PBM 格式导入");
    }

    if (jsonType === "unknown") {
      throw new Error("无法识别的 JSON 格式");
    }

    const data = JsonParser.parseJson(jsonContent);

    // 版本兼容性检查
    const compatibility = JsonParser.checkVersionCompatibility(data.version);
    if (!compatibility.compatible) {
      throw new Error(compatibility.warning || "版本不兼容");
    }

    return data;
  }

  /**
   * 解析 PBM 文件
   */
  private async parsePbmFile(
    pbmContent: string,
    decryptionKey?: string,
  ): Promise<ImportExportData> {
    const pbmData = JsonParser.parsePbm(pbmContent);

    // 如果是加密的，需要解密
    if (pbmData.encrypted) {
      if (!decryptionKey) {
        throw new Error("加密文件需要提供解密密钥");
      }

      if (!pbmData.encryptedData || !pbmData.salt || !pbmData.iv) {
        throw new Error("加密文件数据不完整");
      }

      try {
        const encryptedData = {
          version: 1,
          salt: pbmData.salt,
          iv: pbmData.iv,
          ciphertext: pbmData.encryptedData,
          checksum: pbmData.checksum || "",
        };

        const decrypted = await EncryptionService.decrypt(
          encryptedData,
          decryptionKey,
        );
        const data = JSON.parse(decrypted) as ImportExportData;

        return data;
      } catch (error) {
        throw new Error("解密失败，请检查密钥是否正确");
      }
    }

    // 明文 PBM 文件
    if (!pbmData.data) {
      throw new Error("PBM 文件缺少数据");
    }

    return pbmData.data;
  }

  /**
   * 执行导入策略
   */
  private async executeImportStrategy(
    importData: ImportExportData,
    strategy: "merge" | "overwrite",
  ): Promise<ImportResult> {
    // 读取现有数据
    const existingBookmarks = await this.readBookmarks();
    const existingFolders = await this.readFolders();
    const existingTags = await this.readTags();

    let result: ImportResult;

    if (strategy === "overwrite") {
      // 覆盖模式：清空现有数据
      result = await this.overwriteImport(importData);
    } else {
      // 合并模式：智能去重
      result = await this.mergeImport(
        importData,
        existingBookmarks,
        existingFolders,
        existingTags,
      );
    }

    return result;
  }

  /**
   * 覆盖导入
   */
  private async overwriteImport(
    importData: ImportExportData,
  ): Promise<ImportResult> {
    const deletedCount = (await this.readBookmarks()).length;

    // 写入新数据
    await this.writeBookmarks(importData.bookmarks);
    await this.writeFolders(importData.folders || []);
    await this.writeTags(importData.tags || []);

    return {
      success: true,
      importedBookmarks: importData.bookmarks.length,
      importedFolders: importData.folders?.length || 0,
      importedTags: importData.tags?.length || 0,
      skippedBookmarks: 0,
      deletedBookmarks: deletedCount,
    };
  }

  /**
   * 合并导入
   */
  private async mergeImport(
    importData: ImportExportData,
    existingBookmarks: Bookmark[],
    existingFolders: Folder[],
    existingTags: Tag[],
  ): Promise<ImportResult> {
    const warnings: string[] = [];
    let skippedBookmarks = 0;

    // 1. 合并文件夹（去重）
    const folderMap = new Map<string, Folder>();
    const folderNameToId = new Map<string, string>();

    existingFolders.forEach((folder) => {
      folderMap.set(folder.id, folder);
      folderNameToId.set(folder.name, folder.id);
    });

    const newFolders: Folder[] = [];
    importData.folders?.forEach((folder) => {
      // 如果同名文件夹已存在，映射到现有 ID
      const existingId = folderNameToId.get(folder.name);
      if (existingId) {
        // 更新映射关系
        folderMap.set(folder.id, folderMap.get(existingId)!);
        warnings.push(`文件夹 "${folder.name}" 已存在，将合并到现有文件夹`);
      } else if (!folderMap.has(folder.id)) {
        folderMap.set(folder.id, folder);
        folderNameToId.set(folder.name, folder.id);
        newFolders.push(folder);
      }
    });

    // 2. 合并标签（去重）
    const tagMap = new Map<string, Tag>();
    const tagNameToId = new Map<string, string>();

    existingTags.forEach((tag) => {
      tagMap.set(tag.id, tag);
      tagNameToId.set(tag.name, tag.id);
    });

    const newTags: Tag[] = [];
    importData.tags?.forEach((tag) => {
      const existingId = tagNameToId.get(tag.name);
      if (existingId) {
        tagMap.set(tag.id, tagMap.get(existingId)!);
        warnings.push(`标签 "${tag.name}" 已存在，将合并`);
      } else if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, tag);
        tagNameToId.set(tag.name, tag.id);
        newTags.push(tag);
      }
    });

    // 3. 合并书签（按 URL 去重）
    const existingUrls = new Set(existingBookmarks.map((b) => b.url));
    const newBookmarks: Bookmark[] = [];

    importData.bookmarks.forEach((bookmark) => {
      if (existingUrls.has(bookmark.url)) {
        skippedBookmarks++;
        warnings.push(`书签 "${bookmark.title}" 的 URL 已存在，已跳过`);
      } else {
        newBookmarks.push(bookmark);
        existingUrls.add(bookmark.url);
      }
    });

    // 4. 写入合并后的数据
    const allBookmarks = [...existingBookmarks, ...newBookmarks];
    const allFolders = [...existingFolders, ...newFolders];
    const allTags = [...existingTags, ...newTags];

    await this.writeBookmarks(allBookmarks);
    await this.writeFolders(allFolders);
    await this.writeTags(allTags);

    return {
      success: true,
      importedBookmarks: newBookmarks.length,
      importedFolders: newFolders.length,
      importedTags: newTags.length,
      skippedBookmarks,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 导出书签
   */
  async exportBookmarks(options: ExportOptions): Promise<ExportResult> {
    try {
      this.ensureUnlocked();

      // 读取数据
      const bookmarks = await this.readBookmarks();
      const folders = options.scope === "all" ? await this.readFolders() : [];
      const tags = options.scope === "all" ? await this.readTags() : [];

      switch (options.format) {
        case "json-encrypted":
          return await this.exportJsonEncrypted(
            bookmarks,
            folders,
            tags,
            options.encryptionKey,
          );
        case "json-plain":
          return await this.exportJsonPlain(bookmarks, folders, tags);
        case "html":
          return await this.exportHtml(bookmarks, folders);
        default:
          throw new Error(`不支持的导出格式: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "导出失败",
      };
    }
  }

  /**
   * 导出加密 JSON (PBM 格式)
   */
  private async exportJsonEncrypted(
    bookmarks: Bookmark[],
    folders: Folder[],
    tags: Tag[],
    encryptionKey?: string,
  ): Promise<ExportResult> {
    const key = encryptionKey || this.masterKey;
    if (!key) {
      throw new Error("需要提供加密密钥");
    }

    const exportData: ImportExportData = {
      version: __APP_VERSION__,
      exportTime: Date.now(),
      bookmarks,
      folders,
      tags,
      metadata: {
        pluginVersion: __APP_VERSION__,
        totalBookmarks: bookmarks.length,
        totalFolders: folders.length,
        totalTags: tags.length,
      },
    };

    const plaintext = JSON.stringify(exportData);
    const encrypted = await EncryptionService.encrypt(plaintext, key);

    const pbmData: BackupFileData = {
      format: "pbm",
      version: __APP_VERSION__,
      encrypted: true,
      createTime: Date.now(),
      encryptedData: encrypted.ciphertext,
      salt: encrypted.salt,
      iv: encrypted.iv,
      checksum: encrypted.checksum,
    };

    const fileName = `bookmarks_backup_${this.getDateString()}.pbm`;
    const fileContent = JSON.stringify(pbmData, null, 2);

    return {
      success: true,
      fileContent,
      fileName,
      mimeType: "application/json",
    };
  }

  /**
   * 导出明文 JSON
   */
  private async exportJsonPlain(
    bookmarks: Bookmark[],
    folders: Folder[],
    tags: Tag[],
  ): Promise<ExportResult> {
    const exportData: ImportExportData = {
      version: __APP_VERSION__,
      exportTime: Date.now(),
      bookmarks,
      folders,
      tags,
      metadata: {
        pluginVersion: __APP_VERSION__,
        totalBookmarks: bookmarks.length,
        totalFolders: folders.length,
        totalTags: tags.length,
      },
    };

    const fileName = `bookmarks_${this.getDateString()}.json`;
    const fileContent = JSON.stringify(exportData, null, 2);

    return {
      success: true,
      fileContent,
      fileName,
      mimeType: "application/json",
    };
  }

  /**
   * 导出 HTML
   */
  private async exportHtml(
    bookmarks: Bookmark[],
    folders: Folder[],
  ): Promise<ExportResult> {
    const htmlContent = HtmlGenerator.generate(bookmarks, folders);
    const fileName = `bookmarks_${this.getDateString()}.html`;

    return {
      success: true,
      fileContent: htmlContent,
      fileName,
      mimeType: "text/html",
    };
  }

  /**
   * 获取日期字符串（用于文件名）
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  /**
   * 读取书签
   */
  private async readBookmarks(): Promise<Bookmark[]> {
    try {
      const encryptedData = await this.storage.read();
      if (!encryptedData) return [];

      const decrypted = await EncryptionService.decrypt(
        encryptedData,
        this.masterKey!,
      );
      const bookmarks = JSON.parse(decrypted) as Bookmark[];
      return Array.isArray(bookmarks) ? bookmarks : [];
    } catch {
      return [];
    }
  }

  /**
   * 写入书签
   */
  private async writeBookmarks(bookmarks: Bookmark[]): Promise<void> {
    const plaintext = JSON.stringify(bookmarks);
    const encrypted = await EncryptionService.encrypt(
      plaintext,
      this.masterKey!,
    );
    await this.storage.write(encrypted);
  }

  /**
   * 读取文件夹
   */
  private async readFolders(): Promise<Folder[]> {
    try {
      // 导入 ChromeStorageAdapter 的静态方法
      const { ChromeStorageAdapter } = await import("@/storage");
      const folderStorage = ChromeStorageAdapter.getFolderInstance();
      const bookmarkStorage = ChromeStorageAdapter.getInstance();

      const folderService = new FolderService(folderStorage, bookmarkStorage);
      folderService.setMasterKey(this.masterKey!);

      const result = await folderService.getFolders();
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error("读取文件夹失败:", error);
      return [];
    }
  }

  /**
   * 写入文件夹
   */
  private async writeFolders(folders: Folder[]): Promise<void> {
    try {
      // 导入 ChromeStorageAdapter 的静态方法
      const { ChromeStorageAdapter } = await import("@/storage");
      const folderStorage = ChromeStorageAdapter.getFolderInstance();
      const bookmarkStorage = ChromeStorageAdapter.getInstance();

      const folderService = new FolderService(folderStorage, bookmarkStorage);
      folderService.setMasterKey(this.masterKey!);

      // 获取现有文件夹以避免重复
      const existingResult = await folderService.getFolders();
      const existingFolders =
        existingResult.success && existingResult.data
          ? existingResult.data
          : [];
      const existingIds = new Set(existingFolders.map((f) => f.id));
      const existingNames = new Set(existingFolders.map((f) => f.name));

      // 批量创建文件夹
      for (const folder of folders) {
        // 跳过已存在的文件夹（按 ID 或名称）
        if (existingIds.has(folder.id) || existingNames.has(folder.name)) {
          continue;
        }

        // 创建文件夹
        await folderService.createFolder({
          name: folder.name,
          parentId: folder.parentId,
          sort: folder.sort,
        });
      }
    } catch (error) {
      console.error("写入文件夹失败:", error);
      throw error;
    }
  }

  /**
   * 读取标签
   */
  private async readTags(): Promise<Tag[]> {
    try {
      // 导入 ChromeStorageAdapter 的静态方法
      const { ChromeStorageAdapter } = await import("@/storage");
      const tagStorage = ChromeStorageAdapter.getTagInstance();
      const bookmarkStorage = ChromeStorageAdapter.getInstance();

      const tagService = new TagService(tagStorage, bookmarkStorage);
      tagService.setMasterKey(this.masterKey!);

      const result = await tagService.getTags();
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error("读取标签失败:", error);
      return [];
    }
  }

  /**
   * 写入标签
   */
  private async writeTags(tags: Tag[]): Promise<void> {
    try {
      // 导入 ChromeStorageAdapter 的静态方法
      const { ChromeStorageAdapter } = await import("@/storage");
      const tagStorage = ChromeStorageAdapter.getTagInstance();
      const bookmarkStorage = ChromeStorageAdapter.getInstance();

      const tagService = new TagService(tagStorage, bookmarkStorage);
      tagService.setMasterKey(this.masterKey!);

      // 获取现有标签以避免重复
      const existingResult = await tagService.getTags();
      const existingTags =
        existingResult.success && existingResult.data
          ? existingResult.data
          : [];
      const existingIds = new Set(existingTags.map((t) => t.id));
      const existingNames = new Set(
        existingTags.map((t) => t.name.toLowerCase()),
      );

      // 批量创建标签
      for (const tag of tags) {
        // 跳过已存在的标签（按 ID 或名称，不区分大小写）
        if (
          existingIds.has(tag.id) ||
          existingNames.has(tag.name.toLowerCase())
        ) {
          continue;
        }

        // 创建标签
        await tagService.addTag({
          name: tag.name,
          color: tag.color as any, // TagService 的 addTag 接受颜色名称或 hex 值
        });
      }
    } catch (error) {
      console.error("写入标签失败:", error);
      throw error;
    }
  }
}
