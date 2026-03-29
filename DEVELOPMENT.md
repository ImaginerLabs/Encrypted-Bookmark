# 📚 开发文档

## 项目架构

### 目录结构
```
src/
├── background/           # Service Worker（后台脚本）
│   └── index.ts         # 消息处理、自动锁定
├── popup/               # 弹出窗口（主界面）
│   ├── index.html       # HTML 入口
│   ├── index.tsx        # React 入口
│   ├── App.tsx          # 主组件（密码设置/解锁）
│   ├── App.css          # 样式
│   └── index.css        # 全局样式
├── options/             # 设置页面
│   ├── index.html
│   ├── index.tsx
│   ├── App.tsx          # 设置组件（密码管理）
│   ├── App.css
│   └── index.css
├── services/            # 核心服务层
│   ├── EncryptionService.ts  # 加密服务
│   ├── PasswordService.ts    # 密码管理服务
│   └── index.ts
├── types/               # TypeScript 类型定义
│   ├── data.ts          # 数据结构
│   ├── errors.ts        # 自定义错误类型
│   └── index.ts
└── manifest.json        # Chrome 插件配置
```

## 核心服务 API

### EncryptionService

基于 Web Crypto API 的加密服务

#### encrypt(plaintext, password)
加密数据
```typescript
const encrypted = await EncryptionService.encrypt(
  JSON.stringify(data),
  password
);
// 返回：EncryptedData { version, salt, iv, ciphertext, checksum }
```

#### decrypt(encryptedData, password)
解密数据
```typescript
const plaintext = await EncryptionService.decrypt(
  encryptedData,
  password
);
const data = JSON.parse(plaintext);
```

#### hashPassword(password)
计算密码哈希（SHA-256）
```typescript
const hash = await EncryptionService.hashPassword('myPassword');
```

#### verifyPasswordHash(password, hash)
验证密码哈希
```typescript
const isValid = await EncryptionService.verifyPasswordHash(
  'myPassword',
  storedHash
);
```

### PasswordService

密码管理和验证服务

#### setMasterPassword(password)
设置主密码（首次使用）
```typescript
await PasswordService.setMasterPassword('MySecurePass123');
```

#### verifyMasterPassword(password)
验证主密码
```typescript
try {
  await PasswordService.verifyMasterPassword('MySecurePass123');
  console.log('验证成功');
} catch (error) {
  if (error instanceof InvalidPasswordError) {
    console.log('剩余次数:', error.remainingAttempts);
  } else if (error instanceof AccountLockedError) {
    console.log('锁定到:', new Date(error.lockedUntil));
  }
}
```

#### getMasterKey()
获取内存中的密钥（已解锁时）
```typescript
const key = PasswordService.getMasterKey();
if (key) {
  // 使用密钥进行加密操作
}
```

#### isUnlocked()
检查是否已解锁
```typescript
if (PasswordService.isUnlocked()) {
  // 执行需要授权的操作
}
```

#### lock()
锁定（清除内存中的密钥）
```typescript
PasswordService.lock();
```

#### changeMasterPassword(oldPassword, newPassword)
修改主密码
```typescript
await PasswordService.changeMasterPassword(
  'OldPass123',
  'NewPass456'
);
```

## 数据类型

### Bookmark
```typescript
interface Bookmark {
  id: string;
  title: string;
  url: string;
  folderId?: string;
  tags?: string[];
  note?: string;
  createTime: number;
  updateTime: number;
  visitCount?: number;
}
```

### Folder
```typescript
interface Folder {
  id: string;
  name: string;
  parentId?: string;
  sort: number;
  createTime: number;
}
```

### Tag
```typescript
interface Tag {
  id: string;
  name: string;
  color: string;  // HEX 格式
  createTime: number;
}
```

### EncryptedData
```typescript
interface EncryptedData {
  version: number;        // 数据版本
  salt: string;          // PBKDF2 盐值（Base64）
  iv: string;            // AES-GCM IV（Base64）
  ciphertext: string;    // 密文（Base64）
  checksum: string;      // SHA-256 校验和（Base64）
}
```

## 错误处理

### 自定义错误类型

```typescript
// 加密错误
throw new EncryptionError('加密失败', details);

// 密码错误
throw new PasswordError('密码相关错误');

// 弱密码
throw new WeakPasswordError('密码强度不足');

// 密码错误（带剩余次数）
throw new InvalidPasswordError('密码错误', 2);

// 账户锁定
throw new AccountLockedError('账户已锁定', Date.now() + 30000);

// 数据损坏
throw new DataCorruptionError('数据校验失败');

// 存储错误
throw new StorageError('存储操作失败', error);
```

### 错误处理模式

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof WeakPasswordError) {
    // 处理弱密码
  } else if (error instanceof InvalidPasswordError) {
    // 处理密码错误
    console.log('剩余次数:', error.remainingAttempts);
  } else if (error instanceof AccountLockedError) {
    // 处理锁定
    console.log('锁定到:', error.lockedUntil);
  } else if (error instanceof AppError) {
    // 处理通用应用错误
    console.log('错误代码:', error.code);
  } else {
    // 处理未知错误
  }
}
```

## Chrome Storage

### 存储结构
```typescript
// chrome.storage.local
{
  passwordHash: string;              // SHA-256 密码哈希
  encryptedBookmarks: EncryptedData; // 加密的书签数据
  encryptedFolders: EncryptedData;   // 加密的文件夹数据
  encryptedTags: EncryptedData;      // 加密的标签数据
  passwordStatus: {
    isSet: boolean;
    failedAttempts: number;
    lockedUntil: number;
  }
}
```

### 读取数据
```typescript
const data = await chrome.storage.local.get(['passwordHash']);
console.log(data.passwordHash);
```

### 写入数据
```typescript
await chrome.storage.local.set({
  passwordHash: hash,
  passwordStatus: status
});
```

## 消息通信

### Background ↔ Popup/Options

#### 发送消息
```typescript
// 从 Popup/Options 发送到 Background
chrome.runtime.sendMessage(
  { type: 'GET_PASSWORD_STATUS' },
  (response) => {
    console.log(response);
  }
);
```

#### 接收消息（Background）
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PASSWORD_STATUS') {
    PasswordService.getPasswordStatus().then(sendResponse);
    return true; // 异步响应
  }
});
```

### 支持的消息类型
- `GET_PASSWORD_STATUS` - 获取密码状态
- `CHECK_UNLOCK_STATUS` - 检查解锁状态
- `LOCK` - 锁定

## 安全最佳实践

### 1. 密钥管理
- ✅ 密钥仅存储在内存中
- ✅ 锁定后立即清除
- ✅ 不写入任何持久化存储
- ❌ 不要在 localStorage 存储密钥
- ❌ 不要在全局变量存储密钥

### 2. 密码处理
- ✅ 使用 SHA-256 存储密码哈希
- ✅ 使用 PBKDF2 派生加密密钥（100000 次迭代）
- ✅ 每次加密使用随机盐值和 IV
- ❌ 不要存储明文密码
- ❌ 不要在日志中输出密码

### 3. 数据加密
- ✅ 所有敏感数据使用 AES-256-GCM 加密
- ✅ 加密后计算校验和
- ✅ 解密后验证校验和
- ❌ 不要存储未加密的书签数据

### 4. 错误处理
- ✅ 使用自定义错误类型
- ✅ 捕获并处理所有异常
- ✅ 向用户提供友好的错误提示
- ❌ 不要在错误消息中泄露敏感信息

## 开发工作流

### 1. 安装依赖
```bash
npm install
```

### 2. 类型检查
```bash
npm run type-check
```

### 3. 开发模式
```bash
npm run dev
# 然后在 chrome://extensions/ 加载 dist 目录
# 修改代码后刷新插件
```

### 4. 生产构建
```bash
npm run build
```

### 5. 调试

#### Popup 调试
1. 点击插件图标打开 Popup
2. 右键 Popup → 检查
3. 在 DevTools 中查看 Console、Network、Storage

#### Background 调试
1. 访问 chrome://extensions/
2. 找到插件 → 点击「背景页」或「Service Worker」
3. 在打开的 DevTools 中查看日志

#### Options 页面调试
1. 右键插件图标 → 选项
2. 打开 DevTools（F12）

## 后续开发指南

### Task2: 书签 CRUD
```typescript
// 示例：添加书签
import { EncryptionService, PasswordService } from '@/services';
import type { Bookmark } from '@/types';

async function addBookmark(bookmark: Bookmark) {
  // 1. 检查是否已解锁
  if (!PasswordService.isUnlocked()) {
    throw new Error('请先解锁');
  }

  // 2. 读取现有数据
  const data = await chrome.storage.local.get(['encryptedBookmarks']);
  let bookmarks: Bookmark[] = [];
  
  if (data.encryptedBookmarks) {
    const plaintext = await EncryptionService.decrypt(
      data.encryptedBookmarks,
      PasswordService.getMasterKey()!
    );
    bookmarks = JSON.parse(plaintext);
  }

  // 3. 添加新书签
  bookmarks.push(bookmark);

  // 4. 加密并存储
  const encrypted = await EncryptionService.encrypt(
    JSON.stringify(bookmarks),
    PasswordService.getMasterKey()!
  );
  
  await chrome.storage.local.set({ encryptedBookmarks: encrypted });
}
```

### Task3: 文件夹和标签
类似书签的 CRUD，使用 `encryptedFolders` 和 `encryptedTags` 字段

### Task4: 搜索和过滤
在内存中对解密后的数据进行搜索，不泄露索引

### Task5: 导入/导出
支持加密导出和明文导出（需二次确认）

## 常用命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check

# 清理构建
rm -rf dist

# 完整重建
rm -rf dist node_modules && npm install && npm run build
```

## 性能优化建议

1. **延迟加载**：大量书签时使用虚拟滚动
2. **缓存**：在内存中缓存解密后的数据
3. **防抖**：搜索输入使用 debounce
4. **分批处理**：大量数据操作时分批进行
5. **索引**：考虑使用 IndexedDB（加密后存储）

## 安全审计清单

- [ ] 密钥不存储在持久化存储
- [ ] 所有敏感数据都已加密
- [ ] 使用强密码策略
- [ ] 实现防暴力破解机制
- [ ] 错误消息不泄露敏感信息
- [ ] 代码中无硬编码密码
- [ ] 无 console.log 输出敏感数据
- [ ] 使用 HTTPS（如有网络请求）

---

**祝开发顺利！** 🚀
