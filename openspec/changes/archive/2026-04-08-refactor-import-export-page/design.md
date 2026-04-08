## Context

当前导入导出页面由三个组件构成：`ImportExportPanel.tsx`（面板容器 + 解锁逻辑）、`ImportSection.tsx`（导入区域）、`ExportSection.tsx`（导出区域），服务层为 `ImportExportService.ts`，类型定义在 `src/types/import-export.ts`。

**核心问题**：

1. **格式命名不对称**：导出有 3 种格式（`json-encrypted` / `json-plain` / `html`），导入有 3 种格式（`html` / `json` / `pbm`）。导出的 `json-encrypted` 实际生成 `.pbm` 文件，但导入侧对应的是 `pbm` 格式——用户看到的文案完全无法对应。
2. **闭包状态过时**：`ExportSection` 中 `handleExport` 是 `useCallback`，但 `executeExport` 是普通 async 函数（非 useCallback），导致 `handleExport` 调用 `executeExport` 时可能捕获过时的引用。`confirmPlainExport` 的依赖数组 `[exportScope]` 缺少 `encryptionKey`。
3. **E2E 测试薄弱**：现有测试仅覆盖面板加载、按钮可见性、文件 accept 属性等表面检查，未覆盖格式切换、实际导出内容验证、导入解析等核心链路。

## Goals / Non-Goals

**Goals:**
- 建立统一的格式命名体系，导入和导出使用一致的格式标识和用户可见文案
- 修复所有 React Hook 依赖问题，确保导出操作始终使用最新状态
- 确保"选择格式 A → 导出格式 A"的严格一致性
- E2E 测试覆盖导入导出核心链路（格式切换、导出验证、导入验证、错误处理）

**Non-Goals:**
- 不新增导入导出格式（不增加 CSV、XML 等）
- 不修改加密算法或密钥派生逻辑
- 不重构 `ImportExportService` 的内部存储读写逻辑
- 不修改 `ImportExportPanel` 的解锁/会话恢复逻辑

## Decisions

### 决策 1：统一格式命名体系

**方案**：以文件实际格式为核心，建立「格式标识 → 文案 → 扩展名」的统一映射表。

| 格式标识 | 导出文案 | 导入文案 | 扩展名 | 说明 |
|---|---|---|---|---|
| `pbm` | 加密备份 (.pbm) | 加密备份 (.pbm) | `.pbm` | 插件专用加密格式 |
| `json` | JSON 明文 (.json) | JSON 明文 (.json) | `.json` | 通用 JSON 格式 |
| `html` | HTML 书签 (.html) | HTML 书签 (.html) | `.html` | 浏览器标准格式 |

**类型变更**：
- `ExportFormat` 从 `'json-encrypted' | 'json-plain' | 'html'` 改为 `'pbm' | 'json' | 'html'`
- `ImportFormat` 保持 `'html' | 'json' | 'pbm'` 不变
- 服务层 `exportBookmarks` 的 switch-case 同步更新

**理由**：格式标识直接对应文件扩展名，消除"选 A 得 B"的根因。用户在导入和导出看到完全一致的格式名称，不再困惑。

**备选方案**：保持现有类型不变，仅修改 UI 文案 → 被否决，因为类型层面的不一致是 bug 的根因，仅改文案治标不治本。

### 决策 2：使用 useRef 解决闭包过时问题

**方案**：将 `executeExport` 改为 `useCallback`，并确保所有依赖正确声明。同时使用 `useRef` 保存最新的 format/scope/key 值，在异步操作中通过 ref 读取，彻底避免闭包陷阱。

**理由**：`useCallback` + 正确依赖是 React 推荐模式；`useRef` 作为兜底确保异步场景下状态一致。

### 决策 3：格式映射集中管理

**方案**：创建 `FORMAT_CONFIG` 常量对象，集中定义每种格式的标识、文案、扩展名、MIME 类型、描述文本。导入和导出组件都从此配置读取，确保单一数据源。

```typescript
const FORMAT_CONFIG = {
  pbm: { label: '加密备份 (.pbm)', ext: '.pbm', mime: 'application/json', hint: '插件专用加密格式，最安全' },
  json: { label: 'JSON 明文 (.json)', ext: '.json', mime: 'application/json', hint: '通用 JSON 格式，数据未加密' },
  html: { label: 'HTML 书签 (.html)', ext: '.html', mime: 'text/html', hint: '可导入到 Chrome、Firefox、Edge 等浏览器' },
} as const;
```

**理由**：避免导入/导出组件各自维护一套文案导致不同步。

### 决策 4：E2E 测试策略

**方案**：在 `e2e/tests/options/import-export.spec.ts` 中新增以下测试场景：
1. 导出格式切换 → 验证 UI 文案正确更新
2. 每种格式导出 → 验证下载文件的扩展名和内容格式
3. 导出 PBM → 导入 PBM 的完整往返测试
4. 导出 JSON → 导入 JSON 的完整往返测试
5. 导出 HTML → 导入 HTML 的完整往返测试
6. 格式不匹配时的错误提示验证
7. 覆盖模式的二次确认流程

## Risks / Trade-offs

- **[Risk] `ExportFormat` 类型变更可能影响其他引用** → Mitigation: 全局搜索 `ExportFormat` 和 `json-encrypted` / `json-plain`，确保所有引用点同步更新。经排查，仅 `ExportSection.tsx` 和 `ImportExportService.ts` 使用。
- **[Risk] 已导出的 `.pbm` 文件向后兼容** → Mitigation: 导入侧的 `pbm` 格式处理逻辑不变，已导出的文件可正常导入。
- **[Risk] E2E 测试中文件下载验证在 CI 环境可能不稳定** → Mitigation: 使用 Playwright 的 `waitForEvent('download')` + 超时兜底，失败时标记为 flaky 而非 hard fail。
