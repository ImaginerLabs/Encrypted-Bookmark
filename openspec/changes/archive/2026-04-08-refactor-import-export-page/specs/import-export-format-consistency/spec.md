## ADDED Requirements

### Requirement: 导入导出格式标识统一
系统 SHALL 使用统一的格式标识体系，导出格式类型 `ExportFormat` 与导入格式类型 `ImportFormat` 使用相同的格式标识集合：`pbm`、`json`、`html`。

#### Scenario: ExportFormat 类型定义
- **WHEN** 开发者查看 `ExportFormat` 类型定义
- **THEN** 类型值 SHALL 为 `'pbm' | 'json' | 'html'`

#### Scenario: ImportFormat 类型定义保持不变
- **WHEN** 开发者查看 `ImportFormat` 类型定义
- **THEN** 类型值 SHALL 为 `'html' | 'json' | 'pbm'`

### Requirement: 导出格式与文件扩展名严格对应
系统 SHALL 确保用户选择的导出格式与实际生成的文件扩展名严格一致。

#### Scenario: 选择 PBM 格式导出
- **WHEN** 用户选择"加密备份 (.pbm)"格式并点击导出
- **THEN** 下载的文件扩展名 SHALL 为 `.pbm`

#### Scenario: 选择 JSON 格式导出
- **WHEN** 用户选择"JSON 明文 (.json)"格式并点击导出
- **THEN** 下载的文件扩展名 SHALL 为 `.json`

#### Scenario: 选择 HTML 格式导出
- **WHEN** 用户选择"HTML 书签 (.html)"格式并点击导出
- **THEN** 下载的文件扩展名 SHALL 为 `.html`

### Requirement: 导入导出文案对称一致
系统 SHALL 确保导入和导出界面中，相同格式使用相同的文案描述。

#### Scenario: PBM 格式文案一致
- **WHEN** 用户查看导出格式选项中的 PBM 选项
- **THEN** 文案 SHALL 显示"加密备份 (.pbm)"
- **WHEN** 用户查看导入格式选项中的 PBM 选项
- **THEN** 文案 SHALL 显示"加密备份 (.pbm)"

#### Scenario: JSON 格式文案一致
- **WHEN** 用户查看导出格式选项中的 JSON 选项
- **THEN** 文案 SHALL 显示"JSON 明文 (.json)"
- **WHEN** 用户查看导入格式选项中的 JSON 选项
- **THEN** 文案 SHALL 显示"JSON 明文 (.json)"

#### Scenario: HTML 格式文案一致
- **WHEN** 用户查看导出格式选项中的 HTML 选项
- **THEN** 文案 SHALL 显示"HTML 书签 (.html)"
- **WHEN** 用户查看导入格式选项中的 HTML 选项
- **THEN** 文案 SHALL 显示"HTML 书签 (.html)"

### Requirement: 格式配置集中管理
系统 SHALL 通过单一数据源（FORMAT_CONFIG 常量）管理所有格式的标识、文案、扩展名和描述信息，导入和导出组件 MUST 从此配置读取。

#### Scenario: 格式配置包含所有必要字段
- **WHEN** 开发者查看 FORMAT_CONFIG
- **THEN** 每种格式 SHALL 包含 `label`（显示文案）、`ext`（文件扩展名）、`mime`（MIME 类型）、`hint`（描述提示）字段

#### Scenario: 新增格式只需修改一处
- **WHEN** 需要新增一种导入导出格式
- **THEN** 只需在 FORMAT_CONFIG 中添加一条记录，导入和导出组件 SHALL 自动获取新格式

### Requirement: 导出操作使用最新状态
系统 SHALL 确保导出操作执行时始终使用用户当前选择的格式、范围和密钥值，不受 React 闭包过时问题影响。

#### Scenario: 切换格式后立即导出
- **WHEN** 用户将导出格式从"加密备份"切换为"JSON 明文"并立即点击导出
- **THEN** 导出的文件 SHALL 为 JSON 明文格式（.json 扩展名）

#### Scenario: 明文导出确认后执行
- **WHEN** 用户选择"JSON 明文"格式，点击导出，在确认弹窗中点击"确认导出"
- **THEN** 导出的文件 SHALL 为 JSON 明文格式，且包含用户当前选择的导出范围数据

### Requirement: 导出说明文案与格式选项一致
系统 SHALL 确保导出区域底部的"导出说明"信息框中的格式描述与格式选择下拉框中的选项文案一致。

#### Scenario: 导出说明列出所有格式
- **WHEN** 用户查看导出说明信息框
- **THEN** SHALL 列出"加密备份"、"JSON 明文"、"HTML 书签"三种格式的说明，且名称与下拉框选项一致
