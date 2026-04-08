## 1. 类型定义与格式配置

- [x] 1.1 修改 `src/types/import-export.ts` 中 `ExportFormat` 类型：从 `'json-encrypted' | 'json-plain' | 'html'` 改为 `'pbm' | 'json' | 'html'`
- [x] 1.2 在 `src/types/import-export.ts` 中新增 `FORMAT_CONFIG` 常量，集中定义每种格式的 label、ext、mime、hint 字段，导入和导出共用
- [x] 1.3 新增 `FormatConfigItem` 接口类型定义

## 2. 服务层适配

- [x] 2.1 修改 `src/services/ImportExportService.ts` 中 `exportBookmarks` 方法的 switch-case：将 `case 'json-encrypted'` 改为 `case 'pbm'`，将 `case 'json-plain'` 改为 `case 'json'`
- [x] 2.2 全局搜索确认无其他文件引用旧的 `json-encrypted` / `json-plain` 格式标识，如有则同步更新

## 3. 重构 ExportSection 组件

- [x] 3.1 修改 `src/options/components/ExportSection.tsx`：将 `exportFormat` 默认值从 `'json-encrypted'` 改为 `'pbm'`，使用 `FORMAT_CONFIG` 渲染格式选项
- [x] 3.2 将 `executeExport` 改为 `useCallback`，正确声明所有依赖（exportFormat、exportScope、encryptionKey、masterKey）
- [x] 3.3 修复 `confirmPlainExport` 的依赖数组，添加缺失的 `encryptionKey` 依赖
- [x] 3.4 使用 `useRef` 保存 format/scope/key 最新值，在异步操作中通过 ref 读取
- [x] 3.5 更新格式选择下拉框的 option 文案，使用 FORMAT_CONFIG 中的 label
- [x] 3.6 更新格式描述提示（hint）文案，使用 FORMAT_CONFIG 中的 hint
- [x] 3.7 更新"导出说明"信息框中的格式描述，与下拉框选项文案一致
- [x] 3.8 更新明文导出警告弹窗中的文案，将"JSON 加密备份"改为"加密备份"

## 4. 重构 ImportSection 组件

- [x] 4.1 修改 `src/options/components/ImportSection.tsx`：使用 `FORMAT_CONFIG` 渲染格式选项，统一文案
- [x] 4.2 更新格式选择下拉框的 option 文案：`html` → "HTML 书签 (.html)"、`json` → "JSON 明文 (.json)"、`pbm` → "加密备份 (.pbm)"
- [x] 4.3 更新格式描述提示文案，使用 FORMAT_CONFIG 中的 hint
- [x] 4.4 更新解密密钥输入框的显示条件判断（保持 `importFormat === 'pbm'` 不变）

## 5. E2E 测试 - 导出格式切换与 UI 验证

- [x] 5.1 新增测试：切换导出格式下拉框后，验证描述提示文案正确更新
- [x] 5.2 新增测试：选择加密备份格式时显示密钥输入框，切换其他格式时隐藏

## 6. E2E 测试 - 导出文件格式验证

- [x] 6.1 新增测试：PBM 格式导出 → 验证文件名以 `.pbm` 结尾，内容包含 `format: "pbm"` 字段
- [x] 6.2 新增测试：JSON 明文导出 → 验证文件名以 `.json` 结尾，内容包含 `version` 和 `bookmarks` 字段
- [x] 6.3 新增测试：HTML 格式导出 → 验证文件名以 `.html` 结尾，内容包含 Netscape 书签标识

## 7. E2E 测试 - 导入导出往返测试

- [x] 7.1 新增测试：PBM 格式导出 → PBM 格式导入 → 验证数据一致
- [x] 7.2 新增测试：JSON 格式导出 → JSON 格式导入 → 验证数据一致
- [x] 7.3 新增测试：HTML 格式导出 → HTML 格式导入 → 验证导入成功

## 8. E2E 测试 - 导入错误处理与确认流程

- [x] 8.1 新增测试：格式不匹配时显示错误提示（选 HTML 上传 JSON、选 JSON 上传 HTML）
- [x] 8.2 新增测试：覆盖模式显示确认弹窗，点击取消后数据不受影响
- [x] 8.3 新增测试：导入格式切换后文件选择器 accept 属性正确更新
- [x] 8.4 新增测试：选择加密备份导入格式时显示解密密钥输入框
