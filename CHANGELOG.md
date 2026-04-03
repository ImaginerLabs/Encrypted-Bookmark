# Changelog

本文件记录 Encrypted Bookmark 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

---

## [1.1.0] - 2026-04-03

### Added
- **文件夹管理增强**：文件夹右键菜单支持重命名和删除操作
- **文件夹行内编辑重命名**：右键选择重命名后直接在列表中编辑文件夹名称，支持 Enter 确认 / Escape 取消
- **文件夹删除确认弹窗**：删除文件夹时显示影响书签数量，确认后书签自动迁移至「未分类」
- **新建文件夹入口**：文件夹列表底部新增「+ 新建文件夹」按钮
- **侧边栏标签视图**：左侧侧边栏支持「文件夹」和「标签」Tab 切换
- **标签删除功能**：右键标签可删除，自动从关联书签中移除
- **标签使用统计展示**：标签列表中每个标签显示关联书签数量
- **通用确认弹窗组件**（ConfirmDialog）：用于文件夹/标签删除等危险操作的二次确认
- **行内编辑组件**（InlineEdit）：用于文件夹重命名的行内编辑交互
- **侧边栏 Tab 组件**（SidebarTabs）：文件夹与标签视图切换
- **新增 Hooks**：useTags、useFolderActions、useTagActions、useLockSettings

### Changed
- **自动锁定时间全局统一**：Background Service Worker 动态读取用户设置的 autoLockMinutes，移除硬编码 15 分钟默认值
- **设置变更实时同步**：新增 chrome.storage.onChanged 监听器，Options 修改锁定时间后 Background 和 Popup 实时生效，无需重启浏览器
- **LockService 默认值统一**：DEFAULT_LOCK_MINUTES 统一为 15 分钟，与 SettingsService 保持一致
- **Popup UI 现代化重构**：整体布局重构为顶部标题栏 + 搜索栏 + 侧边栏 + 书签列表 + 底部状态栏
- **Indigo 主色调设计系统**：统一采用 Indigo 600 (#4F46E5) 作为品牌色，规范色彩、圆角、间距、字体体系
- **解锁页面品牌化 UI**：居中布局、品牌 Logo、现代化输入框样式
- **书签卡片标签显示优化**：标签显示真实名称和颜色（替代原 ID 显示）
- **搜索框 UI 优化**：添加搜索图标前缀，增加 focus 视觉反馈
- **右键菜单样式统一**：ContextMenu 增加图标，统一视觉风格

### Fixed
- **ContextMenu 右键菜单事件竞态问题**：修复多个右键菜单同时触发时的事件冲突

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
