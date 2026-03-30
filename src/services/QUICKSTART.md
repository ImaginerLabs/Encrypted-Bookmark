# Task 3 - 书签核心业务层快速开始

## 🚀 快速上手

### 1. 导入服务

```typescript
import { BookmarkService, FolderService, TagService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';
```

### 2. 初始化服务

```typescript
// 创建存储适配器
const bookmarkStorage = new ChromeStorageAdapter();
const folderStorage = new ChromeStorageAdapter();
const tagStorage = new ChromeStorageAdapter();

// 初始化服务
const bookmarkService = new BookmarkService(bookmarkStorage);
const folderService = new FolderService(folderStorage, bookmarkStorage);
const tagService = new TagService(tagStorage, bookmarkStorage);

// 设置主密钥（由 PasswordService 提供）
const masterKey = 'your-master-key'; // 实际使用时从 PasswordService 获取
bookmarkService.setMasterKey(masterKey);
folderService.setMasterKey(masterKey);
tagService.setMasterKey(masterKey);
```

### 3. 添加书签

```typescript
const result = await bookmarkService.addBookmark({
  title: 'GitHub',
  url: 'https://github.com',
  note: '代码托管平台'
});

if (result.success) {
  console.log('添加成功:', result.data);
} else {
  console.error('添加失败:', result.error);
}
```

### 4. 创建文件夹

```typescript
const folderResult = await folderService.createFolder({
  name: '前端开发'
});

if (folderResult.success) {
  const folderId = folderResult.data.id;
  
  // 添加书签到文件夹
  await bookmarkService.addBookmark({
    title: 'React',
    url: 'https://react.dev',
    folderId
  });
}
```

### 5. 添加标签

```typescript
const tagResult = await tagService.addTag({
  name: 'React',
  color: 'blue'
});

if (tagResult.success) {
  const tagId = tagResult.data.id;
  
  // 添加带标签的书签
  await bookmarkService.addBookmark({
    title: 'React 文档',
    url: 'https://react.dev',
    tags: [tagId]
  });
}
```

### 6. 查询书签

```typescript
// 查询所有书签
const allResult = await bookmarkService.getBookmarks();

// 按文件夹查询
const folderResult = await bookmarkService.getBookmarks({
  folderId: 'folder-id'
});

// 按标签查询
const tagResult = await bookmarkService.getBookmarks({
  tagIds: ['tag-1', 'tag-2']
});

// 搜索
const searchResult = await bookmarkService.getBookmarks({
  searchText: 'react'
});

// 分页
const pageResult = await bookmarkService.getBookmarks({
  limit: 500,
  offset: 0
});
```

### 7. 删除与撤销

```typescript
// 删除书签（5秒内可撤销）
const deleteResult = await bookmarkService.deleteBookmark('bookmark-id');

if (deleteResult.success) {
  console.log('5秒内可撤销');
  
  // 3秒后撤销
  setTimeout(async () => {
    const undoResult = await bookmarkService.undoDelete('bookmark-id');
    if (undoResult.success) {
      console.log('撤销成功');
    }
  }, 3000);
}
```

## 📚 完整文档

- **API文档**: `src/services/README.md`
- **使用示例**: `src/services/examples.ts`
- **类型定义**: `src/types/bookmark.ts`
- **完成报告**: `src/services/TASK3_COMPLETION_REPORT.md`

## ⚠️ 注意事项

1. **主密钥管理**: 必须先调用 `setMasterKey()` 才能使用服务
2. **错误处理**: 所有方法返回 `Result<T>` 类型，需检查 `success` 字段
3. **数据校验**: 输入数据会自动校验，校验失败时 `validationErrors` 字段包含详情
4. **XSS防护**: 所有用户输入会自动HTML转义

## 🎯 下一步

查看完整文档 `src/services/README.md` 了解更多高级用法和最佳实践。
