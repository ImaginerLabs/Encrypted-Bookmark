## ADDED Requirements

### Requirement: Vitest 测试框架配置
系统 SHALL 使用 Vitest 作为单元测试运行器，配置文件 `vitest.config.ts` 位于项目根目录。

#### Scenario: Vitest 配置文件存在且可用
- **WHEN** 开发者执行 `npx vitest --version`
- **THEN** 系统输出 Vitest 版本号，确认安装成功

#### Scenario: 测试命令可执行
- **WHEN** 开发者执行 `npm test`
- **THEN** Vitest 运行所有 `**/__tests__/**/*.test.ts(x)` 匹配的测试文件

#### Scenario: 覆盖率命令可执行
- **WHEN** 开发者执行 `npm run test:coverage`
- **THEN** Vitest 运行所有测试并生成 v8 覆盖率报告，输出到 `coverage/` 目录

### Requirement: Chrome API Mock 全局注入
系统 SHALL 在测试 setup 阶段自动注入 Chrome API Mock，使所有测试文件可直接使用 `chrome.*` API。

#### Scenario: chrome.storage Mock 可用
- **WHEN** 测试文件中调用 `chrome.storage.local.get()`
- **THEN** Mock 返回预设的存储数据，不抛出 "chrome is not defined" 错误

#### Scenario: chrome.runtime Mock 可用
- **WHEN** 测试文件中调用 `chrome.runtime.sendMessage()`
- **THEN** Mock 正常执行，支持 `vi.fn()` 断言调用参数

#### Scenario: chrome.tabs Mock 可用
- **WHEN** 测试文件中调用 `chrome.tabs.query()`
- **THEN** Mock 返回预设的标签页数据

### Requirement: Web Crypto API Mock
系统 SHALL 提供 Web Crypto API 的 Mock 实现，支持加密服务的单元测试。

#### Scenario: crypto.subtle 可用
- **WHEN** 测试文件中调用 `crypto.subtle.encrypt()` 或 `crypto.subtle.decrypt()`
- **THEN** Mock 正常执行加解密操作，返回有效的 ArrayBuffer

#### Scenario: crypto.getRandomValues 可用
- **WHEN** 测试文件中调用 `crypto.getRandomValues()`
- **THEN** Mock 返回填充了随机值的 TypedArray

### Requirement: 测试环境配置
系统 SHALL 配置 jsdom 作为测试环境，支持 DOM API 和浏览器全局对象。

#### Scenario: jsdom 环境生效
- **WHEN** 测试文件中访问 `document`、`window` 等全局对象
- **THEN** 对象存在且可正常使用

### Requirement: package.json 脚本集成
系统 SHALL 在 package.json 中添加 `test`、`test:watch`、`test:coverage` 三个脚本命令。

#### Scenario: test 脚本运行单次测试
- **WHEN** 开发者执行 `npm test`
- **THEN** 运行所有单元测试并退出

#### Scenario: test:watch 脚本运行监听模式
- **WHEN** 开发者执行 `npm run test:watch`
- **THEN** Vitest 进入 watch 模式，文件变更时自动重新运行相关测试

#### Scenario: test:coverage 脚本生成覆盖率报告
- **WHEN** 开发者执行 `npm run test:coverage`
- **THEN** 运行所有测试并输出覆盖率报告，包含行覆盖率、分支覆盖率、函数覆盖率
