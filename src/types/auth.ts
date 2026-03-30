/**
 * 密码强度级别
 */
export enum PasswordStrength {
  /** 弱密码 */
  WEAK = 'weak',
  /** 中等强度 */
  MEDIUM = 'medium',
  /** 强密码 */
  STRONG = 'strong'
}

/**
 * 密码强度评估结果
 */
export interface PasswordStrengthResult {
  /** 强度等级 */
  strength: PasswordStrength;
  /** 分数 (0-100) */
  score: number;
  /** 提示信息 */
  feedback: string[];
}

/**
 * 存储的密码数据结构 (PBKDF2)
 */
export interface StoredPassword {
  /** PBKDF2 密码哈希 (hex) */
  passwordHash: string;
  /** 随机盐值 (hex) */
  salt: string;
  /** PBKDF2 迭代次数 */
  iterations: number;
  /** 算法标识 */
  algorithm: 'PBKDF2';
  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 锁定设置
 */
export interface LockSettings {
  /** 自动锁定时间(分钟), 0 表示永不锁定 */
  autoLockMinutes: number;
  /** 浏览器关闭时是否锁定 */
  lockOnBrowserClose: boolean;
  /** 锁定前提醒时间(秒), 例如 [300, 60, 30] 表示 5分钟、1分钟、30秒前提醒 */
  reminderSeconds: number[];
}

/**
 * 会话状态
 */
export interface SessionState {
  /** 是否已锁定 */
  isLocked: boolean;
  /** 最后活动时间戳 */
  lastActivityTime: number;
  /** 解锁时间戳 */
  unlockedAt: number | null;
}

/**
 * 密码验证失败记录 (用于防爆破)
 */
export interface FailedAttemptRecord {
  /** 失败次数 */
  count: number;
  /** 锁定到期时间戳 (0 表示未锁定) */
  lockedUntil: number;
  /** 首次失败时间戳 */
  firstFailedAt: number;
}

/**
 * 认证操作结果
 */
export interface AuthResult<T = void> {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 解锁验证结果
 */
export interface UnlockResult {
  /** 是否成功 */
  success: boolean;
  /** 剩余尝试次数 */
  remainingAttempts?: number;
  /** 锁定到期时间戳 */
  lockedUntil?: number;
  /** 错误信息 */
  error?: string;
}
