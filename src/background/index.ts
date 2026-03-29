import { PasswordService } from '@/services';

/**
 * Background Service Worker
 * 负责处理后台任务和消息通信
 */

console.log('Private BookMark - Background Service Worker Started');

// 插件安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // 首次安装
    console.log('First time installation - Welcome!');
  } else if (details.reason === 'update') {
    // 更新
    console.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// 监听来自 Popup/Options 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // 移除敏感日志：console.log('Received message:', request);

  // 处理异步消息（返回 true 表示异步响应）
  handleMessage(request)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });

  return true; // 保持消息通道开启
});

/**
 * 消息处理器
 */
async function handleMessage(request: { type: string; payload?: unknown }) {
  switch (request.type) {
    case 'GET_PASSWORD_STATUS':
      return await PasswordService.getPasswordStatus();

    case 'CHECK_UNLOCK_STATUS':
      return { isUnlocked: PasswordService.isUnlocked() };

    case 'LOCK':
      PasswordService.lock();
      return { success: true };

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// 定期清理过期锁定状态（每分钟检查一次）
setInterval(async () => {
  try {
    const status = await PasswordService.getPasswordStatus();
    if (status.lockedUntil > 0 && status.lockedUntil <= Date.now()) {
      console.log('Lock expired, resetting failed attempts');
      // 锁定过期会在下次验证时自动重置
    }
  } catch (error) {
    console.error('Lock cleanup error:', error);
  }
}, 60000);

// 浏览器空闲 15 分钟后自动锁定
chrome.idle.setDetectionInterval(15 * 60); // 15 分钟

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'locked' || state === 'idle') {
    console.log('Browser idle/locked, locking extension');
    PasswordService.lock();
  }
});

export {};
