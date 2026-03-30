/**
 * 存储层测试示例
 * 演示如何使用存储适配器、迁移和锁管理
 */

import {
  ChromeStorageAdapter,
  FileSystemAdapter,
  StorageMigrator,
  globalLockManager,
  type IStorageAdapter,
} from '@/storage';
import type { EncryptedData } from '@/types/data';

/**
 * 示例 1: Chrome Storage 基本使用
 */
export async function exampleChromeStorage() {
  console.log('=== Chrome Storage 示例 ===');

  const storage = new ChromeStorageAdapter();

  // 检查是否可用
  const isAvailable = await storage.isAvailable();
  console.log('Storage 可用:', isAvailable);

  if (!isAvailable) {
    console.error('Chrome Storage API 不可用');
    return;
  }

  // 模拟加密数据
  const testData: EncryptedData = {
    version: 1,
    salt: btoa('test-salt-' + Date.now()),
    iv: btoa('test-iv-' + Date.now()),
    ciphertext: btoa('test-encrypted-data-' + Math.random()),
    checksum: await calculateChecksum('test-data'),
  };

  // 写入数据
  await storage.write(testData);
  console.log('数据已写入');

  // 读取数据
  const retrieved = await storage.read();
  console.log('读取数据:', retrieved);

  // 检查容量
  const capacity = await storage.getCapacity();
  console.log(`容量使用: ${capacity.used} / ${capacity.total} 字节 (${capacity.usagePercent.toFixed(2)}%)`);

  // 清空数据
  await storage.clear();
  console.log('数据已清空');

  const afterClear = await storage.read();
  console.log('清空后读取:', afterClear);
}

/**
 * 示例 2: File System Storage 使用
 */
export async function exampleFileSystemStorage() {
  console.log('=== File System Storage 示例 ===');

  const storage = new FileSystemAdapter();

  // 检查 API 是否可用
  const isAvailable = await storage.isAvailable();
  console.log('File System API 可用:', isAvailable);

  if (!isAvailable) {
    console.error('File System Access API 不可用（需要 Chrome 86+）');
    return;
  }

  try {
    // 请求用户选择目录
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    storage.setDirectoryHandle(dirHandle);
    console.log('目录已选择:', dirHandle.name);

    // 模拟加密数据
    const testData: EncryptedData = {
      version: 1,
      salt: btoa('file-salt-' + Date.now()),
      iv: btoa('file-iv-' + Date.now()),
      ciphertext: btoa('file-encrypted-data-' + Math.random()),
      checksum: await calculateChecksum('file-data'),
    };

    // 写入文件
    await storage.write(testData);
    console.log('数据已写入文件');

    // 读取文件
    const retrieved = await storage.read();
    console.log('从文件读取:', retrieved);

    // 检查文件大小
    const capacity = await storage.getCapacity();
    console.log(`文件大小: ${capacity.used} 字节`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('用户取消了目录选择');
    } else {
      console.error('错误:', error);
    }
  }
}

/**
 * 示例 3: 存储迁移
 */
export async function exampleStorageMigration() {
  console.log('=== 存储迁移示例 ===');

  // 创建源存储（Chrome Storage）
  const chromeStorage = new ChromeStorageAdapter();

  // 准备测试数据
  const testData: EncryptedData = {
    version: 1,
    salt: btoa('migration-salt'),
    iv: btoa('migration-iv'),
    ciphertext: btoa('migration-data-' + Math.random()),
    checksum: await calculateChecksum('migration-test'),
  };

  // 写入源存储
  await chromeStorage.write(testData);
  console.log('测试数据已写入 Chrome Storage');

  // 创建目标存储（File System）
  const fileStorage = new FileSystemAdapter();

  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    fileStorage.setDirectoryHandle(dirHandle);

    // 执行迁移
    const migrator = new StorageMigrator();

    const result = await migrator.migrate(
      chromeStorage,
      fileStorage,
      false, // 不清空源存储
      (progress) => {
        console.log(
          `[${progress.stage}] ${progress.message} - ${progress.percent}%`
        );
      }
    );

    if (result.success) {
      console.log('✅ 迁移成功！');
      console.log(`- 数据大小: ${result.dataSize} 字节`);
      console.log(`- 源类型: ${result.sourceType}`);
      console.log(`- 目标类型: ${result.targetType}`);
      console.log(`- 耗时: ${result.endTime - result.startTime}ms`);

      // 验证数据一致性
      const isConsistent = await migrator.verifyConsistency(
        chromeStorage,
        fileStorage
      );
      console.log('数据一致性验证:', isConsistent ? '✅ 通过' : '❌ 失败');
    } else {
      console.error('❌ 迁移失败:', result.error);
    }
  } catch (error) {
    console.error('迁移过程出错:', error);
  }
}

/**
 * 示例 4: 并发锁保护
 */
export async function exampleConcurrentLock() {
  console.log('=== 并发锁保护示例 ===');

  const storage = new ChromeStorageAdapter();

  // 初始化数据
  const initialData: EncryptedData = {
    version: 1,
    salt: btoa('lock-salt'),
    iv: btoa('lock-iv'),
    ciphertext: btoa(JSON.stringify({ counter: 0 })),
    checksum: await calculateChecksum('initial'),
  };

  await storage.write(initialData);

  // 模拟多个并发写入操作
  const promises = Array.from({ length: 5 }, (_, i) =>
    globalLockManager.withLock(
      storage,
      async () => {
        console.log(`操作 ${i + 1} 获取锁`);

        // 读取当前数据
        const data = await storage.read();

        if (!data) {
          throw new Error('数据不存在');
        }

        // 模拟数据处理
        const content = JSON.parse(atob(data.ciphertext));
        content.counter += 1;

        // 更新数据
        const updated: EncryptedData = {
          ...data,
          ciphertext: btoa(JSON.stringify(content)),
          checksum: await calculateChecksum(JSON.stringify(content)),
        };

        // 模拟耗时操作
        await sleep(100);

        await storage.write(updated);

        console.log(`操作 ${i + 1} 完成，计数器: ${content.counter}`);
      },
      'write'
    )
  );

  // 等待所有操作完成
  await Promise.all(promises);

  // 验证最终结果
  const finalData = await storage.read();

  if (finalData) {
    const finalContent = JSON.parse(atob(finalData.ciphertext));
    console.log(`最终计数器值: ${finalContent.counter}`);
    console.log(
      finalContent.counter === 5 ? '✅ 并发锁保护成功' : '❌ 数据竞态条件'
    );
  }
}

/**
 * 示例 5: 容量监控与自动降级
 */
export async function exampleCapacityMonitoring() {
  console.log('=== 容量监控示例 ===');

  const storage = new ChromeStorageAdapter();

  // 检查当前容量
  const capacity = await storage.getCapacity();

  console.log(`当前容量使用情况:`);
  console.log(`- 已使用: ${formatBytes(capacity.used)}`);
  console.log(`- 总容量: ${formatBytes(capacity.total)}`);
  console.log(`- 使用率: ${capacity.usagePercent.toFixed(2)}%`);

  // 容量预警
  if (capacity.usagePercent > 80) {
    console.warn('⚠️ 警告: 存储空间使用率超过 80%');

    if (capacity.usagePercent > 95) {
      console.error('❌ 危险: 存储空间即将耗尽，建议立即切换存储方式');

      // 提示用户切换到文件系统存储
      const shouldSwitch = confirm('存储空间不足，是否切换到本地文件存储？');

      if (shouldSwitch) {
        await switchToFileSystem(storage);
      }
    }
  } else {
    console.log('✅ 存储空间充足');
  }
}

/**
 * 示例 6: 错误处理
 */
export async function exampleErrorHandling() {
  console.log('=== 错误处理示例 ===');

  const storage = new ChromeStorageAdapter();

  try {
    // 尝试写入无效数据
    const invalidData = {
      version: 1,
      // 缺少必要字段
    } as unknown as EncryptedData;

    await storage.write(invalidData);
  } catch (error) {
    if (error instanceof Error) {
      console.error('捕获到错误:', error.message);
      console.log('✅ 错误处理正常');
    }
  }
}

/**
 * 示例 7: 数据备份与恢复
 */
export async function exampleBackupRestore() {
  console.log('=== 数据备份与恢复示例 ===');

  const storage = new ChromeStorageAdapter();
  const migrator = new StorageMigrator();

  // 准备测试数据
  const testData: EncryptedData = {
    version: 1,
    salt: btoa('backup-salt'),
    iv: btoa('backup-iv'),
    ciphertext: btoa('important-data-' + Date.now()),
    checksum: await calculateChecksum('backup-test'),
  };

  await storage.write(testData);
  console.log('原始数据已写入');

  // 创建备份
  const backup = await migrator.createBackup(storage);
  console.log('✅ 备份已创建');

  // 模拟数据损坏
  await storage.clear();
  console.log('⚠️ 数据已清空（模拟损坏）');

  // 从备份恢复
  if (backup) {
    await migrator.restoreFromBackup(storage, backup);
    console.log('✅ 数据已从备份恢复');

    // 验证恢复结果
    const restored = await storage.read();
    const isMatch =
      restored &&
      restored.ciphertext === testData.ciphertext &&
      restored.checksum === testData.checksum;

    console.log(isMatch ? '✅ 恢复成功，数据完整' : '❌ 恢复失败');
  }
}

// ============ 辅助函数 ============

/**
 * 计算简单校验和（实际应该使用加密服务）
 */
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 切换到文件系统存储
 */
async function switchToFileSystem(currentStorage: IStorageAdapter) {
  try {
    const fileStorage = new FileSystemAdapter();

    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    fileStorage.setDirectoryHandle(dirHandle);

    const migrator = new StorageMigrator();
    const result = await migrator.migrate(
      currentStorage,
      fileStorage,
      false,
      progress => {
        console.log(`${progress.message} (${progress.percent}%)`);
      }
    );

    if (result.success) {
      console.log('✅ 成功切换到文件系统存储');
      return fileStorage;
    } else {
      console.error('❌ 切换失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('切换过程出错:', error);
    return null;
  }
}

// ============ 导出测试运行器 ============

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('========================================');
  console.log('开始运行存储层测试示例');
  console.log('========================================\n');

  try {
    await exampleChromeStorage();
    console.log('\n');

    // await exampleFileSystemStorage(); // 需要用户交互
    // await exampleStorageMigration();   // 需要用户交互

    await exampleConcurrentLock();
    console.log('\n');

    await exampleCapacityMonitoring();
    console.log('\n');

    await exampleErrorHandling();
    console.log('\n');

    await exampleBackupRestore();
    console.log('\n');

    console.log('========================================');
    console.log('所有示例运行完成');
    console.log('========================================');
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}
