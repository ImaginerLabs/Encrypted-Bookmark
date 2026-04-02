# 书签核心业务层 API 文档

## 概述

书签核心业务层包含三个核心服务:
- **BookmarkService** - 书签管理服务
- **FolderService** - 文件夹管理服务
- **TagService** - 标签管理服务

所有服务都基于存储层抽象接口，支持加密存储，确保数据安全。

---

## 架构设计

### 数据流程

```
UI 层 (Popup/Options)
    ↓
业务服务层 (BookmarkService/FolderService/TagService)
    ↓
加密服务 (EncryptionService)
    ↓
存储适配器 (IStorageAdapter - Chrome/FileSystem)
```

### 依赖关系

- **BookmarkService** 依赖：
  - 存储适配器 (IStorageAdapter)
  - 加密服务 (EncryptionService)
  - 主密钥 (由 PasswordService 提供)

- **FolderService** 依赖：
  - 文件夹存储适配器
  - 书签存储适配器（用于级联操作）
  - 加密服务
  - 主密钥

- **TagService** 依赖：
  - 标签存储适配器
  - 书签存储适配器（用于关联操作）
  - 加密服务
  - 主密钥

---

## 一、BookmarkService - 书签管理服务

### 初始化

```typescript
import { BookmarkService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

// 创建存储适配器
const storage = new ChromeStorageAdapter('bookmarks');

// 创建书签服务实例
const bookmarkService = new BookmarkService(storage);

// 设置主密钥（由 PasswordService 提供）
bookmarkService.setMasterKey(masterKey);
```

### 核心 API

#### 1. addBookmark - 添加书签

```typescript
const result = await bookmarkService.addBookmark({
  title: 'GitHub',
  url: 'https://github.com',
  folderId: 'folder-123', // 可选，默认为"未分类"
  tags: ['tag-1', 'tag-2'], // 可选
  note: '开发平台' // 可选
});

if (result.success) {
  console.log('添加成功:', result.data);
} else {
  console.error('添加失败:', result.error);
  if (result.validationErrors) {
    result.validationErrors.forEach(err => {
      console.error(`${err.field}: ${err.message}`);
    });
  }
}
```

**数据校验规则**:
- 标题：1-200字符，不能为空
- URL：必须是 http/https 协议
- 重复URL：仅提示，不强制拦截
- XSS防护：自动转义 HTML 特殊字符

#### 2. deleteBookmark - 删除书签（支持撤销）

```typescript
// 删除书签（标记删除，5秒内可撤销）
const result = await bookmarkService.deleteBookmark('bookmark-id');

if (result.success) {
  console.log('删除成功，5秒内可撤销');
  console.log('删除时间:', result.data.deleteTime);
  console.log('剩余时间:', result.data.remainingTime, 'ms');
}
```

**撤销机制**:
- 删除时仅标记 `isDeleted=true`
- 5秒倒计时，期间可调用 `undoDelete()` 撤销
- 5秒后自动永久删除（从存储中移除）

#### 3. undoDelete - 撤销删除

```typescript
const result = await bookmarkService.undoDelete('bookmark-id');

if (result.success) {
  console.log('撤销成功，书签已恢复:', result.data);
} else {
  console.error('撤销失败:', result.error);
}
```

#### 4. editBookmark - 编辑书签

```typescript
const result = await bookmarkService.editBookmark('bookmark-id', {
  title: '新标题',
  url: 'https://new-url.com',
  folderId: 'new-folder-id',
  tags: ['tag-1', 'tag-3'],
  note: '更新备注'
});

if (result.success) {
  console.log('编辑成功:', result.data);
}
```

**注意**: 所有字段都是可选的，只更新传入的字段。

#### 5. getBookmarks - 查询书签

```typescript
// 查询所有书签（默认不含已删除）
const result = await bookmarkService.getBookmarks();

// 按文件夹筛选
const result = await bookmarkService.getBookmarks({
  folderId: 'folder-123'
});

// 按标签筛选（AND逻辑）
const result = await bookmarkService.getBookmarks({
  tagIds: ['tag-1', 'tag-2'] // 同时包含这两个标签
});

// 搜索（匹配标题或URL）
const result = await bookmarkService.getBookmarks({
  searchText: 'github'
});

// 分页查询
const result = await bookmarkService.getBookmarks({
  limit: 500,
  offset: 0
});

// 排序
const result = await bookmarkService.getBookmarks({
  sortBy: 'createTime', // 'createTime' | 'updateTime' | 'title' | 'visitCount'
  sortOrder: 'desc' // 'asc' | 'desc'
});

// 组合查询
const result = await bookmarkService.getBookmarks({
  folderId: 'folder-123',
  tagIds: ['tag-1'],
  searchText: 'github',
  sortBy: 'createTime',
  sortOrder: 'desc',
  limit: 500,
  offset: 0
});
```

#### 6. getBookmarkById - 获取单个书签

```typescript
const result = await bookmarkService.getBookmarkById('bookmark-id');

if (result.success) {
  console.log('书签详情:', result.data);
}
```

#### 7. incrementVisitCount - 增加访问次数

```typescript
// 用户点击书签时调用
await bookmarkService.incrementVisitCount('bookmark-id');
```

#### 8. getPendingDeletes - 获取待删除列表

```typescript
// 用于UI显示撤销倒计时
const result = await bookmarkService.getPendingDeletes();

if (result.success) {
  result.data.forEach(info => {
    console.log(`书签 ${info.bookmarkId} 剩余 ${info.remainingTime}ms 可撤销`);
  });
}
```

---

## 二、FolderService - 文件夹管理服务

### 初始化

```typescript
import { FolderService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

// 创建存储适配器
const folderStorage = new ChromeStorageAdapter('folders');
const bookmarkStorage = new ChromeStorageAdapter('bookmarks');

// 创建文件夹服务实例
const folderService = new FolderService(folderStorage, bookmarkStorage);

// 设置主密钥
folderService.setMasterKey(masterKey);
```

### 核心 API

#### 1. createFolder - 创建文件夹

```typescript
const result = await folderService.createFolder({
  name: '工作',
  parentId: null, // V1.0 暂不支持多级文件夹
  sort: 10 // 可选，默认为列表长度
});

if (result.success) {
  console.log('创建成功:', result.data);
}
```

**数据校验规则**:
- 名称：1-50字符，不能为空
- 名称唯一性：不允许重名
- XSS防护：自动转义

#### 2. deleteFolder - 删除文件夹

```typescript
// 删除文件夹（书签自动迁移至"未分类"）
const result = await folderService.deleteFolder('folder-id');

if (result.success) {
  console.log('删除成功');
  console.log('成功迁移书签数:', result.data.successCount);
  console.log('失败数:', result.data.failedCount);
}
```

**特殊规则**:
- 默认"未分类"文件夹（ID: `uncategorized`）不可删除
- 删除时，所有书签自动迁移至"未分类"
- 支持大量书签（1000+）迁移

#### 3. renameFolder - 重命名文件夹

```typescript
const result = await folderService.renameFolder('folder-id', '新名称');

if (result.success) {
  console.log('重命名成功:', result.data);
}
```

#### 4. getFolders - 获取所有文件夹

```typescript
const result = await folderService.getFolders();

if (result.success) {
  console.log('文件夹列表:', result.data);
  // 已按 sort 字段排序
}
```

#### 5. getDefaultFolder - 获取默认文件夹

```typescript
const result = await folderService.getDefaultFolder();

if (result.success) {
  console.log('默认文件夹:', result.data);
  // ID 固定为 'uncategorized'
}
```

#### 6. getFolderById - 获取指定文件夹

```typescript
const result = await folderService.getFolderById('folder-id');
```

#### 7. moveBooksToFolder - 批量移动书签

```typescript
const result = await folderService.moveBooksToFolder(
  ['bookmark-1', 'bookmark-2', 'bookmark-3'],
  'target-folder-id'
);

if (result.success) {
  console.log('成功移动:', result.data.successCount);
  console.log('失败:', result.data.failedCount);
  if (result.data.failedIds) {
    console.log('失败ID列表:', result.data.failedIds);
  }
}
```

#### 8. getFolderBookmarkCount - 获取文件夹书签数量

```typescript
const result = await folderService.getFolderBookmarkCount('folder-id');

if (result.success) {
  console.log('书签数量:', result.data);
}
```

---

## 三、TagService - 标签管理服务

### 初始化

```typescript
import { TagService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

// 创建存储适配器
const tagStorage = new ChromeStorageAdapter('tags');
const bookmarkStorage = new ChromeStorageAdapter('bookmarks');

// 创建标签服务实例
const tagService = new TagService(tagStorage, bookmarkStorage);

// 设置主密钥
tagService.setMasterKey(masterKey);
```

### 核心 API

#### 1. addTag - 添加标签

```typescript
const result = await tagService.addTag({
  name: '前端',
  color: 'blue' // 可选，预设7种颜色：red/blue/green/yellow/purple/orange/pink
});

if (result.success) {
  console.log('添加成功:', result.data);
}
```

**数据校验规则**:
- 名称：2-20字符
- 名称唯一性：如已存在，返回已有标签（复用）
- 颜色：7种预设颜色，默认为 blue

**预设颜色映射**:
```typescript
{
  red: '#F44336',
  blue: '#2196F3',
  green: '#4CAF50',
  yellow: '#FFEB3B',
  purple: '#9C27B0',
  orange: '#FF9800',
  pink: '#E91E63'
}
```

#### 2. deleteTag - 删除标签

```typescript
// 删除标签（从所有书签移除）
const result = await tagService.deleteTag('tag-id');

if (result.success) {
  console.log('删除成功');
  console.log('影响的书签数:', result.data.affectedBookmarks);
}
```

#### 3. getTags - 获取所有标签

```typescript
const result = await tagService.getTags();

if (result.success) {
  console.log('标签列表:', result.data);
  // 已按创建时间排序（最新的在前）
}
```

#### 4. getTagById - 获取指定标签

```typescript
const result = await tagService.getTagById('tag-id');
```

#### 5. getTagsByBookmark - 获取书签的标签

```typescript
const result = await tagService.getTagsByBookmark('bookmark-id');

if (result.success) {
  console.log('书签的标签:', result.data);
}
```

#### 6. getBookmarksByTag - 按标签筛选书签

```typescript
const result = await tagService.getBookmarksByTag('tag-id');

if (result.success) {
  console.log('包含该标签的书签:', result.data);
}
```

#### 7. setTagColor - 设置标签颜色

```typescript
// 使用颜色名称
const result = await tagService.setTagColor('tag-id', 'red');

// 或直接使用HEX值
const result = await tagService.setTagColor('tag-id', '#F44336');
```

#### 8. renameTag - 重命名标签

```typescript
const result = await tagService.renameTag('tag-id', '新名称');
```

#### 9. getTagUsageCount - 获取标签使用统计

```typescript
const result = await tagService.getTagUsageCount('tag-id');

if (result.success) {
  console.log('使用该标签的书签数:', result.data);
}
```

#### 10. getTagsWithUsage - 获取标签及使用统计

```typescript
const result = await tagService.getTagsWithUsage();

if (result.success) {
  result.data.forEach(tag => {
    console.log(`${tag.name}: ${tag.usageCount} 个书签`);
  });
  // 已按使用次数排序（使用多的在前）
}
```

#### 11. getAvailableColors - 获取可用颜色列表

```typescript
const colors = tagService.getAvailableColors();
console.log(colors);
// [
//   { name: 'red', hex: '#F44336' },
//   { name: 'blue', hex: '#2196F3' },
//   ...
// ]
```

---

## 四、错误处理

### Result 统一响应格式

所有服务方法都返回 `Result<T>` 类型:

```typescript
interface Result<T> {
  success: boolean;        // 是否成功
  data?: T;                // 成功时的返回数据
  error?: string;          // 失败时的错误消息
  validationErrors?: ValidationError[]; // 数据校验错误详情
}
```

### 错误类型

1. **StorageError** - 存储错误
   - 应用未解锁
   - 读写失败
   - 容量不足

2. **DataCorruptionError** - 数据损坏错误
   - 解密失败
   - 数据格式错误

3. **ValidationError** - 数据校验错误
   - 字段值不合法
   - 长度超限
   - 格式错误

### 错误处理示例

```typescript
const result = await bookmarkService.addBookmark(input);

if (!result.success) {
  // 处理错误
  console.error('操作失败:', result.error);
  
  // 处理校验错误
  if (result.validationErrors) {
    result.validationErrors.forEach(err => {
      console.error(`字段 ${err.field}: ${err.message}`);
      if (err.actualValue) {
        console.error(`实际值: ${err.actualValue}`);
      }
    });
  }
  
  return;
}

// 处理成功
console.log('操作成功:', result.data);
```

---

## 五、完整使用示例

### 示例 1: 添加书签到指定文件夹并打标签

```typescript
import { BookmarkService, FolderService, TagService } from '@/services';

async function addBookmarkExample() {
  // 1. 创建文件夹
  const folderResult = await folderService.createFolder({ name: '前端开发' });
  if (!folderResult.success) {
    console.error('创建文件夹失败:', folderResult.error);
    return;
  }
  const folderId = folderResult.data.id;

  // 2. 创建标签
  const tagResult = await tagService.addTag({ name: 'React', color: 'blue' });
  if (!tagResult.success) {
    console.error('创建标签失败:', tagResult.error);
    return;
  }
  const tagId = tagResult.data.id;

  // 3. 添加书签
  const bookmarkResult = await bookmarkService.addBookmark({
    title: 'React 官方文档',
    url: 'https://react.dev',
    folderId,
    tags: [tagId],
    note: '学习 React 18 新特性'
  });

  if (!bookmarkResult.success) {
    console.error('添加书签失败:', bookmarkResult.error);
    return;
  }

  console.log('添加成功:', bookmarkResult.data);
}
```

### 示例 2: 删除文件夹并处理书签迁移

```typescript
async function deleteFolderExample() {
  const folderId = 'folder-to-delete';

  // 1. 查看文件夹内的书签数量
  const countResult = await folderService.getFolderBookmarkCount(folderId);
  if (countResult.success) {
    console.log(`文件夹内有 ${countResult.data} 个书签`);
  }

  // 2. 删除文件夹（书签自动迁移）
  const result = await folderService.deleteFolder(folderId);

  if (result.success) {
    console.log(`成功迁移 ${result.data.successCount} 个书签至"未分类"`);
    if (result.data.failedCount > 0) {
      console.warn(`有 ${result.data.failedCount} 个书签迁移失败`);
    }
  }
}
```

### 示例 3: 带撤销功能的删除书签

```typescript
async function deleteWithUndoExample() {
  const bookmarkId = 'bookmark-to-delete';

  // 1. 删除书签
  const result = await bookmarkService.deleteBookmark(bookmarkId);

  if (!result.success) {
    console.error('删除失败:', result.error);
    return;
  }

  console.log('删除成功，5秒内可撤销');

  // 2. 显示倒计时UI
  const undoInfo = result.data;
  let remainingTime = undoInfo.remainingTime;

  const countdown = setInterval(() => {
    remainingTime -= 1000;
    console.log(`剩余 ${remainingTime / 1000} 秒可撤销`);

    if (remainingTime <= 0) {
      clearInterval(countdown);
      console.log('已永久删除');
    }
  }, 1000);

  // 3. 用户点击撤销（假设在3秒时）
  setTimeout(async () => {
    const undoResult = await bookmarkService.undoDelete(bookmarkId);
    
    if (undoResult.success) {
      clearInterval(countdown);
      console.log('撤销成功，书签已恢复');
    }
  }, 3000);
}
```

### 示例 4: 高级搜索与过滤

```typescript
async function advancedSearchExample() {
  // 1. 按文件夹 + 标签 + 搜索关键词查询
  const result = await bookmarkService.getBookmarks({
    folderId: 'work-folder',
    tagIds: ['urgent', 'important'],
    searchText: 'api',
    sortBy: 'updateTime',
    sortOrder: 'desc',
    limit: 50,
    offset: 0
  });

  if (result.success) {
    console.log(`找到 ${result.data.length} 个匹配的书签`);
    result.data.forEach(bookmark => {
      console.log(`- ${bookmark.title}: ${bookmark.url}`);
    });
  }
}
```

### 示例 5: 标签统计与管理

```typescript
async function tagStatsExample() {
  // 1. 获取所有标签及使用统计
  const result = await tagService.getTagsWithUsage();

  if (result.success) {
    console.log('标签使用统计:');
    result.data.forEach(tag => {
      console.log(`- ${tag.name} (${tag.color}): ${tag.usageCount} 个书签`);
    });

    // 2. 删除未使用的标签
    const unusedTags = result.data.filter(tag => tag.usageCount === 0);
    for (const tag of unusedTags) {
      await tagService.deleteTag(tag.id);
      console.log(`已删除未使用的标签: ${tag.name}`);
    }
  }
}
```

---

## 六、性能优化建议

### 1. 大数据量场景（1000+ 书签）

```typescript
// 使用分页查询
async function loadBookmarksWithPagination() {
  const pageSize = 500;
  let offset = 0;
  let allBookmarks = [];

  while (true) {
    const result = await bookmarkService.getBookmarks({
      limit: pageSize,
      offset
    });

    if (!result.success || result.data.length === 0) {
      break;
    }

    allBookmarks = allBookmarks.concat(result.data);
    offset += pageSize;

    if (result.data.length < pageSize) {
      break; // 最后一页
    }
  }

  console.log(`共加载 ${allBookmarks.length} 个书签`);
}
```

### 2. 批量操作

```typescript
// 批量移动书签（更高效）
await folderService.moveBooksToFolder(
  ['id1', 'id2', 'id3', ...], // 一次移动多个
  targetFolderId
);

// 而不是循环调用 editBookmark
```

### 3. 缓存优化

```typescript
// 缓存文件夹和标签列表（变化不频繁）
let cachedFolders: Folder[] | null = null;
let cachedTags: Tag[] | null = null;

async function getFoldersWithCache() {
  if (!cachedFolders) {
    const result = await folderService.getFolders();
    if (result.success) {
      cachedFolders = result.data;
    }
  }
  return cachedFolders;
}

// 数据变更时清除缓存
async function createFolderAndInvalidateCache(input: CreateFolderInput) {
  const result = await folderService.createFolder(input);
  if (result.success) {
    cachedFolders = null; // 清除缓存
  }
  return result;
}
```

---

## 七、安全注意事项

### 1. 主密钥管理

```typescript
// ✅ 正确：由 PasswordService 提供主密钥
const masterKey = await passwordService.unlock(userPassword);
bookmarkService.setMasterKey(masterKey);

// ❌ 错误：不要直接使用用户密码
bookmarkService.setMasterKey(userPassword); // 不安全！
```

### 2. 应用锁定时清除密钥

```typescript
function lockApp() {
  bookmarkService.clearMasterKey();
  folderService.clearMasterKey();
  tagService.clearMasterKey();
  // 清除敏感数据
}
```

### 3. XSS 防护

所有用户输入都会自动转义，但在 UI 显示时仍需注意:

```typescript
// ✅ 安全：使用 textContent
element.textContent = bookmark.title;

// ❌ 危险：使用 innerHTML
element.innerHTML = bookmark.title; // 可能导致 XSS
```

### 4. URL 安全

```typescript
// 服务会自动校验 URL 格式，拒绝 javascript: 等危险协议
const result = await bookmarkService.addBookmark({
  title: 'Test',
  url: 'javascript:alert(1)' // 会被拒绝
});
// result.success === false
```

---

## 八、测试建议

### 单元测试示例

```typescript
import { BookmarkService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

describe('BookmarkService', () => {
  let service: BookmarkService;

  beforeEach(() => {
    const storage = new ChromeStorageAdapter('test-bookmarks');
    service = new BookmarkService(storage);
    service.setMasterKey('test-master-key');
  });

  test('添加书签成功', async () => {
    const result = await service.addBookmark({
      title: 'Test',
      url: 'https://example.com'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeTruthy();
  });

  test('URL格式校验', async () => {
    const result = await service.addBookmark({
      title: 'Test',
      url: 'invalid-url'
    });

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
  });

  test('删除撤销机制', async () => {
    // 添加书签
    const addResult = await service.addBookmark({
      title: 'Test',
      url: 'https://example.com'
    });
    const bookmarkId = addResult.data!.id;

    // 删除书签
    const deleteResult = await service.deleteBookmark(bookmarkId);
    expect(deleteResult.success).toBe(true);

    // 撤销删除
    const undoResult = await service.undoDelete(bookmarkId);
    expect(undoResult.success).toBe(true);

    // 验证恢复
    const getResult = await service.getBookmarkById(bookmarkId);
    expect(getResult.success).toBe(true);
  });
});
```

---

## 九、常见问题 (FAQ)

### Q1: 如何处理多个存储适配器？

```typescript
// 每种数据类型使用独立的存储适配器
const bookmarkStorage = new ChromeStorageAdapter('bookmarks');
const folderStorage = new ChromeStorageAdapter('folders');
const tagStorage = new ChromeStorageAdapter('tags');

const bookmarkService = new BookmarkService(bookmarkStorage);
const folderService = new FolderService(folderStorage, bookmarkStorage);
const tagService = new TagService(tagStorage, bookmarkStorage);
```

### Q2: 如何切换存储方式（Chrome ↔ FileSystem）？

```typescript
// 使用 Chrome Storage
const chromeAdapter = new ChromeStorageAdapter('bookmarks');
const service = new BookmarkService(chromeAdapter);

// 切换到 FileSystem
const fileAdapter = new FileSystemAdapter('/path/to/bookmarks.dat');
const service = new BookmarkService(fileAdapter);

// 服务层代码无需修改，存储层透明切换
```

### Q3: 删除定时器会影响性能吗？

不会。删除定时器使用 `Map` 存储，只有待删除的书签才会占用内存。正常使用场景下，同时存在的删除操作不会超过10个。

### Q4: 并发操作如何处理？

采用**最后写入生效**策略。如果多个窗口同时编辑同一书签，最后保存的会覆盖之前的修改。建议在 UI 层提示用户数据已变更。

### Q5: 如何备份数据？

```typescript
// 导出所有数据
const bookmarksResult = await bookmarkService.getBookmarks();
const foldersResult = await folderService.getFolders();
const tagsResult = await tagService.getTags();

const backup = {
  bookmarks: bookmarksResult.data,
  folders: foldersResult.data,
  tags: tagsResult.data,
  timestamp: Date.now()
};

// 保存为JSON文件
const json = JSON.stringify(backup, null, 2);
// ...
```

---

## 十、更新日志

### V1.0 (当前版本)
- ✅ 书签增删改查
- ✅ 文件夹管理（一级）
- ✅ 标签管理
- ✅ 删除撤销机制（5秒）
- ✅ XSS防护
- ✅ URL校验
- ✅ 数据加密存储

### V1.1 (计划中)
- 🔲 多级文件夹
- 🔲 书签拖拽排序
- 🔲 批量操作优化
- 🔲 搜索历史
- 🔲 书签导入导出

---

**文档版本**: V1.0  
**最后更新**: 2025-03-29  
**维护者**: Encrypted Bookmark Team
