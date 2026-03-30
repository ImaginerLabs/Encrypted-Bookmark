# 存储层使用指南

## 📚 目录
- [概述](#概述)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 概述

存储层抽象提供了统一的存储接口，支持两种存储方式：
1. **Chrome Storage**：基于 `chrome.storage.local` API，10MB 容量限制
2. **File System**：基于 File System Access API，无容量限制

### 核心功能
- ✅ 统一存储接口
- ✅ 容量监控与预警
- ✅ 数据完整性校验
- ✅ 无缝存储迁移
- ✅ 并发锁保护
- ✅ 自动回滚机制

---

## 快速开始

### 1. Chrome Storage 使用

```typescript
import { ChromeStorageAdapter } from '@/storage';
import type { EncryptedData } from '@/types/data';

// 创建适配器实例
const storage = new ChromeStorageAdapter();

// 写入数据
const data: EncryptedData = {
  version: 1,
  salt: 'base64-salt',
  iv: 'base64-iv',
  ciphertext: 'base64-encrypted-data',
  checksum: 'sha256-checksum',
};

await storage.write(data);

// 读取数据
const storedData = await storage.read();
console.log(storedData);

// 检查容量
const capacity = await storage.getCapacity();
console.log(`已使用: ${capacity.used} 字节 (${capacity.usagePercent.toFixed(1)}%)`);

// 清空数据
await storage.clear();
```

### 2. File System 使用

```typescript
import { FileSystemAdapter } from '@/storage';

// 创建适配器实例
const storage = new FileSystemAdapter();

// 用户选择存储目录
const dirHandle = await window.showDirectoryPicker();
storage.setDirectoryHandle(dirHandle);

// 写入数据
await storage.write(data);

// 读取数据
const storedData = await storage.read();

// 检查容量（文件大小）
const capacity = await storage.getCapacity();
console.log(`文件大小: ${capacity.used} 字节`);
```

### 3. 存储迁移

```typescript
import { StorageMigrator } from '@/storage';

const migrator = new StorageMigrator();

// 从 Chrome Storage 迁移到 File System
const result = await migrator.migrate(
  chromeStorage,
  fileSystemStorage,
  false, // 不清空源存储（保留备份）
  (progress) => {
    console.log(`${progress.stage}: ${progress.message} (${progress.percent}%)`);
  }
);

if (result.success) {
  console.log('迁移成功！');
} else {
  console.error('迁移失败:', result.error);
}
```

### 4. 并发锁保护

```typescript
import { globalLockManager } from '@/storage';

// 自动锁保护的读操作
const data = await globalLockManager.withLock(
  storage,
  async () => await storage.read(),
  'read'
);

// 自动锁保护的写操作
await globalLockManager.withLock(
  storage,
  async () => await storage.write(newData),
  'write'
);
```

---

## API 文档

### IStorageAdapter 接口

所有存储适配器的统一接口。

#### `read(): Promise<EncryptedData | null>`
读取加密数据。

**返回值**
- `EncryptedData`: 加密的数据对象
- `null`: 存储中没有数据

**异常**
- `StorageError`: 读取失败

#### `write(data: EncryptedData): Promise<void>`
写入加密数据。

**参数**
- `data`: 要存储的加密数据

**异常**
- `StorageError`: 写入失败或容量不足

#### `clear(): Promise<void>`
清空存储数据。

**异常**
- `StorageError`: 清空失败

#### `getCapacity(): Promise<StorageCapacityInfo>`
获取存储容量信息。

**返回值**
```typescript
{
  used: number;      // 已使用空间（字节）
  total: number;     // 总容量（-1表示无限制）
  usagePercent: number; // 使用百分比（0-100）
}
```

#### `isAvailable(): Promise<boolean>`
检查存储是否可用。

**返回值**
- `true`: 存储可用
- `false`: 存储不可用

#### `getType(): 'chrome' | 'filesystem'`
获取存储适配器类型。

---

### ChromeStorageAdapter

基于 Chrome Storage API 的存储实现。

**容量限制**
- 最大容量：10MB
- 警告阈值：80%（8MB）
- 危险阈值：95%（9.5MB）

**特性**
- 自动容量监控
- 写入前空间校验
- 容量预警日志

**示例**
```typescript
const storage = new ChromeStorageAdapter();

// 检查容量并写入
const capacity = await storage.getCapacity();

if (capacity.usagePercent > 90) {
  console.warn('存储空间即将耗尽，建议切换到文件系统存储');
}

await storage.write(data);
```

---

### FileSystemAdapter

基于 File System Access API 的存储实现。

**文件名**
- `bookmarks_encrypted.dat`

**特性**
- 无容量限制
- 需要用户授权目录访问
- 自动权限检测
- 支持手动选择目录

**示例**
```typescript
const storage = new FileSystemAdapter();

// 检查 API 可用性
const isAvailable = await storage.isAvailable();

if (!isAvailable) {
  console.error('浏览器不支持 File System Access API');
  // 降级到 Chrome Storage
}

// 设置存储目录
const dirHandle = await window.showDirectoryPicker();
storage.setDirectoryHandle(dirHandle);

// 写入数据
await storage.write(data);
```

---

### StorageMigrator

存储迁移服务。

#### `migrate(source, target, clearSource, onProgress): Promise<MigrationResult>`
执行存储迁移。

**参数**
- `source`: 源存储适配器
- `target`: 目标存储适配器
- `clearSource`: 是否清空源存储（默认 `false`）
- `onProgress`: 进度回调函数（可选）

**返回值**
```typescript
{
  success: boolean;       // 是否成功
  dataSize: number;       // 数据大小（字节）
  sourceType: 'chrome' | 'filesystem';
  targetType: 'chrome' | 'filesystem';
  startTime: number;      // 开始时间戳
  endTime: number;        // 结束时间戳
  error?: string;         // 错误信息（失败时）
}
```

**迁移流程**
1. 读取源存储数据
2. 验证数据完整性（checksum）
3. 备份源数据
4. 写入目标存储
5. 验证目标数据
6. 清理源存储（可选）

**示例**
```typescript
const migrator = new StorageMigrator();

const result = await migrator.migrate(
  chromeStorage,
  fileSystemStorage,
  false,
  (progress) => {
    // 更新 UI 进度条
    updateProgressBar(progress.percent, progress.message);
  }
);

if (!result.success) {
  alert(`迁移失败：${result.error}`);
}
```

---

### StorageLockManager

并发锁管理器，防止数据竞态条件。

#### `withLock(adapter, operation, operationType, ownerId): Promise<T>`
执行带锁保护的操作。

**参数**
- `adapter`: 存储适配器
- `operation`: 操作函数
- `operationType`: `'read'` 或 `'write'`
- `ownerId`: 操作者标识（可选）

**特性**
- 读写锁分离（多个读锁可共存）
- 自动超时释放（30秒）
- 可重入锁
- 死锁检测

**示例**
```typescript
import { globalLockManager } from '@/storage';

// 带锁的读操作
const data = await globalLockManager.withLock(
  storage,
  async () => {
    const result = await storage.read();
    // 可以在这里做其他处理
    return result;
  },
  'read'
);

// 带锁的写操作
await globalLockManager.withLock(
  storage,
  async () => {
    const current = await storage.read();
    const updated = { ...current, ...changes };
    await storage.write(updated);
  },
  'write'
);
```

---

## 使用示例

### 示例 1：容量监控与自动降级

```typescript
async function saveBookmarks(data: EncryptedData) {
  const chromeStorage = new ChromeStorageAdapter();
  
  // 检查容量
  const capacity = await chromeStorage.getCapacity();
  
  if (capacity.usagePercent > 95) {
    // 容量不足，提示用户切换存储方式
    const userConfirmed = confirm(
      'Chrome 存储空间已满，是否切换到本地文件存储？'
    );
    
    if (userConfirmed) {
      const fileStorage = new FileSystemAdapter();
      const dirHandle = await window.showDirectoryPicker();
      fileStorage.setDirectoryHandle(dirHandle);
      
      // 迁移数据
      const migrator = new StorageMigrator();
      await migrator.migrate(chromeStorage, fileStorage, true);
      
      return fileStorage;
    }
  }
  
  await chromeStorage.write(data);
  return chromeStorage;
}
```

### 示例 2：安全的并发写入

```typescript
import { globalLockManager } from '@/storage';

// 场景：多个标签页同时保存书签
async function addBookmark(bookmark: Bookmark, storage: IStorageAdapter) {
  await globalLockManager.withLock(
    storage,
    async () => {
      // 1. 读取现有数据
      const encrypted = await storage.read();
      
      if (!encrypted) {
        throw new Error('未找到数据');
      }
      
      // 2. 解密
      const decrypted = await decrypt(encrypted);
      const bookmarks = JSON.parse(decrypted);
      
      // 3. 添加新书签
      bookmarks.push(bookmark);
      
      // 4. 重新加密
      const newEncrypted = await encrypt(JSON.stringify(bookmarks));
      
      // 5. 保存
      await storage.write(newEncrypted);
    },
    'write'
  );
}
```

### 示例 3：完整的存储切换流程

```typescript
async function switchStorage(
  currentStorage: IStorageAdapter,
  newStorageType: 'chrome' | 'filesystem'
) {
  try {
    // 1. 创建新存储适配器
    let newStorage: IStorageAdapter;
    
    if (newStorageType === 'chrome') {
      newStorage = new ChromeStorageAdapter();
    } else {
      const fileStorage = new FileSystemAdapter();
      const dirHandle = await window.showDirectoryPicker();
      fileStorage.setDirectoryHandle(dirHandle);
      newStorage = fileStorage;
    }
    
    // 2. 检查新存储是否可用
    const isAvailable = await newStorage.isAvailable();
    if (!isAvailable) {
      throw new Error('新存储不可用');
    }
    
    // 3. 执行迁移
    const migrator = new StorageMigrator();
    const result = await migrator.migrate(
      currentStorage,
      newStorage,
      false, // 保留旧数据作为备份
      (progress) => {
        console.log(`迁移进度: ${progress.percent}% - ${progress.message}`);
      }
    );
    
    if (!result.success) {
      throw new Error(result.error || '迁移失败');
    }
    
    // 4. 验证数据一致性
    const isConsistent = await migrator.verifyConsistency(
      currentStorage,
      newStorage
    );
    
    if (!isConsistent) {
      throw new Error('数据一致性验证失败');
    }
    
    // 5. 更新配置
    await updateStorageConfig(newStorageType);
    
    console.log('存储切换成功！');
    return newStorage;
    
  } catch (error) {
    console.error('存储切换失败:', error);
    throw error;
  }
}
```

### 示例 4：数据备份与恢复

```typescript
async function backupAndRestore() {
  const storage = new ChromeStorageAdapter();
  const migrator = new StorageMigrator();
  
  // 创建备份
  const backup = await migrator.createBackup(storage);
  
  if (!backup) {
    console.log('没有数据需要备份');
    return;
  }
  
  // 保存备份到本地文件
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${Date.now()}.json`;
  a.click();
  
  // 从备份恢复
  try {
    // 模拟数据损坏
    await storage.clear();
    
    // 从备份恢复
    await migrator.restoreFromBackup(storage, backup);
    
    console.log('数据恢复成功！');
  } catch (error) {
    console.error('恢复失败:', error);
  }
}
```

---

## 最佳实践

### 1. 容量管理

```typescript
// ✅ 推荐：定期检查容量
async function monitorStorage(storage: ChromeStorageAdapter) {
  const capacity = await storage.getCapacity();
  
  if (capacity.usagePercent > 80) {
    console.warn(`存储使用率: ${capacity.usagePercent.toFixed(1)}%`);
    
    // 提示用户清理或迁移
    notifyUser('存储空间不足，建议切换到文件系统存储');
  }
}
```

### 2. 错误处理

```typescript
// ✅ 推荐：完整的错误处理
async function safeWrite(storage: IStorageAdapter, data: EncryptedData) {
  try {
    await storage.write(data);
  } catch (error) {
    if (error instanceof StorageError) {
      // 存储特定错误
      if (error.message.includes('空间不足')) {
        // 提示切换存储方式
        await handleStorageFull();
      } else {
        console.error('存储错误:', error.message);
      }
    } else {
      // 其他错误
      console.error('未知错误:', error);
    }
  }
}
```

### 3. 并发保护

```typescript
// ✅ 推荐：始终使用锁保护写操作
import { globalLockManager } from '@/storage';

async function updateData(storage: IStorageAdapter, updates: Partial<Data>) {
  await globalLockManager.withLock(
    storage,
    async () => {
      const current = await storage.read();
      const merged = { ...current, ...updates };
      await storage.write(merged);
    },
    'write'
  );
}
```

### 4. 存储选择策略

```typescript
// ✅ 推荐：根据容量自动选择存储方式
async function selectStorage(dataSize: number): Promise<IStorageAdapter> {
  const chromeStorage = new ChromeStorageAdapter();
  const capacity = await chromeStorage.getCapacity();
  
  const availableSpace = capacity.total - capacity.used;
  
  // 如果 Chrome Storage 空间充足，优先使用（配置简单）
  if (dataSize < availableSpace * 0.8) {
    return chromeStorage;
  }
  
  // 否则使用文件系统存储
  const fileStorage = new FileSystemAdapter();
  const dirHandle = await window.showDirectoryPicker();
  fileStorage.setDirectoryHandle(dirHandle);
  
  return fileStorage;
}
```

---

## 常见问题

### Q1: Chrome Storage 容量限制是多少？
**A**: 10MB（准确值：`chrome.storage.local.QUOTA_BYTES`）

### Q2: File System API 兼容性如何？
**A**: 支持 Chrome 86+、Edge 86+，不支持 Firefox。建议提供降级方案：
```typescript
const isFileSystemSupported = 'showDirectoryPicker' in window;

if (!isFileSystemSupported) {
  // 降级到 Chrome Storage
  return new ChromeStorageAdapter();
}
```

### Q3: 如何处理并发写入？
**A**: 使用 `StorageLockManager`:
```typescript
await globalLockManager.withLock(storage, async () => {
  // 你的写入逻辑
}, 'write');
```

### Q4: 迁移失败会丢失数据吗？
**A**: 不会。迁移失败时会自动回滚，源数据保持不变。

### Q5: 如何验证数据完整性？
**A**: 使用 `StorageMigrator.verifyConsistency()`:
```typescript
const isValid = await migrator.verifyConsistency(storage1, storage2);
```

---

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   应用层 (App Layer)                      │
├─────────────────────────────────────────────────────────┤
│                IStorageAdapter 接口                      │
├──────────────────────┬──────────────────────────────────┤
│  ChromeStorageAdapter│    FileSystemAdapter             │
│                      │                                  │
│  - 容量监控          │    - 路径校验                     │
│  - 空间预警          │    - 权限检测                     │
│  - 10MB 限制         │    - 无容量限制                   │
└──────────────────────┴──────────────────────────────────┘
         │                          │
         └──────────┬───────────────┘
                    │
         ┌──────────▼──────────┐
         │  StorageMigrator    │
         │  - 数据迁移          │
         │  - 完整性校验        │
         │  - 回滚机制          │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │ StorageLockManager  │
         │  - 并发控制          │
         │  - 读写锁分离        │
         │  - 死锁检测          │
         └─────────────────────┘
```

---

**维护者**: PrivateBookMark Team  
**最后更新**: 2024-03-29
