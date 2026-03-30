/**
 * 书签核心业务层使用示例
 * 展示 BookmarkService、FolderService、TagService 的典型用法
 */

import { BookmarkService, FolderService, TagService } from '@/services';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';
import type { Bookmark } from '@/types/data';

// ============================================
// 1. 初始化服务
// ============================================

async function initializeServices(masterKey: string) {
  // 创建存储适配器（不需要传入参数，会使用默认的存储键名）
  const bookmarkStorage = new ChromeStorageAdapter();
  const folderStorage = new ChromeStorageAdapter();
  const tagStorage = new ChromeStorageAdapter();

  // 初始化服务
  const bookmarkService = new BookmarkService(bookmarkStorage);
  const folderService = new FolderService(folderStorage, bookmarkStorage);
  const tagService = new TagService(tagStorage, bookmarkStorage);

  // 设置主密钥
  bookmarkService.setMasterKey(masterKey);
  folderService.setMasterKey(masterKey);
  tagService.setMasterKey(masterKey);

  return { bookmarkService, folderService, tagService };
}

// ============================================
// 2. 基础操作示例
// ============================================

async function basicBookmarkOperations() {
  const { bookmarkService } = await initializeServices('test-key');

  // 添加书签
  const addResult = await bookmarkService.addBookmark({
    title: 'GitHub',
    url: 'https://github.com',
    note: '代码托管平台'
  });

  if (addResult.success) {
    console.log('✅ 添加成功:', addResult.data!.id);
  } else {
    console.error('❌ 添加失败:', addResult.error);
    return;
  }

  const bookmarkId = addResult.data!.id;

  // 查询书签
  const getResult = await bookmarkService.getBookmarkById(bookmarkId);
  if (getResult.success) {
    console.log('📖 书签详情:', getResult.data);
  }

  // 编辑书签
  const editResult = await bookmarkService.editBookmark(bookmarkId, {
    title: 'GitHub - 新标题',
    note: '更新备注'
  });

  if (editResult.success) {
    console.log('✏️ 编辑成功');
  }

  // 删除书签（带撤销）
  const deleteResult = await bookmarkService.deleteBookmark(bookmarkId);
  if (deleteResult.success) {
    console.log('🗑️ 删除成功，5秒内可撤销');
    console.log(`剩余时间: ${deleteResult.data!.remainingTime}ms`);

    // 3秒后撤销
    setTimeout(async () => {
      const undoResult = await bookmarkService.undoDelete(bookmarkId);
      if (undoResult.success) {
        console.log('↩️ 撤销成功，书签已恢复');
      }
    }, 3000);
  }
}

// ============================================
// 3. 文件夹管理示例
// ============================================

async function folderManagementExample() {
  const { bookmarkService, folderService } = await initializeServices('test-key');

  // 创建文件夹
  const createResult = await folderService.createFolder({
    name: '前端开发',
    sort: 1
  });

  if (!createResult.success) {
    console.error('创建文件夹失败:', createResult.error);
    return;
  }

  const folderId = createResult.data!.id;
  console.log('📁 创建文件夹成功:', folderId);

  // 添加书签到文件夹
  const bookmark1Result = await bookmarkService.addBookmark({
    title: 'React 官方文档',
    url: 'https://react.dev',
    folderId
  });

  const bookmark2Result = await bookmarkService.addBookmark({
    title: 'Vue 官方文档',
    url: 'https://vuejs.org',
    folderId
  });

  if (bookmark1Result.success && bookmark2Result.success) {
    console.log('✅ 添加了2个书签到文件夹');
  }

  // 查询文件夹内书签数量
  const countResult = await folderService.getFolderBookmarkCount(folderId);
  if (countResult.success) {
    console.log(`📊 文件夹内有 ${countResult.data} 个书签`);
  }

  // 删除文件夹（书签迁移至"未分类"）
  const deleteResult = await folderService.deleteFolder(folderId);
  if (deleteResult.success) {
    console.log(`✅ 删除成功，迁移了 ${deleteResult.data!.successCount} 个书签`);
  }
}

// ============================================
// 4. 标签管理示例
// ============================================

async function tagManagementExample() {
  const { bookmarkService, tagService } = await initializeServices('test-key');

  // 创建多个标签
  const reactTag = await tagService.addTag({ name: 'React', color: 'blue' });
  const jsTag = await tagService.addTag({ name: 'JavaScript', color: 'yellow' });
  const tutorialTag = await tagService.addTag({ name: '教程', color: 'green' });

  console.log('🏷️ 创建了3个标签');

  // 添加带标签的书签
  const bookmarkResult = await bookmarkService.addBookmark({
    title: 'React 入门教程',
    url: 'https://react.dev/learn',
    tags: [reactTag.data!.id, jsTag.data!.id, tutorialTag.data!.id]
  });

  if (!bookmarkResult.success) return;
  const bookmarkId = bookmarkResult.data!.id;

  // 查询书签的标签
  const tagsResult = await tagService.getTagsByBookmark(bookmarkId);
  if (tagsResult.success) {
    console.log('📌 书签的标签:');
    tagsResult.data!.forEach(tag => {
      console.log(`  - ${tag.name} (${tag.color})`);
    });
  }

  // 按标签筛选书签
  const filterResult = await tagService.getBookmarksByTag(reactTag.data!.id);
  if (filterResult.success) {
    console.log(`🔍 包含"React"标签的书签: ${filterResult.data!.length} 个`);
  }

  // 获取标签使用统计
  const statsResult = await tagService.getTagsWithUsage();
  if (statsResult.success) {
    console.log('📊 标签使用统计:');
    statsResult.data!.forEach(tag => {
      console.log(`  - ${tag.name}: ${tag.usageCount} 个书签`);
    });
  }
}

// ============================================
// 5. 高级搜索示例
// ============================================

async function advancedSearchExample() {
  const { bookmarkService, folderService, tagService } = await initializeServices('test-key');

  // 准备测试数据
  const folder = await folderService.createFolder({ name: '工作' });
  const urgentTag = await tagService.addTag({ name: '紧急', color: 'red' });

  // 添加多个书签
  await bookmarkService.addBookmark({
    title: 'API 文档 - 紧急查看',
    url: 'https://api.example.com/docs',
    folderId: folder.data!.id,
    tags: [urgentTag.data!.id]
  });

  await bookmarkService.addBookmark({
    title: '数据库 API 参考',
    url: 'https://db.example.com/api',
    folderId: folder.data!.id,
    tags: [urgentTag.data!.id]
  });

  // 组合查询：文件夹 + 标签 + 搜索关键词
  const searchResult = await bookmarkService.getBookmarks({
    folderId: folder.data!.id,
    tagIds: [urgentTag.data!.id],
    searchText: 'api',
    sortBy: 'createTime',
    sortOrder: 'desc'
  });

  if (searchResult.success) {
    console.log(`🔍 找到 ${searchResult.data!.length} 个匹配的书签:`);
    searchResult.data!.forEach(bookmark => {
      console.log(`  - ${bookmark.title}`);
      console.log(`    ${bookmark.url}`);
    });
  }
}

// ============================================
// 6. 批量操作示例
// ============================================

async function batchOperationsExample() {
  const { bookmarkService, folderService } = await initializeServices('test-key');

  // 创建源文件夹和目标文件夹
  const sourceFolder = await folderService.createFolder({ name: '待整理' });
  const targetFolder = await folderService.createFolder({ name: '已整理' });

  // 批量添加书签
  const bookmarkIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const result = await bookmarkService.addBookmark({
      title: `书签 ${i}`,
      url: `https://example.com/${i}`,
      folderId: sourceFolder.data!.id
    });

    if (result.success) {
      bookmarkIds.push(result.data!.id);
    }
  }

  console.log(`✅ 批量添加了 ${bookmarkIds.length} 个书签`);

  // 批量移动书签
  const moveResult = await folderService.moveBooksToFolder(
    bookmarkIds,
    targetFolder.data!.id
  );

  if (moveResult.success) {
    console.log(`📦 批量移动成功:`);
    console.log(`  - 成功: ${moveResult.data!.successCount} 个`);
    console.log(`  - 失败: ${moveResult.data!.failedCount} 个`);
  }
}

// ============================================
// 7. 错误处理示例
// ============================================

async function errorHandlingExample() {
  const { bookmarkService } = await initializeServices('test-key');

  // 示例1: 数据校验错误
  const result1 = await bookmarkService.addBookmark({
    title: '', // 空标题
    url: 'invalid-url' // 无效URL
  });

  if (!result1.success) {
    console.error('❌ 添加失败:', result1.error);
    if (result1.validationErrors) {
      console.error('校验错误:');
      result1.validationErrors.forEach(err => {
        console.error(`  - ${err.field}: ${err.message}`);
      });
    }
  }

  // 示例2: 资源不存在错误
  const result2 = await bookmarkService.getBookmarkById('non-existent-id');
  if (!result2.success) {
    console.error('❌ 获取失败:', result2.error);
  }

  // 示例3: 撤销超时错误
  const addResult = await bookmarkService.addBookmark({
    title: 'Test',
    url: 'https://example.com'
  });

  if (addResult.success) {
    const bookmarkId = addResult.data!.id;

    // 删除书签
    await bookmarkService.deleteBookmark(bookmarkId);

    // 等待6秒（超过5秒撤销期限）
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 尝试撤销（会失败）
    const undoResult = await bookmarkService.undoDelete(bookmarkId);
    if (!undoResult.success) {
      console.error('❌ 撤销失败:', undoResult.error);
      // 输出: "撤销时间已过，书签已被永久删除"
    }
  }
}

// ============================================
// 8. 分页加载示例（大数据量优化）
// ============================================

async function paginationExample() {
  const { bookmarkService } = await initializeServices('test-key');

  const pageSize = 500;
  let currentPage = 0;
  let allBookmarks: Bookmark[] = [];

  console.log('📚 开始分页加载书签...');

  while (true) {
    const result = await bookmarkService.getBookmarks({
      limit: pageSize,
      offset: currentPage * pageSize,
      sortBy: 'createTime',
      sortOrder: 'desc'
    });

    if (!result.success) {
      console.error('加载失败:', result.error);
      break;
    }

    const bookmarks = result.data!;
    if (bookmarks.length === 0) {
      break; // 没有更多数据
    }

    allBookmarks = allBookmarks.concat(bookmarks);
    console.log(`  第 ${currentPage + 1} 页: ${bookmarks.length} 个书签`);

    if (bookmarks.length < pageSize) {
      break; // 最后一页
    }

    currentPage++;
  }

  console.log(`✅ 共加载 ${allBookmarks.length} 个书签`);
}

// ============================================
// 9. 完整工作流示例
// ============================================

async function completeWorkflowExample() {
  const { bookmarkService, folderService, tagService } = await initializeServices('test-key');

  console.log('🚀 开始完整工作流演示\n');

  // 步骤1: 初始化数据结构
  console.log('📁 步骤1: 创建文件夹结构');
  const folders = await Promise.all([
    folderService.createFolder({ name: '前端开发', sort: 1 }),
    folderService.createFolder({ name: '后端开发', sort: 2 }),
    folderService.createFolder({ name: '设计资源', sort: 3 })
  ]);
  console.log(`  ✅ 创建了 ${folders.length} 个文件夹\n`);

  // 步骤2: 创建标签
  console.log('🏷️ 步骤2: 创建标签');
  const tags = await Promise.all([
    tagService.addTag({ name: 'React', color: 'blue' }),
    tagService.addTag({ name: 'Vue', color: 'green' }),
    tagService.addTag({ name: 'Node.js', color: 'green' }),
    tagService.addTag({ name: '教程', color: 'yellow' }),
    tagService.addTag({ name: '官方文档', color: 'red' })
  ]);
  console.log(`  ✅ 创建了 ${tags.length} 个标签\n`);

  // 步骤3: 添加书签
  console.log('📖 步骤3: 添加书签');
  const frontendFolderId = folders[0].data!.id;
  const reactTagId = tags[0].data!.id;
  const tutorialTagId = tags[3].data!.id;
  const docTagId = tags[4].data!.id;

  await bookmarkService.addBookmark({
    title: 'React 官方文档',
    url: 'https://react.dev',
    folderId: frontendFolderId,
    tags: [reactTagId, docTagId],
    note: 'React 18 官方文档'
  });

  await bookmarkService.addBookmark({
    title: 'React 入门教程',
    url: 'https://react.dev/learn',
    folderId: frontendFolderId,
    tags: [reactTagId, tutorialTagId]
  });

  console.log('  ✅ 添加了2个书签\n');

  // 步骤4: 查询和统计
  console.log('📊 步骤4: 数据统计');
  const allBookmarks = await bookmarkService.getBookmarks();
  const allFolders = await folderService.getFolders();
  const tagsWithUsage = await tagService.getTagsWithUsage();

  console.log(`  - 总书签数: ${allBookmarks.data!.length}`);
  console.log(`  - 总文件夹数: ${allFolders.data!.length}`);
  console.log(`  - 标签使用情况:`);
  tagsWithUsage.data!.forEach(tag => {
    console.log(`    ${tag.name}: ${tag.usageCount} 个书签`);
  });

  console.log('\n✅ 工作流演示完成!');
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

export async function runAllExamples() {
  console.log('========================================');
  console.log('书签核心业务层使用示例');
  console.log('========================================\n');

  try {
    console.log('1️⃣ 基础操作示例\n');
    await basicBookmarkOperations();
    console.log('\n---\n');

    console.log('2️⃣ 文件夹管理示例\n');
    await folderManagementExample();
    console.log('\n---\n');

    console.log('3️⃣ 标签管理示例\n');
    await tagManagementExample();
    console.log('\n---\n');

    console.log('4️⃣ 高级搜索示例\n');
    await advancedSearchExample();
    console.log('\n---\n');

    console.log('5️⃣ 批量操作示例\n');
    await batchOperationsExample();
    console.log('\n---\n');

    console.log('6️⃣ 错误处理示例\n');
    await errorHandlingExample();
    console.log('\n---\n');

    console.log('7️⃣ 分页加载示例\n');
    await paginationExample();
    console.log('\n---\n');

    console.log('8️⃣ 完整工作流示例\n');
    await completeWorkflowExample();

    console.log('\n========================================');
    console.log('✅ 所有示例运行完成');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ 示例运行出错:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (typeof window === 'undefined') {
  runAllExamples();
}
