/**
 * Web Crypto API 环境配置
 *
 * Node.js 18+ 已内置 Web Crypto API (globalThis.crypto)
 * 此文件确保测试环境中 crypto 全局可用
 * 如果 jsdom 环境未正确暴露 crypto，则从 node:crypto 补充
 */

import { webcrypto } from "node:crypto";

/**
 * 确保全局 crypto 对象可用
 * jsdom 环境下可能缺少 crypto.subtle
 */
export function ensureCryptoAvailable(): void {
  if (!globalThis.crypto?.subtle) {
    // Node.js 的 webcrypto 完全兼容 Web Crypto API
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      writable: true,
      configurable: true,
    });
  }
}
