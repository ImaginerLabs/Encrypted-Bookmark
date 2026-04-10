/**
 * Chrome API Mock - 用于单元测试环境
 * 模拟 chrome.storage、chrome.runtime、chrome.tabs、chrome.idle 等 API
 */
import { vi } from "vitest";

// 内存存储，模拟 chrome.storage
function createStorageArea() {
  let store: Record<string, unknown> = {};

  return {
    get: vi.fn(
      async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (keys === null || keys === undefined) {
          return { ...store };
        }
        if (typeof keys === "string") {
          return { [keys]: store[keys] };
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in store) {
              result[key] = store[key];
            }
          }
          return result;
        }
        // keys 是对象，提供默认值
        const result: Record<string, unknown> = {};
        for (const [key, defaultValue] of Object.entries(keys)) {
          result[key] = key in store ? store[key] : defaultValue;
        }
        return result;
      },
    ),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const key of keyList) {
        delete store[key];
      }
    }),
    clear: vi.fn(async () => {
      store = {};
    }),
    getBytesInUse: vi.fn(async (_keys?: string | string[]) => {
      return JSON.stringify(store).length;
    }),
    // 内部辅助方法：直接设置存储内容（测试用）
    _setStore: (data: Record<string, unknown>) => {
      store = { ...data };
    },
    _getStore: () => ({ ...store }),
    _clearStore: () => {
      store = {};
    },
    QUOTA_BYTES: 10485760, // 10MB
  };
}

// 事件监听器模拟
function createEvent() {
  const listeners: Array<(...args: unknown[]) => void> = [];
  return {
    addListener: vi.fn((callback: (...args: unknown[]) => void) => {
      listeners.push(callback);
    }),
    removeListener: vi.fn((callback: (...args: unknown[]) => void) => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    hasListener: vi.fn((callback: (...args: unknown[]) => void) => {
      return listeners.includes(callback);
    }),
    // 内部辅助方法：触发事件（测试用）
    _fire: (...args: unknown[]) => {
      listeners.forEach((listener) => listener(...args));
    },
    _getListeners: () => [...listeners],
    _clearListeners: () => {
      listeners.length = 0;
    },
  };
}

const storageLocal = createStorageArea();
const storageSession = createStorageArea();
const storageOnChanged = createEvent();

export const chromeMock = {
  storage: {
    local: storageLocal,
    session: storageSession,
    onChanged: storageOnChanged,
  },
  runtime: {
    sendMessage: vi.fn(async () => undefined),
    onMessage: createEvent(),
    onInstalled: createEvent(),
    getManifest: vi.fn(() => ({
      version: "1.0.0",
      name: "Encrypted Bookmark",
      manifest_version: 3,
    })),
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: "mock-extension-id",
    lastError: null as chrome.runtime.LastError | null,
    openOptionsPage: vi.fn(async () => undefined),
  },
  tabs: {
    query: vi.fn(async () => [
      {
        id: 1,
        url: "https://example.com",
        title: "Example",
        active: true,
        windowId: 1,
      },
    ]),
    create: vi.fn(async (props: { url?: string }) => ({
      id: 2,
      url: props.url || "",
      title: "",
      active: true,
      windowId: 1,
    })),
    update: vi.fn(async () => ({})),
    remove: vi.fn(async () => undefined),
  },
  idle: {
    setDetectionInterval: vi.fn(),
    onStateChanged: createEvent(),
    queryState: vi.fn(async () => "active" as const),
  },
};

/**
 * 安装 Chrome Mock 到全局
 */
export function installChromeMock(): void {
  (globalThis as Record<string, unknown>).chrome = chromeMock;
}

/**
 * 重置所有 Chrome Mock 状态
 */
export function resetChromeMock(): void {
  // 清除存储
  storageLocal._clearStore();
  storageSession._clearStore();

  // 清除事件监听器
  storageOnChanged._clearListeners();
  chromeMock.runtime.onMessage._clearListeners();
  chromeMock.runtime.onInstalled._clearListeners();
  chromeMock.idle.onStateChanged._clearListeners();

  // 重置所有 vi.fn() 的调用记录
  vi.clearAllMocks();
}
