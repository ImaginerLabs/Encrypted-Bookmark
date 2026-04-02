import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright 配置文件
 * 专为 Chrome 扩展 E2E 测试优化
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 全局超时设置
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // 完全并行模式关闭（扩展测试需要隔离）
  fullyParallel: false,

  // 失败时不重试（调试阶段）
  retries: process.env.CI ? 2 : 0,

  // 单 worker（扩展测试避免冲突）
  workers: 1,

  // 报告器配置
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../playwright-report' }],
  ],

  // 全局设置
  use: {
    // 基础 URL（扩展测试中动态设置）
    // baseURL: 由 fixture 动态提供

    // 截图策略
    screenshot: 'only-on-failure',

    // 录像策略
    video: 'retain-on-failure',

    // Trace 录制（调试利器）
    trace: 'retain-on-failure',

    // Action 超时
    actionTimeout: 10000,

    // 导航超时
    navigationTimeout: 15000,
  },

  // 项目配置（仅 Chromium，因为是 Chrome 扩展）
  projects: [
    {
      name: 'chromium-extension',
      use: {
        browserName: 'chromium',
        // 扩展相关配置由 fixture 处理
        launchOptions: {
          // 扩展必须在 headed 模式运行
          headless: false,
          args: [
            // 禁用默认扩展
            '--disable-extensions-except=' + path.resolve(__dirname, '../dist'),
            // 加载本地扩展
            '--load-extension=' + path.resolve(__dirname, '../dist'),
            // 禁用沙箱（某些 CI 环境需要）
            '--no-sandbox',
            // 禁用 GPU（CI 环境优化）
            '--disable-gpu',
            // 禁用 dev shm（Docker 环境）
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
  ],

  // 输出目录
  outputDir: './test-results',

  // 全局 setup（可选：用于构建扩展）
  // globalSetup: './global-setup.ts',
});
