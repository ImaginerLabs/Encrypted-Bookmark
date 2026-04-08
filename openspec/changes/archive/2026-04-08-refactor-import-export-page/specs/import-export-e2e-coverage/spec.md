## ADDED Requirements

### Requirement: 导出格式切换 UI 验证
E2E 测试 SHALL 验证导出格式切换时 UI 文案正确更新。

#### Scenario: 切换导出格式后提示文案更新
- **WHEN** 用户在导出区域切换格式下拉框选项
- **THEN** 格式描述提示 SHALL 立即更新为对应格式的描述文案

#### Scenario: 选择加密备份时显示密钥输入框
- **WHEN** 用户选择"加密备份 (.pbm)"格式
- **THEN** SHALL 显示"加密密钥"输入框
- **WHEN** 用户切换为其他格式
- **THEN** "加密密钥"输入框 SHALL 隐藏

### Requirement: 导出文件格式验证
E2E 测试 SHALL 验证每种格式导出的文件扩展名和内容格式正确。

#### Scenario: PBM 格式导出文件验证
- **WHEN** 用户选择"加密备份 (.pbm)"格式并执行导出
- **THEN** 下载文件的文件名 SHALL 以 `.pbm` 结尾
- **THEN** 文件内容 SHALL 为有效 JSON，且包含 `format: "pbm"` 和 `encrypted: true` 字段

#### Scenario: JSON 格式导出文件验证
- **WHEN** 用户选择"JSON 明文 (.json)"格式并确认明文导出
- **THEN** 下载文件的文件名 SHALL 以 `.json` 结尾
- **THEN** 文件内容 SHALL 为有效 JSON，且包含 `version`、`bookmarks` 字段

#### Scenario: HTML 格式导出文件验证
- **WHEN** 用户选择"HTML 书签 (.html)"格式并执行导出
- **THEN** 下载文件的文件名 SHALL 以 `.html` 结尾
- **THEN** 文件内容 SHALL 包含 `<!DOCTYPE NETSCAPE-Bookmark-file-1>` 标识

### Requirement: 导出-导入往返测试
E2E 测试 SHALL 验证导出的文件可以被正确导入回来。

#### Scenario: PBM 格式往返
- **WHEN** 用户导出加密备份文件，然后选择"加密备份 (.pbm)"格式导入该文件
- **THEN** 导入 SHALL 成功，且导入的书签数据与导出前一致

#### Scenario: JSON 格式往返
- **WHEN** 用户导出 JSON 明文文件，然后选择"JSON 明文 (.json)"格式导入该文件
- **THEN** 导入 SHALL 成功，且导入的书签数据与导出前一致

#### Scenario: HTML 格式往返
- **WHEN** 用户导出 HTML 书签文件，然后选择"HTML 书签 (.html)"格式导入该文件
- **THEN** 导入 SHALL 成功

### Requirement: 导入格式不匹配错误处理
E2E 测试 SHALL 验证文件格式与选择的导入格式不匹配时的错误提示。

#### Scenario: 选择 HTML 格式但上传 JSON 文件
- **WHEN** 用户选择"HTML 书签"导入格式，但上传一个 `.json` 文件
- **THEN** 系统 SHALL 显示格式不匹配的错误提示

#### Scenario: 选择 JSON 格式但上传 HTML 文件
- **WHEN** 用户选择"JSON 明文"导入格式，但上传一个 `.html` 文件
- **THEN** 系统 SHALL 显示格式不匹配的错误提示

### Requirement: 覆盖导入确认流程
E2E 测试 SHALL 验证覆盖模式导入的二次确认流程。

#### Scenario: 覆盖模式显示确认弹窗
- **WHEN** 用户选择"覆盖模式"并上传文件
- **THEN** 系统 SHALL 显示确认弹窗，包含"确认覆盖"和"取消"按钮

#### Scenario: 取消覆盖导入
- **WHEN** 用户在覆盖确认弹窗中点击"取消"
- **THEN** 导入操作 SHALL 被取消，数据不受影响

### Requirement: 导入格式切换 UI 验证
E2E 测试 SHALL 验证导入格式切换时 UI 正确更新。

#### Scenario: 切换导入格式后文件选择器更新
- **WHEN** 用户切换导入格式
- **THEN** 文件选择器的 accept 属性 SHALL 更新为对应格式的扩展名

#### Scenario: 选择加密备份时显示解密密钥输入框
- **WHEN** 用户选择"加密备份 (.pbm)"导入格式
- **THEN** SHALL 显示"解密密钥"输入框
- **WHEN** 用户切换为其他格式
- **THEN** "解密密钥"输入框 SHALL 隐藏
