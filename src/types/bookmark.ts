import type { Bookmark, Folder } from "./data";

/**
 * 书签业务层类型定义
 * 扩展基础数据类型，添加业务逻辑所需的额外字段和接口
 */

/**
 * 扩展书签接口 - 添加删除标记和版本号
 */
export interface BookmarkWithDeletion extends Bookmark {
  /** 标记为待删除 */
  isDeleted?: boolean;
  /** 删除时间戳（用于撤销机制） */
  deleteTime?: number;
  /** 版本号（用于并发控制,乐观锁） */
  version?: number;
}

/**
 * 扩展文件夹接口 - 添加默认标记
 */
export interface FolderWithDefault extends Folder {
  /** 是否为默认"未分类"文件夹 */
  isDefault?: boolean;
}

/**
 * 书签查询过滤器
 */
export interface BookmarkFilter {
  /** 按文件夹ID筛选 */
  folderId?: string;
  /** 按标签ID数组筛选（AND逻辑） */
  tagIds?: string[];
  /** 搜索文本（匹配标题或URL） */
  searchText?: string;
  /** 是否包含已删除书签 */
  includeDeleted?: boolean;
  /** 筛选"稍后再读"书签 */
  isReadLater?: boolean;
  /** 分页 - 每页数量 */
  limit?: number;
  /** 分页 - 偏移量 */
  offset?: number;
  /** 排序字段 */
  sortBy?: "createTime" | "updateTime" | "title" | "visitCount";
  /** 排序方向 */
  sortOrder?: "asc" | "desc";
}

/**
 * 添加书签的输入数据
 */
export interface AddBookmarkInput {
  /** 书签标题（1-200字符） */
  title: string;
  /** 书签URL（必须是http/https） */
  url: string;
  /** 所属文件夹ID（可选，默认为"未分类"） */
  folderId?: string;
  /** 标签ID数组（可选） */
  tags?: string[];
  /** 备注信息（可选） */
  note?: string;
  /** 是否标记为"稍后再读" */
  isReadLater?: boolean;
}

/**
 * 编辑书签的输入数据
 */
export interface EditBookmarkInput {
  /** 新标题（可选） */
  title?: string;
  /** 新URL（可选） */
  url?: string;
  /** 新文件夹ID（可选） */
  folderId?: string;
  /** 新标签数组（可选） */
  tags?: string[];
  /** 新备注（可选） */
  note?: string;
}

/**
 * 创建文件夹的输入数据
 */
export interface CreateFolderInput {
  /** 文件夹名称（1-50字符） */
  name: string;
  /** 父文件夹ID（V1.0暂时为null） */
  parentId?: string | null;
  /** 排序权重（可选） */
  sort?: number;
}

/**
 * 添加标签的输入数据
 */
export interface AddTagInput {
  /** 标签名称（2-20字符） */
  name: string;
  /** 标签颜色（预设7种颜色之一） */
  color?: TagColor;
}

/**
 * 标签预设颜色枚举
 */
export type TagColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "pink";

/**
 * 标签颜色映射（HEX值）
 */
export const TAG_COLOR_MAP: Record<TagColor, string> = {
  red: "#F44336",
  blue: "#2196F3",
  green: "#4CAF50",
  yellow: "#FFEB3B",
  purple: "#9C27B0",
  orange: "#FF9800",
  pink: "#E91E63",
};

/**
 * 数据验证错误详情
 */
export interface ValidationError {
  /** 字段名称 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 实际值 */
  actualValue?: unknown;
}

/**
 * 业务操作结果（泛型）
 */
export interface Result<T> {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误消息 */
  error?: string;
  /** 验证错误详情 */
  validationErrors?: ValidationError[];
}

/**
 * 删除撤销信息
 */
export interface UndoDeleteInfo {
  /** 书签ID */
  bookmarkId: string;
  /** 删除时间戳 */
  deleteTime: number;
  /** 剩余可撤销时间（毫秒） */
  remainingTime: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 失败的项目ID列表 */
  failedIds?: string[];
  /** 错误消息列表 */
  errors?: string[];
}

/**
 * 书签统计信息
 */
export interface BookmarkStats {
  /** 书签总数（不含已删除） */
  totalBookmarks: number;
  /** 文件夹总数 */
  totalFolders: number;
  /** 标签总数 */
  totalTags: number;
  /** 待删除书签数 */
  deletedBookmarks: number;
}

/**
 * 默认常量
 */
export const DEFAULT_FOLDER_ID = "uncategorized";
export const DEFAULT_FOLDER_NAME = "未分类";
export const UNDO_TIMEOUT_MS = 5000; // 撤销超时时间：5秒
export const MAX_TITLE_LENGTH = 200;
export const MIN_TITLE_LENGTH = 1;
export const MAX_FOLDER_NAME_LENGTH = 50;
export const MIN_FOLDER_NAME_LENGTH = 1;
export const MAX_TAG_NAME_LENGTH = 20;
export const MIN_TAG_NAME_LENGTH = 2;
export const DEFAULT_PAGE_SIZE = 500;
export const MAX_TAGS_PER_BOOKMARK = 20;
