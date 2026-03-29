/**
 * 自定义错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 加密相关错误
 */
export class EncryptionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

/**
 * 密码相关错误
 */
export class PasswordError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'PASSWORD_ERROR', details);
    this.name = 'PasswordError';
    Object.setPrototypeOf(this, PasswordError.prototype);
  }
}

/**
 * 密码强度不足错误
 */
export class WeakPasswordError extends PasswordError {
  constructor(message: string = '密码强度不足：需要 8-32 个字符') {
    super(message);
    this.name = 'WeakPasswordError';
    this.code = 'WEAK_PASSWORD';
    Object.setPrototypeOf(this, WeakPasswordError.prototype);
  }
}

/**
 * 密码验证失败错误
 */
export class InvalidPasswordError extends PasswordError {
  constructor(
    message: string = '密码错误',
    public remainingAttempts: number
  ) {
    super(message, { remainingAttempts });
    this.name = 'InvalidPasswordError';
    this.code = 'INVALID_PASSWORD';
    Object.setPrototypeOf(this, InvalidPasswordError.prototype);
  }
}

/**
 * 账户锁定错误
 */
export class AccountLockedError extends PasswordError {
  constructor(
    message: string,
    public lockedUntil: number
  ) {
    super(message, { lockedUntil });
    this.name = 'AccountLockedError';
    this.code = 'ACCOUNT_LOCKED';
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

/**
 * 数据损坏错误
 */
export class DataCorruptionError extends AppError {
  constructor(message: string = '数据校验失败，可能已损坏', details?: unknown) {
    super(message, 'DATA_CORRUPTION', details);
    this.name = 'DataCorruptionError';
    Object.setPrototypeOf(this, DataCorruptionError.prototype);
  }
}

/**
 * 存储错误
 */
export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
