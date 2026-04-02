# Encrypted Bookmark 项目上下文

> 供 Agent 快速理解项目现状的参考文档。

## 项目定位

Encrypted Bookmark 是一个注重隐私保护的 Chrome/Edge 浏览器书签管理扩展，所有数据完全存储在本地，采用 AES-256-GCM 加密。

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite + @crxjs/vite-plugin |
| 加密方案 | Web Crypto API（AES-256-GCM + PBKDF2, 100k 迭代） |
| 浏览器规范 | Manifest V3 |
| 浏览器 API | Chrome Storage / Tabs / Idle / Bookmarks |
| E2E 测试 | Playwright（Chrome Extension 持久化上下文） |

## 目录结构

```
src/
├── background/          # Service Worker（消息通信、生命周期）
├── popup/               # 弹出窗口（主界面，书签管理）
├── options/             # 设置页面（密码修改、存储配置、导入导出）
├── services/            # 核心服务层
│   ├── EncryptionService.ts   # AES-256-GCM 加密/解密
│   ├── PasswordService.ts     # 密码验证、会话管理、锁定机制
│   ├── BookmarkService.ts     # 书签 CRUD、文件夹、标签、搜索
│   └── ImportExportService.ts # HTML/JSON 导入导出
├── storage/             # 存储层抽象（chrome.storage.local / 文件系统）
├── types/               # TypeScript 类型定义
└── manifest.json        # Chrome 扩展配置
```

## E2E 测试结构

```
e2e/
├── fixtures/extension.ts      # 扩展加载 fixture（持久化上下文）
├── helpers/
│   ├── chrome-storage.ts      # Chrome Storage 操作辅助函数
│   └── selectors.ts           # 页面选择器常量
├── tests/
│   ├── popup/                 # Popup 页面测试（解锁/锁定/密码/书签）
│   ├── options/               # Options 页面测试（导航/设置/导入导出）
│   └── integration/           # 集成测试（消息通信/状态同步）
└── playwright.config.ts
```

### E2E 关键约束

- 必须先 `npm run build` 构建产物到 `dist/`
- 扩展需使用 `chromium.launchPersistentContext` 加载（headless 不支持）
- 每个 test 前清空 `chrome.storage.local` 实现隔离
- `workers: 1` 避免并行冲突

## 文档结构

| 文件 | 用途 |
|------|------|
| `README.md` | 项目概览、特性列表、安装指南 |
| `CHANGELOG.md` | 版本变更记录（Keep a Changelog 格式） |
| `docs/QUICKSTART.md` | 用户快速使用指南 |
| `PRD/` | 产品需求文档目录 |

## 安全机制要点

- 密钥仅存内存，锁定后立即清除
- 防暴力破解：3 次失败锁 30s，5 次锁 5min
- 自动锁定：浏览器空闲 15 分钟
- SHA-256 校验数据完整性
- 零明文存储

## 常用命令

```bash
npm run dev           # 开发模式（热重载）
npm run build         # 生产构建
npm run type-check    # 类型检查
npm run lint          # ESLint 检查
npm run test:e2e      # 构建 + 运行 E2E 测试
npm run test:e2e:ui   # 构建 + Playwright UI 模式
```
