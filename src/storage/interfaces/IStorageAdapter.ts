import type { EncryptedData } from '@/types/data';

/**
 * 存储容量信息
 */
export interface StorageCapacityInfo {
  /** 已使用空间（字节） */
  used: number;
  /** 总容量（字节，-1表示无限制） */
  total: number;
  /** 使用百分比（0-100） */
  usagePercent: number;
}

/**
 * 存储适配器统一接口
 * 定义了存储层的核心能力,支持多种存储方式实现
 */
export interface IStorageAdapter {
  /**
   * 读取加密数据
   * @returns 加密的数据对象,如果不存在返回 null
   * @throws {StorageError} 读取失败时抛出
   */
  read(): Promise<EncryptedData | null>;

  /**
   * 写入加密数据
   * @param data - 要存储的加密数据
   * @throws {StorageError} 写入失败、容量不足等情况抛出
   */
  write(data: EncryptedData): Promise<void>;

  /**
   * 清空存储数据
   * @throws {StorageError} 清空失败时抛出
   */
  clear(): Promise<void>;

  /**
   * 获取存储容量信息
   * @returns 容量使用情况
   */
  getCapacity(): Promise<StorageCapacityInfo>;

  /**
   * 检查存储是否可用
   * @returns 可用返回 true,不可用返回 false
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取存储适配器类型
   */
  getType(): 'chrome' | 'filesystem';
}
