# Changelog

本文件记录 Encrypted Bookmark 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

---

## [1.4.0] - 2026-04-03

### Added
- 侧边栏新增"🕐 稍后再读"虚拟文件夹入口，支持集中查看和管理稍后再读书签
- "稍后再读"入口显示待读书签数量角标
- 底部状态栏上下文感知：选中"稍后再读"时显示"X 个待读书签"
- BookmarkService.getBookmarks() 实现 isReadLater 筛选逻辑
- FolderItem 组件支持自定义图标（icon）和系统文件夹标记（isSystem）

### Changed
- "全部书签"统计数量排除稍后再读书签，各文件夹数量统计同步排除
- 开启"稍后再读"开关时自动隐藏文件夹选择器（互斥逻辑），关闭时恢复
- ContextMenu 边界检测增强：使用 popup-container 的 getBoundingClientRect() 替代 window.innerHeight，防止菜单溢出和滚动条

### Fixed
- 修复 QuickAddPanel 文件夹下拉列表出现两个"未分类"的问题
- 修复书签右键菜单在 Popup 底部区域溢出导致出现滚动条的问题

---

## [1.3.1] - 2026-04-03

### Fixed
- 修复文件夹 Hooks（useFolders/useFolderActions）中 ChromeStorageAdapter 实例化错误，folderStorage 误用默认书签存储键导致文件夹映射紊乱和空名称文件夹问题
- 修复标签 Hooks（useTags/useTagActions）中 ChromeStorageAdapter 实例化错误，tagStorage 误用默认书签存储键
- 修复侧边栏书签数量统计基于筛选结果而非全量数据的问题，选中文件夹或搜索时数量不再变化
- 修复侧边栏「未分类」默认文件夹与「全部书签」重复显示的问题
- 统一所有 Hooks 中 ChromeStorageAdapter 使用工厂方法（getInstance/getFolderInstance/getTagInstance）

---

## [1.3.0] - 2026-04-03

### Fixed
- 修复 Options 设置页侧边栏宽度不足导致插件名"Encrypted Bookmark"换行的问题（240px → 260px）
- 修复 Popup 添加书签按钮"+"号未水平垂直居中的问题（改用 CSS 伪元素绘制十字图形）

### Added
- Popup 快速添加面板新增"稍后再读"Toggle 开关，收藏书签时可标记为稍后再读
- 书签数据模型新增 `isReadLater` 可选字段，支持"稍后再读"标记

---

## [1.2.0] - 2026-04-03

### Changed
- 优化 Options 页面分割线：移除 `.settings-section` 冗余 `border-bottom`，`.panel-actions` 和 `.section-divider` 颜色降级为 `#F3F4F6`，移除 `.sidebar-header` 冗余分割线
- 优化 Popup 弹窗分割线：标题栏、搜索栏、底部栏的硬分割线替换为轻量 `box-shadow`，侧边栏分割线颜色降级
- 重构 Options 详情页布局：侧边栏从 `position: fixed` 改为 `sticky`，内容区改为 Flex 自适应布局
- Options 面板宽度自适应：使用 `clamp()` 和 `min()` 实现渐进增强的响应式宽度
- Options 垂直高度自适应：内容区支持自然撑开和滚动
- 完善响应式断点：新增 1024px 中等屏幕断点，优化 768px 以下移动端适配

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
