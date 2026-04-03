import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

/**
 * 扩展测试 Fixture
 * 提供扩展上下文、页面访问和工具方法
 */

// ES Module 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 扩展路径
const EXTENSION_PATH = path.resolve(__dirname, "../../dist");

// Fixture 类型定义
export interface ExtensionFixtures {
  /** 扩展 Browser Context（persistent） */
  extensionContext: BrowserContext;
  /** 扩展 ID */
  extensionId: string;
  /** 获取 Popup 页面 URL */
  popupUrl: string;
  /** 获取 Options 页面 URL */
  optionsUrl: string;
  /** Popup 页面（每个测试独立） */
  popupPage: Page;
  /** Options 页面（每个测试独立） */
  optionsPage: Page;
}

/**
 * 自定义测试 fixture
 */
export const test = base.extend<ExtensionFixtures>({
  // 扩展上下文 - worker 级别共享（使用不同名称避免与内置 context 冲突）
  extensionContext: [
    async ({}, use) => {
      // 创建持久化上下文（加载扩展必需）
      const context = await chromium.launchPersistentContext("", {
        headless: false,
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
          "--no-sandbox",
          "--disable-gpu",
        ],
      });

      await use(context);

      // 清理：先逐个关闭所有打开的页面，再关闭上下文
      try {
        const pages = context.pages();
        await Promise.all(pages.map((p) => p.close().catch(() => {})));
      } catch {
        // 忽略页面关闭错误
      }

      // 为 context.close() 添加超时保护，避免 teardown 无限等待
      await Promise.race([
        context.close(),
        new Promise<void>((resolve) => setTimeout(resolve, 10000)),
      ]);
    },
    { scope: "worker", timeout: 60000 },
  ],

  // 扩展 ID - worker 级别共享
  extensionId: [
    async ({ extensionContext }, use) => {
      // 等待 Service Worker 启动
      let serviceWorker = extensionContext.serviceWorkers()[0];
      if (!serviceWorker) {
        serviceWorker = await extensionContext.waitForEvent("serviceworker");
      }

      // 从 Service Worker URL 提取扩展 ID
      const extensionId = serviceWorker.url().split("/")[2];

      await use(extensionId);
    },
    { scope: "worker" },
  ],

  // Popup URL
  popupUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/src/popup/index.html`);
  },

  // Options URL
  optionsUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/src/options/index.html`);
  },

  // Popup 页面 - 每个测试独立创建
  popupPage: async ({ extensionContext, popupUrl }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState("domcontentloaded");

    // 清除 chrome.storage.session，避免测试间会话状态干扰
    await page.evaluate(() => chrome.storage.session.clear());

    await use(page);

    // 测试结束后关闭页面
    if (!page.isClosed()) {
      await page.close();
    }
  },

  // Options 页面 - 每个测试独立创建
  optionsPage: async ({ extensionContext, optionsUrl }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(optionsUrl);
    await page.waitForLoadState("domcontentloaded");

    // 清除 chrome.storage.session，避免测试间会话状态干扰
    await page.evaluate(() => chrome.storage.session.clear());

    await use(page);

    // 测试结束后关闭页面
    if (!page.isClosed()) {
      await page.close();
    }
  },
});

export { expect } from "@playwright/test";

/**
 * 辅助函数：创建新的 Popup 页面
 */
export async function createPopupPage(
  context: BrowserContext,
  extensionId: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await page.waitForLoadState("domcontentloaded");
  return page;
}

/**
 * 辅助函数：创建新的 Options 页面
 */
export async function createOptionsPage(
  context: BrowserContext,
  extensionId: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await page.waitForLoadState("domcontentloaded");
  return page;
}
