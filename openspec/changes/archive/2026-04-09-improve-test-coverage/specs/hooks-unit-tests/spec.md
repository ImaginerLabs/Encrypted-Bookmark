## ADDED Requirements

### Requirement: useBookmarks Hook 单元测试
系统 SHALL 为 useBookmarks Hook 提供单元测试，覆盖书签数据获取和状态管理。

#### Scenario: 初始加载书签
- **WHEN** Hook 首次渲染
- **THEN** 从服务层获取书签列表并更新状态

#### Scenario: 书签列表为空
- **WHEN** 存储中无书签数据
- **THEN** 返回空数组，loading 状态正确切换

### Requirement: useCurrentTab Hook 单元测试
系统 SHALL 为 useCurrentTab Hook 提供单元测试，覆盖当前标签页信息获取。

#### Scenario: 获取当前标签页
- **WHEN** Hook 渲染时
- **THEN** 调用 chrome.tabs.query 获取当前活动标签页信息

#### Scenario: 标签页信息不可用
- **WHEN** chrome.tabs.query 返回空结果
- **THEN** 返回 null 或默认值

### Requirement: useFolderActions Hook 单元测试
系统 SHALL 为 useFolderActions Hook 提供单元测试，覆盖文件夹操作。

#### Scenario: 创建文件夹操作
- **WHEN** 调用 Hook 返回的 createFolder 方法
- **THEN** 调用 FolderService 创建文件夹并刷新列表

#### Scenario: 删除文件夹操作
- **WHEN** 调用 Hook 返回的 deleteFolder 方法
- **THEN** 调用 FolderService 删除文件夹并刷新列表

### Requirement: useFolders Hook 单元测试
系统 SHALL 为 useFolders Hook 提供单元测试，覆盖文件夹列表管理。

#### Scenario: 加载文件夹列表
- **WHEN** Hook 首次渲染
- **THEN** 从服务层获取文件夹列表

### Requirement: useLockSettings Hook 单元测试
系统 SHALL 为 useLockSettings Hook 提供单元测试，覆盖锁定设置管理。

#### Scenario: 获取锁定设置
- **WHEN** Hook 渲染时
- **THEN** 返回当前锁定相关设置

#### Scenario: 更新锁定设置
- **WHEN** 调用 Hook 返回的更新方法
- **THEN** 设置被持久化并更新状态

### Requirement: useSearch Hook 单元测试
系统 SHALL 为 useSearch Hook 提供单元测试，覆盖搜索功能。

#### Scenario: 搜索关键词更新
- **WHEN** 调用 setSearchTerm 更新搜索词
- **THEN** 搜索状态被更新

### Requirement: useTagActions Hook 单元测试
系统 SHALL 为 useTagActions Hook 提供单元测试，覆盖标签操作。

#### Scenario: 创建标签操作
- **WHEN** 调用 Hook 返回的 createTag 方法
- **THEN** 调用 TagService 创建标签

#### Scenario: 删除标签操作
- **WHEN** 调用 Hook 返回的 deleteTag 方法
- **THEN** 调用 TagService 删除标签

### Requirement: useTags Hook 单元测试
系统 SHALL 为 useTags Hook 提供单元测试，覆盖标签列表管理。

#### Scenario: 加载标签列表
- **WHEN** Hook 首次渲染
- **THEN** 从服务层获取标签列表并更新状态
