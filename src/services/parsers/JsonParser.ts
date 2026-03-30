import type { ImportExportData, BackupFileData } from '@/types/import-export';

/**
 * JSON 格式解析器
 * 支持标准 JSON 和加密 PBM 格式
 */
export class JsonParser {
  /**
   * 解析标准 JSON 格式
   * @param jsonString JSON 字符串
   * @returns 解析后的数据
   */
  static parseJson(jsonString: string): ImportExportData {
    try {
      const data = JSON.parse(jsonString) as ImportExportData;
      
      // 验证必填字段
      if (!data.version) {
        throw new Error('缺少必填字段: version');
      }
      if (!Array.isArray(data.bookmarks)) {
        throw new Error('缺少必填字段: bookmarks 或格式错误');
      }

      // 验证每个书签的必填字段
      data.bookmarks.forEach((bookmark, index) => {
        if (!bookmark.id) {
          throw new Error(`第 ${index + 1} 条书签缺少 id 字段`);
        }
        if (!bookmark.title) {
          throw new Error(`第 ${index + 1} 条书签缺少 title 字段`);
        }
        if (!bookmark.url) {
          throw new Error(`第 ${index + 1} 条书签缺少 url 字段`);
        }
        
        // 验证 URL 格式
        if (!this.isValidUrl(bookmark.url)) {
          throw new Error(`第 ${index + 1} 条书签的 URL 格式无效: ${bookmark.url}`);
        }
      });

      // 验证文件夹（可选）
      if (data.folders && !Array.isArray(data.folders)) {
        throw new Error('folders 字段格式错误，应为数组');
      }

      // 验证标签（可选）
      if (data.tags && !Array.isArray(data.tags)) {
        throw new Error('tags 字段格式错误，应为数组');
      }

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        // 尝试提取错误行号
        const match = error.message.match(/position (\d+)/);
        const position = match ? parseInt(match[1]) : null;
        const line = position ? this.getLineNumber(jsonString, position) : null;
        
        throw new Error(
          `JSON 格式错误${line ? `（第 ${line} 行）` : ''}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 解析 PBM 备份文件格式
   * @param jsonString JSON 字符串
   * @returns PBM 文件数据
   */
  static parsePbm(jsonString: string): BackupFileData {
    try {
      const data = JSON.parse(jsonString) as BackupFileData;
      
      // 验证 PBM 格式标识
      if (data.format !== 'pbm') {
        throw new Error('不是有效的 PBM 备份文件格式');
      }

      if (!data.version) {
        throw new Error('缺少版本号字段');
      }

      // 如果是加密的，验证加密字段
      if (data.encrypted) {
        if (!data.encryptedData) {
          throw new Error('加密文件缺少 encryptedData 字段');
        }
        if (!data.salt || !data.iv) {
          throw new Error('加密文件缺少必要的加密参数（salt/iv）');
        }
      }
      // 如果是明文的，验证数据字段
      else {
        if (!data.data) {
          throw new Error('备份文件缺少 data 字段');
        }
        // 验证内嵌的数据结构
        this.validateImportExportData(data.data);
      }

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`PBM 文件格式错误: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 验证 ImportExportData 结构
   */
  private static validateImportExportData(data: ImportExportData): void {
    if (!data.version) {
      throw new Error('数据缺少 version 字段');
    }
    if (!Array.isArray(data.bookmarks)) {
      throw new Error('数据缺少 bookmarks 字段或格式错误');
    }
    
    data.bookmarks.forEach((bookmark, index) => {
      if (!bookmark.id || !bookmark.title || !bookmark.url) {
        throw new Error(`第 ${index + 1} 条书签数据不完整`);
      }
    });
  }

  /**
   * 验证 URL 格式
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 获取字符位置对应的行号
   */
  private static getLineNumber(text: string, position: number): number {
    const lines = text.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * 验证 JSON 格式
   */
  static validate(jsonString: string): { isValid: boolean; error?: string } {
    try {
      JSON.parse(jsonString);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 检测 JSON 类型（标准 JSON 还是 PBM）
   */
  static detectJsonType(jsonString: string): 'json' | 'pbm' | 'unknown' {
    try {
      const data = JSON.parse(jsonString);
      
      // 检查是否是 PBM 格式
      if (data.format === 'pbm') {
        return 'pbm';
      }
      
      // 检查是否是标准 ImportExportData 格式
      if (data.version && Array.isArray(data.bookmarks)) {
        return 'json';
      }
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 版本兼容性检查
   */
  static checkVersionCompatibility(
    dataVersion: string,
    currentVersion: string = '1.0.0'
  ): { compatible: boolean; warning?: string } {
    const parseVersion = (v: string) => {
      const parts = v.split('.').map(Number);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const data = parseVersion(dataVersion);
    const current = parseVersion(currentVersion);

    // 主版本不同时不兼容
    if (data.major !== current.major) {
      return {
        compatible: false,
        warning: `数据版本 ${dataVersion} 与当前插件版本 ${currentVersion} 不兼容，可能无法正常导入`
      };
    }

    // 次版本号较高时给出警告
    if (data.minor > current.minor) {
      return {
        compatible: true,
        warning: `数据版本 ${dataVersion} 高于当前插件版本 ${currentVersion}，部分新功能可能丢失`
      };
    }

    return { compatible: true };
  }

  /**
   * 数据清理：移除无效书签
   */
  static sanitizeData(data: ImportExportData): ImportExportData {
    // 过滤无效书签
    const validBookmarks = data.bookmarks.filter(bookmark => {
      return (
        bookmark.id &&
        bookmark.title &&
        bookmark.url &&
        this.isValidUrl(bookmark.url)
      );
    });

    // 过滤无效文件夹
    const validFolders = data.folders?.filter(folder => {
      return folder.id && folder.name;
    }) || [];

    // 过滤无效标签
    const validTags = data.tags?.filter(tag => {
      return tag.id && tag.name;
    }) || [];

    return {
      ...data,
      bookmarks: validBookmarks,
      folders: validFolders.length > 0 ? validFolders : undefined,
      tags: validTags.length > 0 ? validTags : undefined
    };
  }
}
