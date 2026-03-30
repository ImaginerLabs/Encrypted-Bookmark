# Changelog

本文件记录 Encrypted Bookmark 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

---

## [1.0.0] - 2026-03-30

### 🎉 首个完整版本发布

所有核心功能开发完成，项目从 PrivateBookMark 正式更名为 **Encrypted Bookmark**。

### 开发里程碑

| 阶段 | 模块 | 说明 |
|------|------|------|
| Task1 | 基础架构与加密核心层 | 项目脚手架搭建、EncryptionService（AES-256-GCM）、PBKDF2 密钥派生、密钥管理 |
| Task2 | 存储层抽象与双存储实现 | StorageProvider 接口抽象、chrome.storage.local 实现、本地文件系统存储实现 |
| Task3 | 书签核心业务层 | 书签 CRUD、文件夹管理、标签系统、全文搜索 |
| Task4 | 安全与会话管理 | 主密码验证、会话状态管理、自动锁定（空闲 15min）、防暴力破解机制 |
| Task5 | UI 交互层与 Popup 实现 | Popup 弹窗界面、React 组件开发、交互逻辑与状态管理 |
| Task6 | 设置页与路径配置 | Options 设置页面、存储路径配置、存储模式切换、密码修改 |
| Task7 | 导入导出与数据迁移 | HTML/JSON 书签导入、加密/明文导出、数据格式转换 |
| Task8 | 文档整理与项目更名 | 项目更名（PrivateBookMark → Encrypted Bookmark）、文档清理与整理、快速使用指南 |

### 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite + @crxjs/vite-plugin
- **加密方案**：Web Crypto API（AES-256-GCM + PBKDF2）
- **浏览器规范**：Manifest V3
- **浏览器 API**：Chrome Storage / Tabs / Idle / Bookmarks
