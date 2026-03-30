import type { Bookmark, Folder } from '@/types/data';

/**
 * HTML 生成器
 * 生成 Netscape Bookmark 格式（Chrome/Firefox 通用）
 */
export class HtmlGenerator {
  /**
   * 生成 HTML 书签文件
   * @param bookmarks 书签列表
   * @param folders 文件夹列表
   * @returns HTML 字符串
   */
  static generate(bookmarks: Bookmark[], folders: Folder[]): string {
    // 构建文件夹树结构
    const folderTree = this.buildFolderTree(folders);
    
    // 按文件夹分组书签
    const bookmarksByFolder = this.groupBookmarksByFolder(bookmarks);

    // 生成 HTML 头部
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

    // 生成书签树
    html += this.generateFolderContent(null, folderTree, bookmarksByFolder, 1);

    // 生成 HTML 尾部
    html += `</DL><p>\n`;

    return html;
  }

  /**
   * 构建文件夹树结构
   */
  private static buildFolderTree(folders: Folder[]): Map<string | undefined, Folder[]> {
    const tree = new Map<string | undefined, Folder[]>();
    
    // 按 parentId 分组
    folders.forEach(folder => {
      const parentId = folder.parentId;
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)!.push(folder);
    });

    // 按 sort 排序
    tree.forEach(children => {
      children.sort((a, b) => a.sort - b.sort);
    });

    return tree;
  }

  /**
   * 按文件夹分组书签
   */
  private static groupBookmarksByFolder(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
    const groups = new Map<string, Bookmark[]>();
    
    bookmarks.forEach(bookmark => {
      const folderId = bookmark.folderId || 'uncategorized';
      if (!groups.has(folderId)) {
        groups.set(folderId, []);
      }
      groups.get(folderId)!.push(bookmark);
    });

    return groups;
  }

  /**
   * 生成文件夹内容（递归）
   */
  private static generateFolderContent(
    parentId: string | null | undefined,
    folderTree: Map<string | undefined, Folder[]>,
    bookmarksByFolder: Map<string, Bookmark[]>,
    indentLevel: number
  ): string {
    let html = '';
    const indent = '    '.repeat(indentLevel);
    const childFolders = folderTree.get(parentId === null ? undefined : parentId) || [];

    // 生成子文件夹
    childFolders.forEach(folder => {
      const createTime = Math.floor(folder.createTime / 1000);
      html += `${indent}<DT><H3 ADD_DATE="${createTime}">${this.escapeHtml(folder.name)}</H3>\n`;
      html += `${indent}<DL><p>\n`;
      
      // 生成文件夹内的书签
      const folderBookmarks = bookmarksByFolder.get(folder.id) || [];
      folderBookmarks.forEach(bookmark => {
        html += this.generateBookmarkHtml(bookmark, indentLevel + 1);
      });

      // 递归生成子文件夹
      html += this.generateFolderContent(folder.id, folderTree, bookmarksByFolder, indentLevel + 1);
      
      html += `${indent}</DL><p>\n`;
    });

    // 如果是根级别，添加未分类的书签
    if (parentId === null || parentId === undefined) {
      const uncategorizedBookmarks = bookmarksByFolder.get('uncategorized') || [];
      uncategorizedBookmarks.forEach(bookmark => {
        html += this.generateBookmarkHtml(bookmark, indentLevel);
      });
    }

    return html;
  }

  /**
   * 生成单个书签的 HTML
   */
  private static generateBookmarkHtml(bookmark: Bookmark, indentLevel: number): string {
    const indent = '    '.repeat(indentLevel);
    const addDate = Math.floor(bookmark.createTime / 1000);
    const escapedTitle = this.escapeHtml(bookmark.title);
    const escapedUrl = this.escapeHtml(bookmark.url);

    return `${indent}<DT><A HREF="${escapedUrl}" ADD_DATE="${addDate}">${escapedTitle}</A>\n`;
  }

  /**
   * HTML 转义
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * HTML 反转义
   */
  static unescapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&#39;': "'"
    };
    return text.replace(/&(amp|lt|gt|quot|#0?39);/g, m => map[m] || m);
  }
}
