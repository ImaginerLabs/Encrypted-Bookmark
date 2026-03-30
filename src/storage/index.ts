/**
 * 存储层模块导出
 * 统一导出存储相关的接口、适配器和服务
 */

// 接口
export type { IStorageAdapter, StorageCapacityInfo } from './interfaces/IStorageAdapter';

// 适配器
export { ChromeStorageAdapter } from './adapters/ChromeStorageAdapter';
export { FileSystemAdapter } from './adapters/FileSystemAdapter';

// 服务
export {
  StorageMigrator,
  type MigrationProgressCallback,
  type MigrationProgress,
  type MigrationResult,
} from './services/StorageMigrator';

export {
  StorageLockManager,
  globalLockManager,
} from './services/StorageLockManager';
