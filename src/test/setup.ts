/**
 * Vitest 全局 Setup 文件
 * 在每个测试文件执行前自动运行
 */
import { beforeAll, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { installChromeMock, resetChromeMock } from "./mocks/chrome";
import { ensureCryptoAvailable } from "./mocks/crypto";

// 确保 Web Crypto API 可用
ensureCryptoAvailable();

// 安装 Chrome API Mock
installChromeMock();

// 每个测试前重置 Mock 状态
beforeEach(() => {
  resetChromeMock();
});
