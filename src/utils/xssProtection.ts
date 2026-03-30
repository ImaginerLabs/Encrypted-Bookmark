/**
 * XSS 防护工具
 * 确保所有用户输入在渲染前被安全转义
 */
export class XSSProtection {
  /**
   * 转义 HTML 特殊字符
   * @param text 原始文本
   * @returns 转义后的安全文本
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
  }

  /**
   * 清理用户输入 (移除潜在的脚本标签)
   * @param input 用户输入
   * @returns 清理后的文本
   */
  static sanitizeInput(input: string): string {
    // 移除所有 HTML 标签
    let cleaned = input.replace(/<[^>]*>/g, '');

    // 移除 JavaScript 协议
    cleaned = cleaned.replace(/javascript:/gi, '');

    // 移除 data URI
    cleaned = cleaned.replace(/data:text\/html/gi, '');

    // 移除事件处理器
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');

    return cleaned.trim();
  }

  /**
   * 验证 URL 是否安全 (防止 javascript: 协议)
   * @param url URL 字符串
   * @returns 是否安全
   */
  static isUrlSafe(url: string): boolean {
    const lowerUrl = url.toLowerCase().trim();

    // 允许的协议白名单
    const allowedProtocols = ['http:', 'https:', 'ftp:', 'mailto:'];

    // 危险协议黑名单
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];

    // 检查危险协议
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return false;
      }
    }

    // 如果 URL 包含协议，检查是否在白名单中
    if (lowerUrl.includes(':')) {
      return allowedProtocols.some(protocol =>
        lowerUrl.startsWith(protocol)
      );
    }

    // 相对 URL 视为安全
    return true;
  }

  /**
   * 安全地设置 DOM 元素的文本内容
   * @param element DOM 元素
   * @param text 文本内容
   */
  static setTextContent(element: HTMLElement, text: string): void {
    // 使用 textContent 而非 innerHTML，自动转义
    element.textContent = text;
  }

  /**
   * 安全地设置 DOM 元素的 HTML 内容 (已转义)
   * @param element DOM 元素
   * @param html 原始 HTML (将被转义)
   */
  static setEscapedHtml(element: HTMLElement, html: string): void {
    element.textContent = html; // textContent 会自动转义
  }

  /**
   * 验证并清理书签标题
   * @param title 书签标题
   * @returns 清理后的标题
   */
  static sanitizeBookmarkTitle(title: string): string {
    const sanitized = this.sanitizeInput(title);
    return sanitized.substring(0, 200); // 限制长度
  }

  /**
   * 验证并清理书签 URL
   * @param url 书签 URL
   * @returns 清理后的 URL
   * @throws {Error} URL 不安全
   */
  static sanitizeBookmarkUrl(url: string): string {
    const trimmed = url.trim();

    if (!this.isUrlSafe(trimmed)) {
      throw new Error('URL 不安全: 包含危险协议');
    }

    return trimmed.substring(0, 2048); // 限制长度
  }

  /**
   * 验证并清理备注内容
   * @param note 备注内容
   * @returns 清理后的备注
   */
  static sanitizeNote(note: string): string {
    const sanitized = this.sanitizeInput(note);
    return sanitized.substring(0, 1000); // 限制长度
  }
}
