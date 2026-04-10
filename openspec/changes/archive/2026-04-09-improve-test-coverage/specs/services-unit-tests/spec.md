## ADDED Requirements

### Requirement: EncryptionService 单元测试
系统 SHALL 为 EncryptionService 提供完整的单元测试，覆盖加密、解密、密钥派生等核心功能。

#### Scenario: 加密后可正确解密
- **WHEN** 使用有效密钥对明文数据调用 encrypt()
- **THEN** 返回加密后的密文，且使用相同密钥调用 decrypt() 可还原原始明文

#### Scenario: 错误密钥解密失败
- **WHEN** 使用错误密钥对密文调用 decrypt()
- **THEN** 抛出解密错误，不返回明文数据

#### Scenario: 空数据加密
- **WHEN** 对空字符串调用 encrypt()
- **THEN** 正常返回加密结果，不抛出异常

### Requirement: BookmarkService 单元测试
系统 SHALL 为 BookmarkService 提供单元测试，覆盖书签的 CRUD 操作和搜索功能。

#### Scenario: 创建书签
- **WHEN** 调用 addBookmark() 传入有效的书签数据
- **THEN** 书签被正确存储，返回包含 ID 的书签对象

#### Scenario: 删除书签
- **WHEN** 调用 deleteBookmark() 传入有效的书签 ID
- **THEN** 书签被从存储中移除

#### Scenario: 搜索书签
- **WHEN** 调用搜索方法传入关键词
- **THEN** 返回标题或 URL 匹配的书签列表

#### Scenario: 书签不存在时的处理
- **WHEN** 调用 deleteBookmark() 传入不存在的 ID
- **THEN** 不抛出异常，优雅处理

### Requirement: FolderService 单元测试
系统 SHALL 为 FolderService 提供单元测试，覆盖文件夹的 CRUD 操作和层级管理。

#### Scenario: 创建文件夹
- **WHEN** 调用 createFolder() 传入文件夹名称
- **THEN** 文件夹被正确创建并存储

#### Scenario: 重命名文件夹
- **WHEN** 调用 renameFolder() 传入新名称
- **THEN** 文件夹名称被更新

#### Scenario: 删除文件夹及其书签
- **WHEN** 调用 deleteFolder() 传入包含书签的文件夹 ID
- **THEN** 文件夹及其关联书签被正确处理

#### Scenario: 获取文件夹列表
- **WHEN** 调用 getFolders()
- **THEN** 返回所有文件夹的有序列表

### Requirement: TagService 单元测试
系统 SHALL 为 TagService 提供单元测试，覆盖标签的 CRUD 操作和书签关联。

#### Scenario: 创建标签
- **WHEN** 调用 createTag() 传入标签名称
- **THEN** 标签被正确创建

#### Scenario: 为书签添加标签
- **WHEN** 调用标签关联方法
- **THEN** 书签与标签的关联关系被正确存储

#### Scenario: 删除标签
- **WHEN** 调用 deleteTag()
- **THEN** 标签被删除，关联关系被清理

### Requirement: AuthService 单元测试
系统 SHALL 为 AuthService 提供单元测试，覆盖认证流程。

#### Scenario: 首次设置密码
- **WHEN** 调用密码设置方法传入有效密码
- **THEN** 密码被哈希后存储

#### Scenario: 密码验证成功
- **WHEN** 调用验证方法传入正确密码
- **THEN** 返回验证成功

#### Scenario: 密码验证失败
- **WHEN** 调用验证方法传入错误密码
- **THEN** 返回验证失败

### Requirement: SessionService 单元测试
系统 SHALL 为 SessionService 提供单元测试，覆盖会话管理。

#### Scenario: 创建会话
- **WHEN** 认证成功后创建会话
- **THEN** 会话信息被正确存储

#### Scenario: 会话过期检测
- **WHEN** 检查已超时的会话
- **THEN** 返回会话已过期

#### Scenario: 销毁会话
- **WHEN** 调用会话销毁方法
- **THEN** 会话数据被清除

### Requirement: LockService 单元测试
系统 SHALL 为 LockService 提供单元测试，覆盖锁定/解锁逻辑。

#### Scenario: 锁定状态检查
- **WHEN** 调用 isLocked()
- **THEN** 返回当前锁定状态

#### Scenario: 执行锁定
- **WHEN** 调用 lock()
- **THEN** 系统进入锁定状态，会话被清除

### Requirement: PasswordService 单元测试
系统 SHALL 为 PasswordService 提供单元测试，覆盖密码管理功能。

#### Scenario: 修改密码
- **WHEN** 提供正确的旧密码和有效的新密码
- **THEN** 密码被更新，数据被重新加密

#### Scenario: 旧密码错误时修改失败
- **WHEN** 提供错误的旧密码
- **THEN** 修改被拒绝，抛出错误

### Requirement: SettingsService 单元测试
系统 SHALL 为 SettingsService 提供单元测试，覆盖设置读写。

#### Scenario: 读取默认设置
- **WHEN** 首次调用 getSettings()
- **THEN** 返回默认设置值

#### Scenario: 更新设置
- **WHEN** 调用 updateSettings() 传入新设置
- **THEN** 设置被持久化存储

### Requirement: ImportExportService 单元测试
系统 SHALL 为 ImportExportService 提供单元测试，覆盖导入导出功能。

#### Scenario: 导出为 JSON 格式
- **WHEN** 调用导出方法选择 JSON 格式
- **THEN** 返回包含所有书签数据的 JSON 字符串

#### Scenario: 导出为 HTML 格式
- **WHEN** 调用导出方法选择 HTML 格式
- **THEN** 返回符合 Netscape Bookmark 格式的 HTML 字符串

#### Scenario: 导入 JSON 数据
- **WHEN** 调用导入方法传入有效的 JSON 数据
- **THEN** 书签数据被正确解析并存储

#### Scenario: 导入无效数据
- **WHEN** 调用导入方法传入格式错误的数据
- **THEN** 抛出解析错误，不影响现有数据
