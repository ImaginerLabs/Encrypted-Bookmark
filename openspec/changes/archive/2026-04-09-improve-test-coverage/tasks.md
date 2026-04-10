## 1. 测试基础设施搭建

- [x] 1.1 安装 Vitest 及相关依赖（vitest、@vitest/coverage-v8、jsdom、@testing-library/react、@testing-library/jest-dom）
- [x] 1.2 创建 `vitest.config.ts` 配置文件，设置 jsdom 环境、测试文件匹配规则、覆盖率配置
- [x] 1.3 在 `package.json` 中添加 `test`、`test:watch`、`test:coverage` 脚本命令
- [x] 1.4 创建 `src/test/setup.ts` 全局 setup 文件，注入 Chrome API Mock
- [x] 1.5 创建 `src/test/mocks/chrome.ts`，实现 chrome.storage、chrome.runtime、chrome.tabs 的 Mock
- [x] 1.6 创建 `src/test/mocks/crypto.ts`，实现 Web Crypto API 的 Mock（crypto.subtle、crypto.getRandomValues）
- [x] 1.7 验证测试基础设施：编写一个简单的 smoke test 确认 Vitest + Mock 环境正常工作

## 2. 工具函数单元测试

- [x] 2.1 创建 `src/utils/__tests__/passwordHasher.test.ts`，测试密码哈希和验证功能
- [x] 2.2 创建 `src/utils/__tests__/passwordValidator.test.ts`，测试密码强度校验规则（有效密码、过短、缺少字符类型、空密码）
- [x] 2.3 创建 `src/utils/__tests__/xssProtection.test.ts`，测试 XSS 防护（HTML 标签转义、特殊字符、安全字符串、null/undefined 处理）
- [x] 2.4 创建 `src/utils/__tests__/favicon.test.ts`，测试 favicon URL 生成（有效 URL、无效 URL）
- [x] 2.5 创建 `src/utils/__tests__/helpers.test.ts`，测试通用工具函数

## 3. 解析器单元测试

- [x] 3.1 创建 `src/services/parsers/__tests__/HtmlParser.test.ts`，测试 HTML 书签解析（标准格式、嵌套文件夹、空文件、异常格式）
- [x] 3.2 创建 `src/services/parsers/__tests__/HtmlGenerator.test.ts`，测试 HTML 书签生成（标准格式、含文件夹、空数据）
- [x] 3.3 创建 `src/services/parsers/__tests__/JsonParser.test.ts`，测试 JSON 解析（有效 JSON、无效 JSON、缺少字段）

## 4. 存储层单元测试

- [x] 4.1 创建 `src/storage/__tests__/ChromeStorageAdapter.test.ts`，测试 Chrome Storage 适配器（读取、写入、删除、存储空间不足）
- [x] 4.2 创建 `src/storage/__tests__/FileSystemAdapter.test.ts`，测试 File System 适配器（读取、写入、句柄失效）
- [x] 4.3 创建 `src/storage/__tests__/StorageLockManager.test.ts`，测试存储锁管理（获取锁、锁冲突、释放锁、超时释放）
- [x] 4.4 创建 `src/storage/__tests__/StorageMigrator.test.ts`，测试数据迁移（检测迁移、执行迁移、无需迁移）

## 5. 核心服务层单元测试（第一批：加密与认证）

- [x] 5.1 创建 `src/services/__tests__/EncryptionService.test.ts`，测试加解密、密钥派生、空数据、错误密钥
- [x] 5.2 创建 `src/services/__tests__/AuthService.test.ts`，测试密码设置、密码验证成功/失败
- [x] 5.3 创建 `src/services/__tests__/PasswordService.test.ts`，测试密码修改、旧密码错误
- [x] 5.4 创建 `src/services/__tests__/SessionService.test.ts`，测试会话创建、过期检测、销毁
- [x] 5.5 创建 `src/services/__tests__/LockService.test.ts`，测试锁定状态检查、执行锁定

## 6. 核心服务层单元测试（第二批：业务逻辑）

- [x] 6.1 创建 `src/services/__tests__/BookmarkService.test.ts`，测试书签 CRUD、搜索、不存在 ID 处理
- [x] 6.2 创建 `src/services/__tests__/FolderService.test.ts`，测试文件夹 CRUD、层级管理、删除含书签文件夹
- [x] 6.3 创建 `src/services/__tests__/TagService.test.ts`，测试标签 CRUD、书签关联、删除清理
- [x] 6.4 创建 `src/services/__tests__/SettingsService.test.ts`，测试设置读取默认值、更新设置
- [x] 6.5 创建 `src/services/__tests__/ImportExportService.test.ts`，测试 JSON/HTML 导出、JSON 导入、无效数据导入

## 7. React Hooks 单元测试

- [x] 7.1 创建 `src/popup/hooks/__tests__/useBookmarks.test.ts`，测试书签数据加载、空列表
- [x] 7.2 创建 `src/popup/hooks/__tests__/useCurrentTab.test.ts`，测试当前标签页获取、不可用场景
- [x] 7.3 创建 `src/popup/hooks/__tests__/useFolderActions.test.ts`，测试文件夹创建/删除操作
- [x] 7.4 创建 `src/popup/hooks/__tests__/useFolders.test.ts`，测试文件夹列表加载
- [x] 7.5 创建 `src/popup/hooks/__tests__/useLockSettings.test.ts`，测试锁定设置获取/更新
- [x] 7.6 创建 `src/popup/hooks/__tests__/useSearch.test.ts`，测试搜索关键词更新
- [x] 7.7 创建 `src/popup/hooks/__tests__/useTagActions.test.ts`，测试标签创建/删除操作
- [x] 7.8 创建 `src/popup/hooks/__tests__/useTags.test.ts`，测试标签列表加载

## 8. 覆盖率验证与收尾

- [x] 8.1 运行 `npm run test:coverage`，检查各模块覆盖率是否达到 ≥ 80% 目标
- [x] 8.2 针对覆盖率不足的模块补充边界场景测试
- [x] 8.3 确认所有测试通过，无跳过或失败的用例
- [x] 8.4 更新 `.gitignore` 添加 `coverage/` 目录
