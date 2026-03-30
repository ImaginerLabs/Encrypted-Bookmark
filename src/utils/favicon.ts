/**
 * Favicon 工具函数
 * 获取网站图标，支持超时和兜底处理
 */

/**
 * 获取 favicon URL
 * @param url 网站 URL
 * @returns favicon URL 或默认图标
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // 使用 Google Favicon Service 作为稳定来源
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '/icons/icon16.png'; // 使用插件默认图标
  }
};

/**
 * 带超时和兜底的 Favicon 加载
 * @param url 网站 URL
 * @param timeout 超时时间（毫秒），默认 2000ms
 * @returns Promise<favicon URL>
 */
export const loadFavicon = (url: string, timeout = 2000): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const faviconUrl = getFaviconUrl(url);

    // 超时处理
    const timer = setTimeout(() => {
      resolve('/icons/icon16.png');
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(faviconUrl);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve('/icons/icon16.png');
    };

    img.src = faviconUrl;
  });
};
