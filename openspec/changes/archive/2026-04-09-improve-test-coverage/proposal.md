## Why

当前项目仅有 E2E 测试（Playwright），缺少单元测试和集成测试层。核心业务逻辑（加密服务、书签服务、存储层、密码管理等）完全没有单元测试覆盖，代码质量依赖人工审查和 E2E 测试兜底。随着功能迭代加速，缺乏细粒度测试会导致回归风险增大、重构信心不足、Bug 定位效率低下。现在引入单元测试框架并系统性提升覆盖率，是保障代码质量的关键时机。

## What Changes

- **引入单元测试框架**：添加 Vitest 作为单元测试运行器，配置测试环境和覆盖率报告（Istanbul/v8）
- **核心服务层单元测试**：为 `src/services/` 下的关键服务编写单元测试，包括 EncryptionService、BookmarkService、FolderService、TagService、AuthService、SessionService、LockService、PasswordService、SettingsService、ImportExportService
- **存储层单元测试**：为 `src/storage/` 下的 ChromeStorageAdapter、FileSystemAdapter、StorageLockManager、StorageMigrator 编写单元测试
- **工具函数单元测试**：为 `src/utils/` 下的 passwordHasher、passwordValidator、xssProtection、favicon、helpers 编写单元测试
- **解析器单元测试**：为 `src/services/parsers/` 下的 HtmlParser、HtmlGenerator、JsonParser 编写单元测试
- **React Hooks 测试**：为 `src/popup/hooks/` 下的自定义 Hooks 编写测试
- **CI 集成**：在 package.json 中添加 test 和 coverage 脚本命令
- **覆盖率门槛**：设定核心模块覆盖率目标 ≥ 80%

## Capabilities

### New Capabilities
- `unit-test-infrastructure`: 单元测试基础设施搭建，包括 Vitest 配置、Chrome API Mock 方案、覆盖率报告配置
- `services-unit-tests`: 核心服务层（EncryptionService、BookmarkService、FolderService、TagService、AuthService、SessionService、LockService、PasswordService、SettingsService、ImportExportService）的单元测试覆盖
- `storage-unit-tests`: 存储层（适配器、锁管理器、迁移器）的单元测试覆盖
- `utils-unit-tests`: 工具函数（密码哈希、密码校验、XSS 防护、favicon、helpers）和解析器（HtmlParser、HtmlGenerator、JsonParser）的单元测试覆盖
- `hooks-unit-tests`: React 自定义 Hooks 的单元测试覆盖

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **新增依赖**：vitest、@testing-library/react、@testing-library/react-hooks、jsdom、@vitest/coverage-v8
- **新增文件**：`vitest.config.ts`、`src/**/__tests__/*.test.ts(x)` 测试文件、`src/test/` 测试工具和 Mock 文件
- **修改文件**：`package.json`（添加 test/coverage 脚本和 devDependencies）、`tsconfig.json`（包含测试文件路径）
- **受影响模块**：所有 `src/services/`、`src/storage/`、`src/utils/`、`src/popup/hooks/` 模块
- **无破坏性变更**：仅新增测试代码，不修改任何业务逻辑
