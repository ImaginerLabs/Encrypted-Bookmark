## ADDED Requirements

### Requirement: ChromeStorageAdapter 单元测试
系统 SHALL 为 ChromeStorageAdapter 提供单元测试，覆盖基于 chrome.storage API 的存储操作。

#### Scenario: 读取数据
- **WHEN** 调用 get() 传入有效的 key
- **THEN** 返回 chrome.storage.local 中对应的数据

#### Scenario: 写入数据
- **WHEN** 调用 set() 传入 key-value 对
- **THEN** 数据被写入 chrome.storage.local

#### Scenario: 删除数据
- **WHEN** 调用 remove() 传入 key
- **THEN** 对应数据从 chrome.storage.local 中移除

#### Scenario: 存储空间不足
- **WHEN** 写入数据超出存储配额
- **THEN** 抛出存储错误

### Requirement: FileSystemAdapter 单元测试
系统 SHALL 为 FileSystemAdapter 提供单元测试，覆盖基于 File System Access API 的存储操作。

#### Scenario: 读取文件数据
- **WHEN** 调用 get() 读取已存在的数据
- **THEN** 返回文件中存储的数据

#### Scenario: 写入文件数据
- **WHEN** 调用 set() 写入数据
- **THEN** 数据被正确写入文件系统

#### Scenario: 文件句柄失效
- **WHEN** 文件句柄权限过期后调用读写操作
- **THEN** 抛出权限错误

### Requirement: StorageLockManager 单元测试
系统 SHALL 为 StorageLockManager 提供单元测试，覆盖存储并发锁机制。

#### Scenario: 获取锁
- **WHEN** 调用 acquireLock() 且当前无锁
- **THEN** 成功获取锁，返回锁标识

#### Scenario: 锁冲突
- **WHEN** 调用 acquireLock() 且锁已被其他操作持有
- **THEN** 等待或抛出锁冲突错误

#### Scenario: 释放锁
- **WHEN** 调用 releaseLock() 传入有效锁标识
- **THEN** 锁被释放，其他操作可获取

#### Scenario: 锁超时自动释放
- **WHEN** 持有锁超过超时时间
- **THEN** 锁被自动释放

### Requirement: StorageMigrator 单元测试
系统 SHALL 为 StorageMigrator 提供单元测试，覆盖数据迁移逻辑。

#### Scenario: 检测需要迁移
- **WHEN** 存储数据版本低于当前版本
- **THEN** 返回需要迁移

#### Scenario: 执行迁移
- **WHEN** 调用 migrate() 且存在版本差异
- **THEN** 数据被按版本顺序迁移到最新格式

#### Scenario: 无需迁移
- **WHEN** 存储数据版本与当前版本一致
- **THEN** 跳过迁移，不修改数据
