# Playwright E2E 测试方案

## 项目概述

本方案为 Encrypted-Bookmark Chrome 扩展提供完整的端到端测试覆盖，使用 Playwright 加载真实扩展并模拟用户操作。

## 测试架构

```
e2e/
├── fixtures/
│   └── extension.ts          # 扩展加载 fixture
├── helpers/
│   ├── chrome-storage.ts     # Chrome Storage 操作辅助
│   └── selectors.ts          # 页面选择器常量
├── tests/
│   ├── popup/
│   │   ├── password-setup.spec.ts    # 首次设置密码
│   │   ├── unlock.spec.ts            # 解锁流程
│   │   ├── lock.spec.ts              # 锁定功能
│   │   └── account-lock.spec.ts      # 账户锁定机制
│   ├── options/
│   │   ├── navigation.spec.ts        # Tab 导航
│   │   ├── basic-settings.spec.ts    # 基础设置
│   │   ├── security-settings.spec.ts # 安全设置
│   │   ├── storage-settings.spec.ts  # 存储设置
│   │   └── import-export.spec.ts     # 导入导出
│   └── integration/
│       ├── popup-options-sync.spec.ts # Popup 与 Options 联动
│       └── background-messaging.spec.ts # Background 消息通信
├── playwright.config.ts
└── README.md
```

## 测试覆盖范围

### Popup 页面测试

| 测试场景 | 描述 | 优先级 |
|---------|------|--------|
| 首次使用设置密码 | 验证密码强度、确认一致性、设置成功 | P0 |
| 密码强度校验 | 长度不足、过长等异常场景 | P0 |
| 正确密码解锁 | 输入正确密码后显示已解锁状态 | P0 |
| 错误密码提示 | 显示剩余尝试次数 | P0 |
| 账户锁定机制 | 3次/5次错误后的锁定行为 | P1 |
| 手动锁定功能 | 点击锁定按钮后回到解锁界面 | P1 |

### Options 页面测试

| 测试场景 | 描述 | 优先级 |
|---------|------|--------|
| Tab 导航切换 | 5个 Tab 切换正确显示对应面板 | P0 |
| 基础设置面板 | 设置项保存与加载 | P1 |
| 安全设置面板 | 修改密码等安全相关操作 | P1 |
| 存储设置面板 | 存储配置管理 | P2 |
| 导入导出功能 | 数据备份与恢复 | P1 |
| 消息提示系统 | success/error 消息正确显示 | P2 |

### 集成测试

| 测试场景 | 描述 | 优先级 |
|---------|------|--------|
| Background 消息通信 | GET_PASSWORD_STATUS, LOCK 等消息 | P1 |
| Popup-Options 状态同步 | 在一处修改后另一处反映变化 | P2 |
| Service Worker 生命周期 | 扩展安装、更新事件 | P2 |

## 技术要点

### 1. 扩展加载方式

Playwright 需要使用 **persistent context** 才能加载 Chrome 扩展：

```typescript
const context = await chromium.launchPersistentContext('', {
  headless: false, // 扩展必须在 headed 模式
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
});
```

### 2. 扩展 ID 获取

扩展 ID 从 Service Worker URL 动态提取：

```typescript
let [background] = context.serviceWorkers();
if (!background) {
  background = await context.waitForEvent('serviceworker');
}
const extensionId = background.url().split('/')[2];
```

### 3. 页面访问

- Popup: `chrome-extension://${extensionId}/src/popup/index.html`
- Options: `chrome-extension://${extensionId}/src/options/index.html`

### 4. Chrome Storage 操作

测试中可通过 `page.evaluate()` 操作 Chrome Storage：

```typescript
// 清空存储（测试前重置）
await page.evaluate(() => chrome.storage.local.clear());

// 预设数据
await page.evaluate((data) => chrome.storage.local.set(data), testData);

// 读取数据验证
const result = await page.evaluate(() => chrome.storage.local.get());
```

## 运行测试

```bash
# 安装依赖
npm install -D @playwright/test

# 构建扩展
npm run build

# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test e2e/tests/popup/password-setup.spec.ts

# UI 模式（调试）
npx playwright test --ui

# 生成测试报告
npx playwright test --reporter=html
```

## 注意事项

1. **必须先构建扩展**：测试使用 `dist/` 目录的构建产物
2. **Headed 模式**：Chrome 扩展不支持 headless 模式
3. **测试隔离**：每个测试前清空 Chrome Storage
4. **并行限制**：扩展测试建议 `workers: 1` 避免冲突
