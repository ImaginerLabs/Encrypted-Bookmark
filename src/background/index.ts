import { PasswordService } from "@/services";
import { SettingsService } from "@/services/SettingsService";

/**
 * Background Service Worker
 * 负责处理后台任务和消息通信
 */

console.log("Encrypted Bookmark - Background Service Worker Started");

// idle 状态变更监听器引用（用于动态移除/添加）
let idleListenerRegistered = false;

/**
 * 根据设置初始化 idle 检测间隔
 * 从 SettingsService 读取 autoLockMinutes 动态设置
 */
async function initIdleDetection(): Promise<void> {
  try {
    const securitySettings = await SettingsService.getSecuritySettings();
    const autoLockMinutes = securitySettings.autoLockMinutes;

    if (autoLockMinutes === 0) {
      // 永不锁定：移除 idle 监听
      if (idleListenerRegistered) {
        chrome.idle.onStateChanged.removeListener(handleIdleStateChanged);
        idleListenerRegistered = false;
      }
      console.log("Auto-lock disabled (never lock)");
      return;
    }

    // 设置 idle 检测间隔（秒）
    chrome.idle.setDetectionInterval(autoLockMinutes * 60);

    // 确保监听器已注册
    if (!idleListenerRegistered) {
      chrome.idle.onStateChanged.addListener(handleIdleStateChanged);
      idleListenerRegistered = true;
    }

    console.log(`Idle detection interval set to ${autoLockMinutes} minutes`);
  } catch (error) {
    // 读取失败时使用默认值 15 分钟
    console.error(
      "Failed to read lock settings, using default 15 minutes:",
      error,
    );
    chrome.idle.setDetectionInterval(15 * 60);
    if (!idleListenerRegistered) {
      chrome.idle.onStateChanged.addListener(handleIdleStateChanged);
      idleListenerRegistered = true;
    }
  }
}

/**
 * idle 状态变更处理器
 */
function handleIdleStateChanged(state: chrome.idle.IdleState): void {
  if (state === "locked" || state === "idle") {
    console.log("Browser idle/locked, locking extension");
    void PasswordService.lock();
  }
}

// 插件安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  if (details.reason === "install") {
    // 首次安装
    console.log("First time installation - Welcome!");
  } else if (details.reason === "update") {
    // 更新
    console.log(
      "Extension updated to version:",
      chrome.runtime.getManifest().version,
    );
  }
});

// 监听来自 Popup/Options 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // 处理异步消息（返回 true 表示异步响应）
  handleMessage(request)
    .then(sendResponse)
    .catch((error) => {
      console.error("Message handler error:", error);
      sendResponse({ error: error.message });
    });

  return true; // 保持消息通道开启
});

/**
 * 消息处理器
 */
async function handleMessage(request: { type: string; payload?: unknown }) {
  switch (request.type) {
    case "GET_PASSWORD_STATUS":
      return await PasswordService.getPasswordStatus();

    case "CHECK_UNLOCK_STATUS":
      return { isUnlocked: await PasswordService.checkAndRestoreSession() };

    case "LOCK":
      await PasswordService.lock();
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
      console.log("Lock expired, resetting failed attempts");
    }
  } catch (error) {
    console.error("Lock cleanup error:", error);
  }
}, 60000);

// 启动时初始化 idle 检测（从设置中读取）
void initIdleDetection();

// 监听 chrome.storage 变更，当设置变更时重新设置 idle 检测间隔
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes["app_settings"]) {
    console.log("Settings changed, reinitializing idle detection");
    void initIdleDetection();
  }
});

export {};
