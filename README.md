# 🔐 Encrypted Bookmark

> 本地优先、隐私至上的浏览器书签管理插件

## 📋 项目简介

Encrypted Bookmark 是一个注重隐私保护的 Chrome/Edge 浏览器书签管理插件，采用 AES-256-GCM 加密算法保护用户数据，所有数据完全存储在本地，零网络请求。

## ✨ 核心特性

- 🔒 **AES-256-GCM 加密** - 军事级别加密算法保护书签数据
- 🔑 **PBKDF2 密钥派生** - 100,000 次迭代增强安全性
- 💾 **双存储模式** - 支持插件存储和本地文件系统
- 🚫 **零网络请求** - 无任何外部数据传输，数据完全本地化
- 🔐 **密码保护** - 主密码验证 + 自动锁定机制
- 🛡️ **防暴力破解** - 失败次数锁定机制（3次→30s，5次→5min）
- 📦 **导入导出** - 支持 HTML/JSON 格式书签导入导出
- 📁 **文件夹管理** - 新建、重命名、删除文件夹，书签自动迁移
- 🏷️ **标签管理** - 多标签分类、删除标签、使用统计、侧边栏 Tab 切换
- 🔍 **全文搜索** - 支持按标题、URL、标签搜索
- 🎨 **现代化 UI** - Indigo 主色调设计系统，侧边栏 + 书签列表布局

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite + @crxjs/vite-plugin |
| 加密方案 | Web Crypto API（AES-256-GCM + PBKDF2） |
| 浏览器规范 | Manifest V3 |
| 浏览器 API | Chrome Storage / Tabs / Idle / Bookmarks |

## 📦 安装与构建

### 环境要求
- Node.js >= 18
- npm >= 9

### 开发模式
```bash
# 安装依赖
npm install

# 启动开发服务（热重载）
npm run dev
```

### 生产构建
```bash
npm run build
```

### 加载到浏览器
1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目 `dist` 目录

> 详细使用指南请参考 [docs/QUICKSTART.md](./docs/QUICKSTART.md)

## 📁 项目结构

```
Encrypted-Bookmark/
├── src/
│   ├── background/          # Background Service Worker
│   ├── popup/               # 弹出窗口（主界面）
│   ├── options/             # 设置页面
│   ├── services/            # 核心服务层
│   │   ├── EncryptionService.ts   # 加密/解密服务
│   │   ├── PasswordService.ts     # 密码管理服务
│   │   ├── BookmarkService.ts     # 书签业务服务
│   │   └── ImportExportService.ts # 导入导出服务
│   ├── storage/             # 存储层抽象
│   ├── types/               # TypeScript 类型定义
│   └── manifest.json        # Chrome 插件配置
├── PRD/                     # 产品需求文档
├── docs/                    # 用户文档
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🔒 安全机制

### 加密流程
```
用户密码 → PBKDF2(100,000次迭代) → 256位派生密钥 → AES-256-GCM加密 → Base64编码 → 存储
```

### 安全特性
- **密钥管理**：密钥仅存储在内存中，锁定后立即清除
- **防暴力破解**：3次失败锁定30秒，5次失败锁定5分钟
- **自动锁定**：浏览器空闲自动锁定（可在设置页面配置时间，默认 15 分钟，全局实时同步）
- **数据完整性**：SHA-256 校验和验证数据未被篡改
- **零明文存储**：不存储明文密码，不存储未加密书签

## 📋 功能概览

- 🔐 加密核心 — AES-256-GCM 加密 / PBKDF2 密钥派生
- 💾 双存储模式 — 插件存储 + 本地文件系统
- 📚 书签管理 — 书签 / 文件夹 / 标签 / 全文搜索
- 📁 文件夹管理 — 新建 / 重命名 / 删除文件夹，右键菜单操作，删除时书签自动迁移至「未分类」
- 🏷️ 标签管理 — 侧边栏标签视图 / Tab 切换文件夹与标签 / 标签删除 / 使用统计
- 🛡️ 安全会话 — 密码验证 / 自动锁定（全局统一设置） / 防暴力破解
- 🖥️ Popup 界面 — 现代化 UI（顶部标题栏 + 搜索栏 + 侧边栏 + 书签列表 + 底部状态栏）
- ⚙️ 设置页面 — 路径配置 / 存储切换 / 自动锁定时间配置（实时同步生效）
- 📦 导入导出 — HTML / JSON 格式互转

> 完整的版本变更记录请查看 [CHANGELOG.md](./CHANGELOG.md)

## 📄 许可证

MIT License

## 👨‍💻 作者

Alex - Encrypted Bookmark

---

**⚠️ 安全提示**
- 请牢记主密码，丢失后无法恢复数据
- 建议使用强密码（包含大小写字母、数字、特殊字符）
- 定期使用导出功能备份重要书签数据
