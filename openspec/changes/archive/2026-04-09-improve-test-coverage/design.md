## Context

Encrypted-Bookmark 是一个 Chrome 扩展项目，使用 React 18 + TypeScript + Vite 构建。项目包含以下核心模块：

- **服务层** (`src/services/`)：10 个核心服务，涵盖加密、书签管理、文件夹、标签、认证、会话、锁定、密码、设置、导入导出
- **存储层** (`src/storage/`)：双存储适配器（ChromeStorage + FileSystem）、锁管理器、迁移器
- **工具层** (`src/utils/`)：密码哈希、密码校验、XSS 防护、favicon 获取、通用 helpers
- **解析器** (`src/services/parsers/`)：HTML 解析/生成、JSON 解析
- **React Hooks** (`src/popup/hooks/`)：9 个自定义 Hooks
- **UI 组件** (`src/popup/components/` + `src/options/components/`)

当前测试现状：仅有 Playwright E2E 测试（26 个测试文件），无单元测试框架。所有业务逻辑的正确性验证完全依赖 E2E 测试，粒度粗、执行慢、定位难。

## Goals / Non-Goals

**Goals:**
- 引入 Vitest 单元测试框架，建立完整的测试基础设施
- 为核心服务层、存储层、工具函数、解析器建立单元测试覆盖
- 为 React 自定义 Hooks 建立测试覆盖
- 建立 Chrome API Mock 方案，解决浏览器扩展测试难题
- 核心模块行覆盖率达到 ≥ 80%
- 在 package.json 中集成 test 和 coverage 命令

**Non-Goals:**
- 不涉及 UI 组件的渲染测试（组件测试留待后续专项）
- 不修改任何现有业务逻辑代码
- 不替换或修改现有 E2E 测试
- 不引入 CI/CD 流水线配置（仅提供本地命令）
- 不追求 100% 覆盖率，优先覆盖核心路径和边界场景

## Decisions

### 1. 测试框架选择：Vitest

**选择**：Vitest
**替代方案**：Jest
**理由**：
- 项目已使用 Vite 构建，Vitest 与 Vite 共享配置，零额外构建配置
- Vitest 原生支持 ESM（项目 `"type": "module"`），Jest 对 ESM 支持需额外配置
- Vitest 的 HMR 模式开发体验更好，测试执行速度更快
- API 与 Jest 兼容，学习成本低

### 2. 覆盖率工具：@vitest/coverage-v8

**选择**：v8 覆盖率引擎
**替代方案**：Istanbul
**理由**：
- v8 引擎性能更好，无需代码插桩
- 与 Vitest 集成更紧密，配置更简单
- 对 TypeScript 源码映射支持良好

### 3. Chrome API Mock 方案：手动 Mock + vitest.mock

**选择**：在 `src/test/mocks/` 中创建 Chrome API 的手动 Mock 实现
**替代方案**：使用 sinon-chrome 等第三方库
**理由**：
- 项目使用的 Chrome API 范围有限（chrome.storage、chrome.runtime、chrome.tabs），手动 Mock 可控性更强
- 第三方 Mock 库可能不覆盖所有使用的 API 或版本不匹配
- 手动 Mock 可以精确模拟异步行为和错误场景

### 4. React Hooks 测试：@testing-library/react

**选择**：@testing-library/react 的 renderHook
**替代方案**：@testing-library/react-hooks（已废弃）
**理由**：
- @testing-library/react v14+ 已内置 renderHook
- 社区标准方案，文档完善
- 配合 jsdom 环境即可运行

### 5. 测试文件组织：就近放置

**选择**：在每个模块目录下创建 `__tests__/` 子目录
**替代方案**：顶层 `tests/` 目录镜像 src 结构
**理由**：
- 就近放置便于发现和维护
- 重构时测试文件跟随源码移动
- 符合社区主流实践

### 6. 测试目录结构

```
src/
├── test/                          # 测试公共设施
│   ├── setup.ts                   # 全局 setup（Chrome API Mock 注入）
│   └── mocks/
│       ├── chrome.ts              # chrome.* API Mock
│       └── crypto.ts              # Web Crypto API Mock
├── services/__tests__/            # 服务层测试
│   ├── EncryptionService.test.ts
│   ├── BookmarkService.test.ts
│   ├── FolderService.test.ts
│   ├── TagService.test.ts
│   ├── AuthService.test.ts
│   ├── SessionService.test.ts
│   ├── LockService.test.ts
│   ├── PasswordService.test.ts
│   ├── SettingsService.test.ts
│   └── ImportExportService.test.ts
├── services/parsers/__tests__/    # 解析器测试
│   ├── HtmlParser.test.ts
│   ├── HtmlGenerator.test.ts
│   └── JsonParser.test.ts
├── storage/__tests__/             # 存储层测试
│   ├── ChromeStorageAdapter.test.ts
│   ├── FileSystemAdapter.test.ts
│   ├── StorageLockManager.test.ts
│   └── StorageMigrator.test.ts
├── utils/__tests__/               # 工具函数测试
│   ├── passwordHasher.test.ts
│   ├── passwordValidator.test.ts
│   ├── xssProtection.test.ts
│   ├── favicon.test.ts
│   └── helpers.test.ts
└── popup/hooks/__tests__/         # Hooks 测试
    ├── useBookmarks.test.ts
    ├── useCurrentTab.test.ts
    ├── useFolderActions.test.ts
    ├── useFolders.test.ts
    ├── useLockSettings.test.ts
    ├── useSearch.test.ts
    ├── useTagActions.test.ts
    └── useTags.test.ts
```

## Risks / Trade-offs

- **[Chrome API Mock 维护成本]** → 手动 Mock 需要随 Chrome API 使用变化而更新。缓解：Mock 集中管理在 `src/test/mocks/`，变更时统一修改
- **[Web Crypto API 环境差异]** → Node.js 环境的 crypto 与浏览器 Web Crypto API 存在差异。缓解：使用 jsdom 环境 + 必要时 polyfill `globalThis.crypto`
- **[测试与实现耦合]** → 过度 Mock 可能导致测试与实现细节耦合。缓解：优先测试公共接口行为，减少对内部实现的断言
- **[初始投入较大]** → 需要为 10+ 个服务编写测试。缓解：按优先级分批实施，先覆盖核心加密和存储模块
