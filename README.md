# 🔐 Private BookMark

> 本地优先、隐私至上的浏览器书签管理插件

## 📋 项目简介

Private BookMark 是一个注重隐私保护的 Chrome 浏览器书签管理插件，采用 AES-256-GCM 加密算法保护用户数据，所有数据完全存储在本地，零网络请求。

## ✨ 核心特性

- ✅ **AES-256-GCM 加密** - 军事级别加密算法
- ✅ **PBKDF2 密钥派生** - 100000 次迭代增强安全性
- ✅ **本地存储** - 数据完全存储在 chrome.storage.local
- ✅ **零网络请求** - 无任何外部数据传输
- ✅ **密码保护** - 主密码验证机制
- ✅ **防暴力破解** - 失败次数锁定机制（3次→30s，5次→5min）
- ✅ **数据完整性校验** - SHA-256 校验和

## 🛠️ 技术栈

### 核心框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

### 加密方案
- **Web Crypto API** - 原生加密（AES-256-GCM）
- **PBKDF2** - 密钥派生函数
- **SHA-256** - 哈希和校验

### 浏览器 API
- **Chrome Storage API** - 本地数据存储
- **Chrome Idle API** - 自动锁定
- **Manifest V3** - 最新规范

## 📦 安装

### 开发环境
```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build
```

### 加载到浏览器
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目 `dist` 目录

## 📁 项目结构

```
PrivateBookMark/
├── src/
│   ├── background/          # Background Service Worker
│   │   └── index.ts
│   ├── popup/              # 弹出窗口
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   ├── options/            # 设置页面
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   ├── services/           # 核心服务
│   │   ├── EncryptionService.ts   # 加密服务
│   │   └── PasswordService.ts     # 密码管理
│   ├── types/              # 类型定义
│   │   ├── data.ts         # 数据结构
│   │   ├── errors.ts       # 错误类型
│   │   └── index.ts
│   └── manifest.json       # 插件配置
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔒 安全机制

### 1. 加密流程
```
用户密码 → PBKDF2(100000次) → 派生密钥 → AES-256-GCM → 加密数据
```

### 2. 数据结构
```typescript
interface EncryptedData {
  version: number;        // 版本号
  salt: string;          // 盐值（Base64）
  iv: string;            // 初始化向量（Base64）
  ciphertext: string;    // 密文（Base64）
  checksum: string;      // SHA-256 校验和（Base64）
}
```

### 3. 锁定机制
- **3 次失败** → 锁定 30 秒
- **5 次失败** → 锁定 5 分钟
- **浏览器空闲 15 分钟** → 自动锁定

### 4. 密钥管理
- 密钥仅存储在内存中
- 锁定后立即清除
- 不写入任何持久化存储

## 🎯 Task1 完成内容

### ✅ 已实现功能
1. **项目基础架构**
   - ✅ React 18 + TypeScript + Vite 配置
   - ✅ Manifest V3 规范
   - ✅ 目录结构规划

2. **加密服务 (EncryptionService)**
   - ✅ AES-256-GCM 加密/解密
   - ✅ PBKDF2 密钥派生（100000 次迭代）
   - ✅ Base64 编解码
   - ✅ SHA-256 哈希和校验

3. **密码管理服务 (PasswordService)**
   - ✅ 密码设置/验证
   - ✅ 密码强度校验（8-32 字符）
   - ✅ 失败次数计数和锁定机制
   - ✅ 密钥内存管理

4. **数据类型定义**
   - ✅ Bookmark / Folder / Tag 类型
   - ✅ EncryptedData 类型
   - ✅ 自定义错误类型体系

5. **UI 界面**
   - ✅ Popup 页面（密码设置/解锁）
   - ✅ Options 页面（密码管理/设置）
   - ✅ 错误提示和用户反馈

6. **Background Script**
   - ✅ Service Worker 配置
   - ✅ 消息通信机制
   - ✅ 自动锁定功能

## 🚀 使用指南

### 首次使用
1. 点击浏览器工具栏的插件图标
2. 设置主密码（8-32 位字符）
3. 点击「设置密码」完成初始化

### 解锁插件
1. 打开插件弹窗
2. 输入主密码
3. 点击「解锁」

### 修改密码
1. 右键插件图标 → 选项
2. 进入「修改主密码」区域
3. 输入当前密码和新密码
4. 点击「修改密码」

### 重置数据
⚠️ **危险操作，不可恢复**
1. 进入选项页面
2. 滚动到「数据管理」区域
3. 点击「重置所有数据」并确认

## 🔧 开发说明

### 类型安全
```typescript
// 所有服务方法都有完整的类型定义
await EncryptionService.encrypt(plaintext, password); // ✅
await PasswordService.verifyMasterPassword(password); // ✅
```

### 错误处理
```typescript
try {
  await PasswordService.verifyMasterPassword(password);
} catch (error) {
  if (error instanceof InvalidPasswordError) {
    console.log('剩余次数:', error.remainingAttempts);
  } else if (error instanceof AccountLockedError) {
    console.log('锁定到:', new Date(error.lockedUntil));
  }
}
```

### 扩展开发
后续 Task 可基于以下服务继续开发：
```typescript
import { EncryptionService, PasswordService } from '@/services';
import type { Bookmark, Folder, Tag } from '@/types';
```

## 📝 待完成功能（后续 Task）

- [ ] 书签 CRUD 功能
- [ ] 文件夹管理
- [ ] 标签系统
- [ ] 搜索和过滤
- [ ] 导入/导出功能
- [ ] 书签同步机制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 👨‍💻 作者

Alex - Private BookMark

---

**⚠️ 安全提示**
- 请牢记主密码，丢失后无法恢复数据
- 建议使用强密码（包含大小写字母、数字、特殊字符）
- 定期备份重要书签数据
