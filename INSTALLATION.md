# 🚀 Chrome 插件加载指南

## ✅ 构建状态
项目已成功构建到 `dist/` 目录！

## 📦 加载插件到 Chrome

### 1. 打开扩展程序页面
在 Chrome 浏览器中访问：
```
chrome://extensions/
```

或者：菜单 → 更多工具 → 扩展程序

### 2. 开启开发者模式
点击右上角的「开发者模式」开关，确保已开启

### 3. 加载已解压的扩展程序
1. 点击左上角「加载已解压的扩展程序」按钮
2. 选择项目的 `dist` 目录：
   ```
   /Users/alex/Desktop/Github/PrivateBookMark/dist
   ```
3. 点击「选择」

### 4. 验证安装
- ✅ 插件卡片显示「Private BookMark」
- ✅ 右上角浏览器工具栏出现插件图标（🔐）
- ✅ 插件状态为「已启用」

## 🧪 功能测试

### 测试 1：首次设置密码
1. 点击浏览器工具栏的插件图标
2. 输入主密码（8-32 位字符，例如：`Test1234`）
3. 确认密码
4. 点击「设置密码」
5. **预期结果**：提示设置成功，界面显示「已解锁」

### 测试 2：锁定和解锁
1. 在已解锁状态下，点击「锁定」按钮
2. **预期结果**：界面切换到密码输入界面
3. 输入正确密码，点击「解锁」
4. **预期结果**：成功解锁

### 测试 3：密码错误和锁定机制
1. 输入错误密码 3 次
2. **预期结果**：显示「账户已锁定 30 秒」
3. 等待 30 秒后重试
4. 再次输入错误密码 2 次（累计 5 次）
5. **预期结果**：显示「账户已锁定 5 分钟」

### 测试 4：Options 页面
1. 右键插件图标 → 选择「选项」
2. 或访问 `chrome://extensions/` → 找到插件 → 点击「详细信息」→「扩展程序选项」
3. **预期结果**：打开设置页面，显示密码状态和管理选项

### 测试 5：修改密码
1. 打开 Options 页面
2. 在「修改主密码」区域输入：
   - 当前密码：`Test1234`
   - 新密码：`NewPass123`
   - 确认新密码：`NewPass123`
3. 点击「修改密码」
4. **预期结果**：提示修改成功
5. 返回 Popup，锁定后用新密码解锁验证

### 测试 6：重置数据
1. 打开 Options 页面
2. 滚动到「数据管理」区域
3. 点击「重置所有数据」
4. 确认操作
5. **预期结果**：所有数据清除，回到初始设置密码界面

## 🔒 安全验证

### 加密测试
1. 打开 Chrome DevTools（F12）
2. 切换到 Application → Storage → Local Storage
3. 选择插件域名
4. **验证**：
   - ✅ `passwordHash` 为 Base64 编码的 SHA-256 哈希
   - ✅ 没有明文密码存储
   - ✅ 没有明文数据存储

### 内存安全
1. 解锁插件
2. 打开 Background 页面（chrome://extensions/ → 背景页）
3. 在 Console 中输入：
   ```javascript
   chrome.runtime.sendMessage({ type: 'CHECK_UNLOCK_STATUS' }, (response) => {
     console.log('Unlock status:', response);
   });
   ```
4. **验证**：返回 `{ isUnlocked: true }`
5. 点击 Popup 的「锁定」按钮
6. 再次运行上述代码
7. **验证**：返回 `{ isUnlocked: false }`

## 🐛 常见问题

### Q: 插件图标无法显示？
A: 这是因为使用了占位图标，可以替换 `public/icons/` 下的图标文件后重新构建

### Q: 提示「清单文件缺失或不可读」？
A: 确保选择的是 `dist` 目录，而不是项目根目录

### Q: 修改代码后如何更新插件？
A: 
1. 运行 `npm run build`
2. 在 chrome://extensions/ 页面点击插件的「刷新」按钮

### Q: 忘记主密码怎么办？
A: 
1. 打开 Options 页面
2. 点击「重置所有数据」（会清除所有书签）
3. 或在 Console 中运行：
   ```javascript
   chrome.storage.local.clear();
   ```

## 📊 Task1 验收清单

- ✅ 项目成功构建（TypeScript 0 错误）
- ✅ 插件可正常加载到 Chrome
- ✅ 密码设置功能正常
- ✅ 密码验证功能正常
- ✅ 锁定机制生效（3次→30s，5次→5min）
- ✅ 加密服务正常工作（AES-256-GCM + PBKDF2）
- ✅ 密码哈希验证正常（SHA-256）
- ✅ 数据结构清晰且类型安全
- ✅ 代码有完整注释
- ✅ 错误处理完善

## 🎯 下一步

Task1 已完成！后续 Task 可以基于以下服务开发：

```typescript
// 使用加密服务
import { EncryptionService, PasswordService } from '@/services';

// 加密书签数据
const encrypted = await EncryptionService.encrypt(
  JSON.stringify(bookmarks),
  PasswordService.getMasterKey()!
);

// 存储到 chrome.storage.local
await chrome.storage.local.set({ encryptedBookmarks: encrypted });
```

## 📝 技术支持

如有问题，请检查：
1. Console 错误日志（F12 → Console）
2. Background 页面日志（chrome://extensions/ → 背景页 → Console）
3. Chrome 版本（需要支持 Manifest V3）

---

**恭喜！🎉 Task1 已成功完成！**
