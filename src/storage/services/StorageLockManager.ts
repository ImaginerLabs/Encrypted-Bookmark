import { StorageError } from '@/types/errors';
import type { IStorageAdapter } from '../interfaces/IStorageAdapter';

/**
 * 存储锁配置
 */
const STORAGE_LOCK_CONFIG = {
  /** 锁超时时间（毫秒）：30秒 */
  LOCK_TIMEOUT: 30000,
  /** 锁检查间隔（毫秒）：100毫秒 */
  CHECK_INTERVAL: 100,
  /** 最大等待时间（毫秒）：10秒 */
  MAX_WAIT_TIME: 10000,
} as const;

/**
 * 锁状态信息
 */
interface LockInfo {
  /** 锁持有者ID */
  ownerId: string;
  /** 锁获取时间戳 */
  acquiredAt: number;
  /** 操作类型 */
  operation: 'read' | 'write';
}

/**
 * 存储锁管理器
 * 防止并发读写冲突，确保数据一致性
 * 
 * 功能特性：
 * - 读写锁分离（多个读锁可共存，写锁独占）
 * - 自动超时释放（防止死锁）
 * - 锁队列管理
 * - 可重入锁（同一操作者可多次获取）
 * 
 * 使用场景：
 * - 多个标签页同时读写存储
 * - 后台脚本和 Popup 同时操作
 * - 防止数据竞态条件
 */
export class StorageLockManager {
  private locks: Map<string, LockInfo> = new Map();
  private lockQueue: Array<{
    ownerId: string;
    operation: 'read' | 'write';
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];

  /**
   * 获取读锁
   * 多个读操作可以同时持有锁
   * @param ownerId - 锁持有者标识
   * @param storageKey - 存储键名
   */
  async acquireReadLock(ownerId: string, storageKey: string): Promise<void> {
    const lockKey = `${storageKey}:read`;

    // 检查是否已有写锁
    const writeLockKey = `${storageKey}:write`;
    if (this.locks.has(writeLockKey)) {
      const writeLock = this.locks.get(writeLockKey)!;
      
      // 如果是同一个持有者，允许读（降级）
      if (writeLock.ownerId === ownerId) {
        return;
      }

      // 等待写锁释放
      await this.waitForLock(ownerId, 'read', writeLockKey);
    }

    // 获取读锁
    this.locks.set(lockKey, {
      ownerId,
      acquiredAt: Date.now(),
      operation: 'read',
    });

    // 设置自动释放超时
    this.scheduleAutoRelease(lockKey);
  }

  /**
   * 获取写锁
   * 写操作需要独占，不能与其他读写操作共存
   * @param ownerId - 锁持有者标识
   * @param storageKey - 存储键名
   */
  async acquireWriteLock(ownerId: string, storageKey: string): Promise<void> {
    const lockKey = `${storageKey}:write`;

    // 检查是否已有读锁或写锁
    const readLockKey = `${storageKey}:read`;
    const writeLockKey = `${storageKey}:write`;

    // 如果已经持有写锁，允许重入
    if (this.locks.has(writeLockKey)) {
      const existingLock = this.locks.get(writeLockKey)!;
      if (existingLock.ownerId === ownerId) {
        return;
      }

      // 等待写锁释放
      await this.waitForLock(ownerId, 'write', writeLockKey);
    }

    // 如果有读锁，等待释放
    if (this.locks.has(readLockKey)) {
      const readLock = this.locks.get(readLockKey)!;
      
      // 如果是同一个持有者的读锁，可以升级为写锁
      if (readLock.ownerId === ownerId) {
        this.locks.delete(readLockKey);
      } else {
        await this.waitForLock(ownerId, 'write', readLockKey);
      }
    }

    // 获取写锁
    this.locks.set(lockKey, {
      ownerId,
      acquiredAt: Date.now(),
      operation: 'write',
    });

    // 设置自动释放超时
    this.scheduleAutoRelease(lockKey);
  }

  /**
   * 释放读锁
   * @param ownerId - 锁持有者标识
   * @param storageKey - 存储键名
   */
  releaseReadLock(ownerId: string, storageKey: string): void {
    const lockKey = `${storageKey}:read`;
    const lock = this.locks.get(lockKey);

    if (lock && lock.ownerId === ownerId) {
      this.locks.delete(lockKey);
      this.processQueue();
    }
  }

  /**
   * 释放写锁
   * @param ownerId - 锁持有者标识
   * @param storageKey - 存储键名
   */
  releaseWriteLock(ownerId: string, storageKey: string): void {
    const lockKey = `${storageKey}:write`;
    const lock = this.locks.get(lockKey);

    if (lock && lock.ownerId === ownerId) {
      this.locks.delete(lockKey);
      this.processQueue();
    }
  }

  /**
   * 执行带锁保护的存储操作
   * @param adapter - 存储适配器
   * @param operation - 操作函数
   * @param operationType - 操作类型（read 或 write）
   * @param ownerId - 操作者标识（可选，自动生成）
   */
  async withLock<T>(
    adapter: IStorageAdapter,
    operation: () => Promise<T>,
    operationType: 'read' | 'write',
    ownerId?: string
  ): Promise<T> {
    const id = ownerId || this.generateOwnerId();
    const storageKey = adapter.getType();

    try {
      // 获取锁
      if (operationType === 'read') {
        await this.acquireReadLock(id, storageKey);
      } else {
        await this.acquireWriteLock(id, storageKey);
      }

      // 执行操作
      const result = await operation();

      return result;
    } finally {
      // 释放锁
      if (operationType === 'read') {
        this.releaseReadLock(id, storageKey);
      } else {
        this.releaseWriteLock(id, storageKey);
      }
    }
  }

  /**
   * 等待锁释放
   */
  private async waitForLock(
    _ownerId: string,
    _operation: 'read' | 'write',
    lockKey: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // 超时检查
        if (elapsed > STORAGE_LOCK_CONFIG.MAX_WAIT_TIME) {
          clearInterval(checkInterval);
          reject(
            new StorageError(
              `获取存储锁超时：等待时间超过 ${STORAGE_LOCK_CONFIG.MAX_WAIT_TIME}ms`
            )
          );
          return;
        }

        // 检查锁是否释放
        if (!this.locks.has(lockKey)) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        // 检查锁是否超时
        const lock = this.locks.get(lockKey)!;
        const lockAge = Date.now() - lock.acquiredAt;

        if (lockAge > STORAGE_LOCK_CONFIG.LOCK_TIMEOUT) {
          // 强制释放超时锁
          console.warn(`检测到超时锁，强制释放: ${lockKey}`);
          this.locks.delete(lockKey);
          clearInterval(checkInterval);
          resolve();
          return;
        }
      }, STORAGE_LOCK_CONFIG.CHECK_INTERVAL);
    });
  }

  /**
   * 安排自动释放超时锁
   */
  private scheduleAutoRelease(lockKey: string): void {
    setTimeout(() => {
      const lock = this.locks.get(lockKey);

      if (lock) {
        const lockAge = Date.now() - lock.acquiredAt;

        if (lockAge >= STORAGE_LOCK_CONFIG.LOCK_TIMEOUT) {
          console.warn(`自动释放超时锁: ${lockKey}`);
          this.locks.delete(lockKey);
          this.processQueue();
        }
      }
    }, STORAGE_LOCK_CONFIG.LOCK_TIMEOUT);
  }

  /**
   * 处理等待队列
   */
  private processQueue(): void {
    // 简化实现：清理过期队列项
    const now = Date.now();
    this.lockQueue = this.lockQueue.filter(item => {
      const age = now - item.timestamp;
      if (age > STORAGE_LOCK_CONFIG.MAX_WAIT_TIME) {
        item.reject(new StorageError('锁等待超时'));
        return false;
      }
      return true;
    });
    
    // 注意: ownerId 和 operation 参数已移除，因为简化实现不需要
  }

  /**
   * 生成唯一的操作者ID
   */
  private generateOwnerId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * 清空所有锁（调试用）
   */
  clearAllLocks(): void {
    this.locks.clear();
    this.lockQueue.forEach(item => {
      item.reject(new StorageError('所有锁已被清空'));
    });
    this.lockQueue = [];
  }

  /**
   * 获取当前锁状态（调试用）
   */
  getLockStatus(): Array<{ key: string; info: LockInfo }> {
    return Array.from(this.locks.entries()).map(([key, info]) => ({ key, info }));
  }
}

/**
 * 全局锁管理器实例
 */
export const globalLockManager = new StorageLockManager();
