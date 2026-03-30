/**
 * 设置相关类型定义
 */

/**
 * 存储方式类型
 */
export type StorageType = 'chrome' | 'filesystem';

/**
 * 存储设置
 */
export interface StorageSettings {
  /** 存储方式 */
  type: StorageType;
  /** 本地文件路径（当type为filesystem时使用） */
  localPath?: string;
  /** 目录句柄的序列化ID（用于恢复权限） */
  directoryHandleId?: string;
}

/**
 * 安全设置
 */
export interface SecuritySettings {
  /** 自动锁定时间（分钟），0表示永不锁定 */
  autoLockMinutes: number;
  /** 浏览器关闭时是否锁定 */
  lockOnBrowserClose: boolean;
  /** 密码提示（可选） */
  passwordHint?: string;
}

/**
 * 基本设置
 */
export interface BasicSettings {
  /** 默认文件夹ID */
  defaultFolderId: string;
  /** 新标签页打开方式 */
  openInNewTab: boolean;
  /** 主题模式 */
  theme: 'light' | 'dark' | 'auto';
}

/**
 * 完整的应用设置
 */
export interface AppSettings {
  storage: StorageSettings;
  security: SecuritySettings;
  basic: BasicSettings;
}

/**
 * 路径验证结果
 */
export interface PathValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  error?: string;
  /** 路径信息 */
  info?: {
    /** 可读 */
    readable: boolean;
    /** 可写 */
    writable: boolean;
    /** 路径 */
    path: string;
  };
}

/**
 * 测试连接结果
 */
export interface TestConnectionResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 响应时间（毫秒） */
  responseTime?: number;
  /** 存储容量信息 */
  capacity?: {
    used: number;
    total: number;
    usagePercent: number;
  };
}

/**
 * 密码修改请求
 */
export interface ChangePasswordRequest {
  /** 旧密码 */
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
  /** 确认新密码 */
  confirmPassword: string;
}

/**
 * 密码强度
 */
export enum PasswordStrengthLevel {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

/**
 * 密码强度评估结果
 */
export interface PasswordStrengthInfo {
  /** 强度等级 */
  level: PasswordStrengthLevel;
  /** 分数 (0-100) */
  score: number;
  /** 提示信息 */
  feedback: string[];
}
