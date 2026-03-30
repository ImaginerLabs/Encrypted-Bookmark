import type { Bookmark, Folder } from '@/types/data';

/**
 * Chrome HTML 书签解析器
 * 解析 Netscape Bookmark 格式（Chrome/Firefox 通用格式）
 */
export class HtmlParser {
  private bookmarks: Bookmark[] = [];
  private folders: Folder[] = [];
  private folderIdMap: Map<string, string> = new Map(); // 文件夹名 -> ID 映射

  /**
   * 解析 HTML 书签文件
   * @param html HTML 内容
   * @returns 解析结果
   */
  parse(html: string): { bookmarks: Bookmark[]; folders: Folder[] } {
    this.bookmarks = [];
    this.folders = [];
    this.folderIdMap.clear();

    try {
      // 使用 DOMParser 解析 HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 检查是否是 Netscape Bookmark 格式
      const meta = doc.querySelector('meta[http-equiv="Content-Type"]');
      if (!meta || !doc.querySelector('dt')) {
        throw new Error('不是有效的 Netscape Bookmark 格式');
      }

      // 查找根节点 <DL>
      const rootDL = doc.querySelector('dl');
      if (!rootDL) {
        throw new Error('HTML 格式错误：缺少 <DL> 标签');
      }

      // 解析根级书签和文件夹
      this.parseDL(rootDL, null);

      return {
        bookmarks: this.bookmarks,
        folders: this.folders
      };
    } catch (error) {
      throw new Error(`HTML 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 递归解析 <DL> 节点
   * @param dl DL 元素
   * @param parentFolderId 父文件夹 ID
   */
  private parseDL(dl: Element, parentFolderId: string | null): void {
    const children = Array.from(dl.children);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child.tagName === 'DT') {
        const dtChild = child.firstElementChild;
        if (!dtChild) continue;

        // 解析文件夹 <H3>
        if (dtChild.tagName === 'H3') {
          const folderName = this.sanitizeText(dtChild.textContent || '未命名文件夹');
          const addDate = dtChild.getAttribute('add_date');
          
          // 生成唯一文件夹 ID
          const folderId = this.generateUuid();
          
          const folder: Folder = {
            id: folderId,
            name: folderName,
            parentId: parentFolderId || undefined,
            sort: this.folders.length,
            createTime: addDate ? parseInt(addDate) * 1000 : Date.now()
          };

          this.folders.push(folder);
          this.folderIdMap.set(folderName, folderId);

          // 查找下一个 <DL> 节点（文件夹的子内容）
          const nextSibling = children[i + 1];
          if (nextSibling && nextSibling.tagName === 'DL') {
            this.parseDL(nextSibling, folderId);
          }
        }
        // 解析书签 <A>
        else if (dtChild.tagName === 'A') {
          const link = dtChild as HTMLAnchorElement;
          const url = link.href;
          const title = this.sanitizeText(link.textContent || url);
          const addDate = link.getAttribute('add_date');
          // icon 属性可以保存但当前 Bookmark 接口不包含该字段
          // const icon = link.getAttribute('icon');

          // 校验 URL
          if (!url || !this.isValidUrl(url)) {
            console.warn(`跳过无效 URL: ${url}`);
            continue;
          }

          const bookmark: Bookmark = {
            id: this.generateUuid(),
            title,
            url,
            folderId: parentFolderId || 'uncategorized',
            tags: [],
            createTime: addDate ? parseInt(addDate) * 1000 : Date.now(),
            updateTime: addDate ? parseInt(addDate) * 1000 : Date.now(),
            visitCount: 0
          };

          this.bookmarks.push(bookmark);
        }
      }
    }
  }

  /**
   * 文本清理和 XSS 防护
   */
  private sanitizeText(text: string): string {
    // 移除前后空白
    text = text.trim();
    
    // HTML 实体解码
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;
    
    // HTML 转义（防止 XSS）
    const escaped = decoded
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    return escaped;
  }

  /**
   * 验证 URL 格式
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 生成 UUID v4
   */
  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 检测文件编码（简化版）
   */
  static detectEncoding(content: string): string {
    // 检查 BOM
    if (content.charCodeAt(0) === 0xfeff) {
      return 'utf-8';
    }
    
    // 检查 meta 标签
    const metaMatch = content.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
    if (metaMatch) {
      return metaMatch[1].toLowerCase();
    }

    // 默认 UTF-8
    return 'utf-8';
  }

  /**
   * 验证 HTML 格式
   */
  static validate(html: string): { isValid: boolean; error?: string } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 检查解析错误
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        return {
          isValid: false,
          error: 'HTML 语法错误: ' + parserError.textContent
        };
      }

      // 检查是否是 Netscape Bookmark 格式
      const hasNetscapeFormat = html.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>') ||
                                html.includes('NETSCAPE-Bookmark-file');
      
      if (!hasNetscapeFormat) {
        return {
          isValid: false,
          error: '不是 Netscape Bookmark 格式'
        };
      }

      // 检查必要的标签
      const hasDL = doc.querySelector('dl') !== null;
      if (!hasDL) {
        return {
          isValid: false,
          error: '缺少必要的 <DL> 标签'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}
