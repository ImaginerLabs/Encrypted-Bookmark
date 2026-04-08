## Why

导入导出页面存在两个严重的用户体验和功能正确性问题：

1. **导入/导出文案不对称**：导出格式命名为"JSON 加密备份"，但实际生成的是 `.pbm` 文件；导入侧对应的格式叫"插件备份文件 (.pbm)"。用户无法将导出的格式与导入的格式对应起来，造成困惑。同样，导出"JSON 明文导出"生成 `.json` 文件，但导入侧叫"JSON 格式 (.json)"，命名风格不统一。
2. **导出格式与实际输出不匹配**：选择"JSON 加密备份"导出，用户期望得到 `.json` 文件，但实际下载的是 `.pbm` 文件。`useCallback` 依赖数组不完整导致闭包捕获过时状态，`handleExport` 依赖 `[exportFormat, exportScope, encryptionKey]` 但 `executeExport` 是普通函数而非 useCallback，`confirmPlainExport` 依赖 `[exportScope]` 缺少 `encryptionKey`，存在状态不一致风险。

这些问题直接影响用户的数据备份和恢复流程，必须立即修复。

## What Changes

- **统一导入/导出格式命名体系**：建立一致的格式命名映射，导入和导出使用相同的格式标识和文案描述，消除用户认知断裂
- **重构 ExportSection 组件**：修复 `useCallback` 依赖数组问题，确保导出操作始终使用最新的状态值；确保选择的格式与实际导出的文件格式严格一致
- **重构 ImportSection 组件**：与导出侧格式命名对齐，统一文案风格
- **重构类型定义**：统一 `ExportFormat` 和 `ImportFormat` 的命名，使导入导出格式可以明确对应
- **完善 E2E 测试**：为导入导出核心链路添加全覆盖的 E2E 测试，包括格式选择、文件生成验证、导入解析验证等

## Capabilities

### New Capabilities
- `import-export-format-consistency`: 统一导入导出格式命名体系，确保格式标识、文案描述、文件扩展名三者一致
- `import-export-e2e-coverage`: 导入导出核心链路的 E2E 测试全覆盖，包括格式切换、导出文件验证、导入文件解析

### Modified Capabilities

（无现有 specs 需要修改）

## Impact

- **组件层**：`src/options/components/ExportSection.tsx`、`src/options/components/ImportSection.tsx`、`src/options/components/ImportExportPanel.tsx`
- **类型层**：`src/types/import-export.ts`（`ExportFormat`、`ImportFormat` 类型定义）
- **服务层**：`src/services/ImportExportService.ts`（导出方法的格式映射逻辑）
- **测试层**：`e2e/tests/options/import-export.spec.ts`（大幅扩展测试覆盖）
- **无破坏性变更**：不影响已导出文件的兼容性，导入侧保持向后兼容
