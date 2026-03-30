import { StorageError, DataCorruptionError } from '@/types/errors';
import type { EncryptedData } from '@/types/data';
import type { IStorageAdapter } from '../interfaces/IStorageAdapter';

/**
 * 迁移进度回调函数
 */
export type MigrationProgressCallback = (progress: MigrationProgress) => void;

/**
 * 迁移进度信息
 */
export interface MigrationProgress {
  /** 当前阶段 */
  stage: 'reading' | 'validating' | 'writing' | 'verifying' | 'cleaning' | 'completed' | 'failed';
  /** 阶段描述 */
  message: string;
  /** 进度百分比（0-100） */
  percent: number;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  /** 是否成功 */
  success: boolean;
  /** 迁移的数据大小（字节） */
  dataSize: number;
  /** 源存储类型 */
  sourceType: 'chrome' | 'filesystem';
  /** 目标存储类型 */
  targetType: 'chrome' | 'filesystem';
  /** 开始时间戳 */
  startTime: number;
  /** 结束时间戳 */
  endTime: number;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 存储迁移服务
 * 负责在不同存储方式之间迁移数据
 * 
 * 核心功能：
 * - 完整性校验（checksum）
 * - 回滚机制（迁移失败自动恢复）
 * - 进度反馈
 * - 原子性操作（确保数据一致性）
 * 
 * 迁移流程：
 * 1. 读取源存储数据
 * 2. 验证数据完整性（checksum）
 * 3. 备份源数据（用于回滚）
 * 4. 写入目标存储
 * 5. 验证目标存储数据
 * 6. 清理源存储（可选）
 */
export class StorageMigrator {
  /**
   * 执行存储迁移
   * @param source - 源存储适配器
   * @param target - 目标存储适配器
   * @param clearSource - 是否清空源存储（默认为 false，保留源数据作为备份）
   * @param onProgress - 进度回调函数
   * @returns 迁移结果
   */
  async migrate(
    source: IStorageAdapter,
    target: IStorageAdapter,
    clearSource = false,
    onProgress?: MigrationProgressCallback
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    let sourceData: EncryptedData | null = null;

    try {
      // 阶段 1: 读取源数据
      this.reportProgress(onProgress, {
        stage: 'reading',
        message: '正在读取源存储数据...',
        percent: 10,
      });

      sourceData = await source.read();

      if (!sourceData) {
        throw new StorageError('源存储中没有数据可迁移');
      }

      // 阶段 2: 验证源数据完整性
      this.reportProgress(onProgress, {
        stage: 'validating',
        message: '正在验证数据完整性...',
        percent: 30,
      });

      await this.validateDataIntegrity(sourceData);

      // 阶段 3: 写入目标存储
      this.reportProgress(onProgress, {
        stage: 'writing',
        message: '正在写入目标存储...',
        percent: 50,
      });

      await target.write(sourceData);

      // 阶段 4: 验证目标存储数据
      this.reportProgress(onProgress, {
        stage: 'verifying',
        message: '正在验证迁移数据...',
        percent: 70,
      });

      const targetData = await target.read();

      if (!targetData) {
        throw new StorageError('目标存储数据读取失败');
      }

      // 验证数据一致性
      if (!this.compareEncryptedData(sourceData, targetData)) {
        throw new DataCorruptionError('迁移后数据校验失败，源数据和目标数据不一致');
      }

      // 阶段 5: 清理源存储（可选）
      if (clearSource) {
        this.reportProgress(onProgress, {
          stage: 'cleaning',
          message: '正在清理源存储...',
          percent: 90,
        });

        await source.clear();
      }

      // 完成
      this.reportProgress(onProgress, {
        stage: 'completed',
        message: '迁移完成',
        percent: 100,
      });

      const dataSize = this.estimateDataSize(sourceData);

      return {
        success: true,
        dataSize,
        sourceType: source.getType(),
        targetType: target.getType(),
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      // 迁移失败，报告错误
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      this.reportProgress(onProgress, {
        stage: 'failed',
        message: `迁移失败：${errorMessage}`,
        percent: 0,
      });

      // 尝试回滚：清空目标存储
      try {
        await target.clear();
      } catch (rollbackError) {
        console.error('回滚失败:', rollbackError);
      }

      return {
        success: false,
        dataSize: sourceData ? this.estimateDataSize(sourceData) : 0,
        sourceType: source.getType(),
        targetType: target.getType(),
        startTime,
        endTime: Date.now(),
        error: errorMessage,
      };
    }
  }

  /**
   * 验证两个存储是否包含相同的数据
   * @param adapter1 - 存储适配器1
   * @param adapter2 - 存储适配器2
   * @returns 数据相同返回 true
   */
  async verifyConsistency(
    adapter1: IStorageAdapter,
    adapter2: IStorageAdapter
  ): Promise<boolean> {
    try {
      const data1 = await adapter1.read();
      const data2 = await adapter2.read();

      // 都为空，认为一致
      if (!data1 && !data2) {
        return true;
      }

      // 一个为空，一个不为空，不一致
      if (!data1 || !data2) {
        return false;
      }

      // 比较数据内容
      return this.compareEncryptedData(data1, data2);
    } catch {
      return false;
    }
  }

  /**
   * 创建数据备份
   * @param source - 源存储适配器
   * @returns 备份的数据，如果没有数据返回 null
   */
  async createBackup(source: IStorageAdapter): Promise<EncryptedData | null> {
    try {
      const data = await source.read();

      if (!data) {
        return null;
      }

      // 验证数据完整性
      await this.validateDataIntegrity(data);

      // 深拷贝返回
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      throw new StorageError('创建备份失败', { originalError: error });
    }
  }

  /**
   * 从备份恢复数据
   * @param target - 目标存储适配器
   * @param backup - 备份数据
   */
  async restoreFromBackup(
    target: IStorageAdapter,
    backup: EncryptedData
  ): Promise<void> {
    try {
      // 验证备份数据
      await this.validateDataIntegrity(backup);

      // 写入目标存储
      await target.write(backup);

      // 验证恢复结果
      const restoredData = await target.read();

      if (!restoredData || !this.compareEncryptedData(backup, restoredData)) {
        throw new DataCorruptionError('恢复后数据校验失败');
      }
    } catch (error) {
      throw new StorageError('从备份恢复失败', { originalError: error });
    }
  }

  /**
   * 验证数据完整性
   * 通过 checksum 校验数据是否损坏
   */
  private async validateDataIntegrity(data: EncryptedData): Promise<void> {
    try {
      // 计算数据的实际校验和
      const actualChecksum = await this.calculateChecksum(data);

      // 与存储的校验和比对
      if (actualChecksum !== data.checksum) {
        throw new DataCorruptionError('数据校验和不匹配，数据可能已损坏', {
          expected: data.checksum,
          actual: actualChecksum,
        });
      }
    } catch (error) {
      if (error instanceof DataCorruptionError) {
        throw error;
      }
      throw new DataCorruptionError('数据完整性验证失败', { originalError: error });
    }
  }

  /**
   * 计算加密数据的校验和
   * 基于 ciphertext、salt、iv 计算 SHA-256 哈希
   */
  private async calculateChecksum(data: EncryptedData): Promise<string> {
    const content = `${data.ciphertext}${data.salt}${data.iv}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 比较两个加密数据对象是否相同
   */
  private compareEncryptedData(data1: EncryptedData, data2: EncryptedData): boolean {
    return (
      data1.version === data2.version &&
      data1.salt === data2.salt &&
      data1.iv === data2.iv &&
      data1.ciphertext === data2.ciphertext &&
      data1.checksum === data2.checksum
    );
  }

  /**
   * 估算数据大小（字节）
   */
  private estimateDataSize(data: EncryptedData): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      return JSON.stringify(data).length * 3;
    }
  }

  /**
   * 报告迁移进度
   */
  private reportProgress(
    callback: MigrationProgressCallback | undefined,
    progress: MigrationProgress
  ): void {
    if (callback) {
      try {
        callback(progress);
      } catch (error) {
        console.error('进度回调函数执行失败:', error);
      }
    }
  }
}
