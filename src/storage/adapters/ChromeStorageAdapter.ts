import { StorageError } from '@/types/errors';
import type { EncryptedData } from '@/types/data';
import type { IStorageAdapter, StorageCapacityInfo } from '../interfaces/IStorageAdapter';

/**
 * Chrome Storage 存储键名
 */
const STORAGE_KEY = 'encrypted_bookmarks_data';

/**
 * Chrome Storage 容量限制配置
 */
const CHROME_STORAGE_LIMITS = {
  /** 总容量限制（字节）：10MB */
  MAX_BYTES: 10 * 1024 * 1024,
  /** 容量警告阈值（80%） */
  WARNING_THRESHOLD: 0.8,
  /** 容量危险阈值（95%） */
  DANGER_THRESHOLD: 0.95,
} as const;

/**
 * Chrome Storage 适配器
 * 基于 chrome.storage.local API 实现本地存储
 * 
 * 功能特性：
 * - 10MB 容量限制监控
 * - 自动容量检测
 * - 写入前空间校验
 * - 完整的错误处理
 */
export class ChromeStorageAdapter implements IStorageAdapter {
  /**
   * 读取加密数据
   */
  async read(): Promise<EncryptedData | null> {
    try {
      // 检查 Chrome Storage API 是否可用
      if (!chrome?.storage?.local) {
        throw new StorageError('Chrome Storage API 不可用');
      }

      const result = await chrome.storage.local.get(STORAGE_KEY);
      const data = result[STORAGE_KEY];

      if (!data) {
        return null;
      }

      // 验证数据结构完整性
      this.validateEncryptedData(data);

      return data as EncryptedData;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('读取存储数据失败', { originalError: error });
    }
  }

  /**
   * 写入加密数据
   */
  async write(data: EncryptedData): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        throw new StorageError('Chrome Storage API 不可用');
      }

      // 验证输入数据
      this.validateEncryptedData(data);

      // 估算数据大小
      const dataSize = this.estimateDataSize(data);

      // 检查容量是否足够
      const capacity = await this.getCapacity();
      const availableSpace = CHROME_STORAGE_LIMITS.MAX_BYTES - capacity.used;

      if (dataSize > availableSpace) {
        throw new StorageError(
          `存储空间不足：需要 ${this.formatBytes(dataSize)}，可用 ${this.formatBytes(availableSpace)}`,
          {
            required: dataSize,
            available: availableSpace,
            total: CHROME_STORAGE_LIMITS.MAX_BYTES,
          }
        );
      }

      // 容量预警检查
      const futureUsagePercent = ((capacity.used + dataSize) / CHROME_STORAGE_LIMITS.MAX_BYTES) * 100;
      
      if (futureUsagePercent >= CHROME_STORAGE_LIMITS.DANGER_THRESHOLD * 100) {
        console.warn(
          `⚠️ 存储容量即将耗尽：使用率将达到 ${futureUsagePercent.toFixed(1)}%`
        );
      } else if (futureUsagePercent >= CHROME_STORAGE_LIMITS.WARNING_THRESHOLD * 100) {
        console.info(
          `ℹ️ 存储容量警告：使用率将达到 ${futureUsagePercent.toFixed(1)}%`
        );
      }

      // 执行写入
      await chrome.storage.local.set({ [STORAGE_KEY]: data });

    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('写入存储数据失败', { originalError: error });
    }
  }

  /**
   * 清空存储数据
   */
  async clear(): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        throw new StorageError('Chrome Storage API 不可用');
      }

      await chrome.storage.local.remove(STORAGE_KEY);
    } catch (error) {
      throw new StorageError('清空存储数据失败', { originalError: error });
    }
  }

  /**
   * 获取存储容量信息
   */
  async getCapacity(): Promise<StorageCapacityInfo> {
    try {
      if (!chrome?.storage?.local) {
        throw new StorageError('Chrome Storage API 不可用');
      }

      // 获取当前使用量（字节）
      const bytesInUse = await chrome.storage.local.getBytesInUse(STORAGE_KEY);

      const usagePercent = (bytesInUse / CHROME_STORAGE_LIMITS.MAX_BYTES) * 100;

      return {
        used: bytesInUse,
        total: CHROME_STORAGE_LIMITS.MAX_BYTES,
        usagePercent: Math.min(usagePercent, 100), // 防止超过100%
      };
    } catch (error) {
      throw new StorageError('获取存储容量失败', { originalError: error });
    }
  }

  /**
   * 检查存储是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查 Chrome Storage API
      if (!chrome?.storage?.local) {
        return false;
      }

      // 尝试读写测试
      const testKey = '__storage_test__';
      const testValue = { timestamp: Date.now() };

      await chrome.storage.local.set({ [testKey]: testValue });
      const result = await chrome.storage.local.get(testKey);
      await chrome.storage.local.remove(testKey);

      return result[testKey]?.timestamp === testValue.timestamp;
    } catch {
      return false;
    }
  }

  /**
   * 获取存储适配器类型
   */
  getType(): 'chrome' {
    return 'chrome';
  }

  /**
   * 验证加密数据结构完整性
   */
  private validateEncryptedData(data: unknown): asserts data is EncryptedData {
    if (!data || typeof data !== 'object') {
      throw new StorageError('无效的数据格式：数据必须是对象');
    }

    const encData = data as Partial<EncryptedData>;

    if (typeof encData.version !== 'number') {
      throw new StorageError('无效的数据格式：缺少版本号');
    }

    if (typeof encData.salt !== 'string' || !encData.salt) {
      throw new StorageError('无效的数据格式：缺少盐值');
    }

    if (typeof encData.iv !== 'string' || !encData.iv) {
      throw new StorageError('无效的数据格式：缺少初始化向量');
    }

    if (typeof encData.ciphertext !== 'string' || !encData.ciphertext) {
      throw new StorageError('无效的数据格式：缺少密文数据');
    }

    if (typeof encData.checksum !== 'string' || !encData.checksum) {
      throw new StorageError('无效的数据格式：缺少校验和');
    }
  }

  /**
   * 估算数据大小（字节）
   * 使用 JSON 序列化长度估算实际存储空间
   */
  private estimateDataSize(data: EncryptedData): number {
    try {
      const jsonString = JSON.stringify(data);
      // 使用 Blob 精确计算 UTF-8 编码后的字节数
      return new Blob([jsonString]).size;
    } catch {
      // 降级估算：每个字符按 3 字节计算（保守估计）
      return JSON.stringify(data).length * 3;
    }
  }

  /**
   * 格式化字节大小为可读字符串
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
