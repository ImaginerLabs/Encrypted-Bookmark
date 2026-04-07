import type { Bookmark, Folder, Tag } from './data';

/**
 * 导入导出类型定义
 * 支持 Chrome HTML、JSON、PBM 格式
 */

/**
 * 支持的导入格式
 */
export type ImportFormat = 'html' | 'json' | 'pbm';

/**
 * 支持的导出格式
 */
export type ExportFormat = 'json-encrypted' | 'json-plain' | 'html';

/**
 * 导入策略
 */
export type ImportStrategy = 'merge' | 'overwrite';

/**
 * 导出范围
 */
export type ExportScope = 'all' | 'bookmarks-only';

/**
 * 导入导出数据结构（通用 JSON 格式）
 */
export interface ImportExportData {
  /** 数据版本号 */
  version: string;
  /** 导出时间戳 */
  exportTime: number;
  /** 书签列表 */
  bookmarks: Bookmark[];
  /** 文件夹列表 */
  folders?: Folder[];
  /** 标签列表 */
  tags?: Tag[];
  /** 元数据 */
  metadata?: {
    /** 原插件版本 */
    pluginVersion?: string;
    /** 书签总数 */
    totalBookmarks?: number;
    /** 文件夹总数 */
    totalFolders?: number;
    /** 标签总数 */
    totalTags?: number;
  };
}

/**
 * 加密备份文件结构（.pbm 格式）
 */
export interface BackupFileData {
  /** 文件格式标识 */
  format: 'pbm';
  /** 版本号 */
  version: string;
  /** 加密标记 */
  encrypted: boolean;
  /** 创建时间戳 */
  createTime: number;
  /** 加密数据（Base64） */
  encryptedData?: string;
  /** 加密盐值 */
  salt?: string;
  /** 初始化向量 */
  iv?: string;
  /** SHA-256 校验和（Base64） */
  checksum?: string;
  /** 明文数据（仅调试用，生产环境应加密） */
  data?: ImportExportData;
}

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 导入格式 */
  format: ImportFormat;
  /** 导入策略 */
  strategy: ImportStrategy;
  /** 文件内容 */
  fileContent: string;
  /** 解密密钥（用于加密的 PBM 文件） */
  decryptionKey?: string;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 导出范围 */
  scope: ExportScope;
  /** 加密密钥（用于加密导出） */
  encryptionKey?: string;
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean;
  /** 导入的书签数 */
  importedBookmarks: number;
  /** 导入的文件夹数 */
  importedFolders: number;
  /** 导入的标签数 */
  importedTags: number;
  /** 跳过的书签数（去重） */
  skippedBookmarks: number;
  /** 删除的书签数（覆盖模式） */
  deletedBookmarks?: number;
  /** 错误消息 */
  error?: string;
  /** 警告信息列表 */
  warnings?: string[];
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 导出的文件内容 */
  fileContent?: string;
  /** 建议的文件名 */
  fileName?: string;
  /** 文件 MIME 类型 */
  mimeType?: string;
  /** 错误消息 */
  error?: string;
}

/**
 * 导入进度信息
 */
export interface ImportProgress {
  /** 当前处理数量 */
  current: number;
  /** 总数量 */
  total: number;
  /** 进度百分比（0-100） */
  percentage: number;
  /** 当前阶段描述 */
  stage: string;
}

/**
 * Chrome HTML 书签节点
 */
export interface ChromeBookmarkNode {
  /** 节点类型 */
  type: 'folder' | 'bookmark';
  /** 标题 */
  title: string;
  /** URL（仅书签） */
  url?: string;
  /** 添加时间戳（秒） */
  addDate?: number;
  /** 子节点（仅文件夹） */
  children?: ChromeBookmarkNode[];
}

/**
 * 格式验证错误
 */
export interface FormatValidationError {
  /** 错误类型 */
  type: 'format' | 'structure' | 'version' | 'encoding';
  /** 错误消息 */
  message: string;
  /** 错误位置（行号） */
  line?: number;
  /** 缺失字段 */
  missingField?: string;
}

/**
 * 文件格式检测结果
 */
export interface FormatDetectionResult {
  /** 检测到的格式 */
  format: ImportFormat | null;
  /** 是否有效 */
  isValid: boolean;
  /** 验证错误 */
  errors?: FormatValidationError[];
}
