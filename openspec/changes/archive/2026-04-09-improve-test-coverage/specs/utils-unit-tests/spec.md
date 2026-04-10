## ADDED Requirements

### Requirement: passwordHasher 单元测试
系统 SHALL 为 passwordHasher 工具函数提供单元测试，覆盖密码哈希和验证。

#### Scenario: 哈希密码
- **WHEN** 调用 hashPassword() 传入明文密码
- **THEN** 返回不可逆的哈希值，且每次调用结果不同（含盐值）

#### Scenario: 验证正确密码
- **WHEN** 调用验证方法传入正确密码和对应哈希
- **THEN** 返回验证通过

#### Scenario: 验证错误密码
- **WHEN** 调用验证方法传入错误密码和哈希
- **THEN** 返回验证失败

### Requirement: passwordValidator 单元测试
系统 SHALL 为 passwordValidator 提供单元测试，覆盖密码强度校验规则。

#### Scenario: 有效密码通过校验
- **WHEN** 传入满足所有规则的密码（长度、复杂度等）
- **THEN** 返回校验通过

#### Scenario: 过短密码被拒绝
- **WHEN** 传入长度不足的密码
- **THEN** 返回校验失败，包含长度不足的错误信息

#### Scenario: 缺少特殊字符被拒绝
- **WHEN** 传入缺少必要字符类型的密码
- **THEN** 返回校验失败，包含具体缺失的字符类型

#### Scenario: 空密码被拒绝
- **WHEN** 传入空字符串
- **THEN** 返回校验失败

### Requirement: xssProtection 单元测试
系统 SHALL 为 xssProtection 提供单元测试，覆盖 XSS 防护功能。

#### Scenario: 转义 HTML 标签
- **WHEN** 传入包含 `<script>` 标签的字符串
- **THEN** 返回转义后的安全字符串

#### Scenario: 转义特殊字符
- **WHEN** 传入包含 `&`、`<`、`>`、`"`、`'` 的字符串
- **THEN** 所有特殊字符被正确转义

#### Scenario: 安全字符串不变
- **WHEN** 传入不含特殊字符的普通文本
- **THEN** 返回原始字符串不变

#### Scenario: 处理 null/undefined
- **WHEN** 传入 null 或 undefined
- **THEN** 返回空字符串或安全默认值，不抛出异常

### Requirement: favicon 工具函数单元测试
系统 SHALL 为 favicon 工具函数提供单元测试。

#### Scenario: 从 URL 生成 favicon 地址
- **WHEN** 传入有效的网站 URL
- **THEN** 返回对应的 favicon URL

#### Scenario: 无效 URL 处理
- **WHEN** 传入无效的 URL
- **THEN** 返回默认 favicon 或空值，不抛出异常

### Requirement: helpers 工具函数单元测试
系统 SHALL 为 helpers 中的通用工具函数提供单元测试。

#### Scenario: 各工具函数正确执行
- **WHEN** 调用 helpers 中导出的各个工具函数
- **THEN** 返回预期结果

### Requirement: HtmlParser 单元测试
系统 SHALL 为 HtmlParser 提供单元测试，覆盖 HTML 书签文件解析。

#### Scenario: 解析标准 Netscape 书签格式
- **WHEN** 传入标准的 Netscape Bookmark HTML 文件内容
- **THEN** 正确解析出书签列表，包含标题、URL、文件夹结构

#### Scenario: 解析包含嵌套文件夹的 HTML
- **WHEN** 传入包含多层嵌套 `<DL>` 标签的 HTML
- **THEN** 正确还原文件夹层级关系

#### Scenario: 解析空文件
- **WHEN** 传入空的 HTML 内容
- **THEN** 返回空的书签列表，不抛出异常

#### Scenario: 解析格式异常的 HTML
- **WHEN** 传入标签不闭合或格式错误的 HTML
- **THEN** 尽可能解析有效内容，不崩溃

### Requirement: HtmlGenerator 单元测试
系统 SHALL 为 HtmlGenerator 提供单元测试，覆盖 HTML 书签文件生成。

#### Scenario: 生成标准 Netscape 书签格式
- **WHEN** 传入书签数据列表
- **THEN** 生成符合 Netscape Bookmark 格式的 HTML 字符串

#### Scenario: 生成包含文件夹的 HTML
- **WHEN** 传入包含文件夹结构的书签数据
- **THEN** 生成正确嵌套的 `<DL>` 结构

#### Scenario: 空数据生成
- **WHEN** 传入空的书签列表
- **THEN** 生成有效的空 HTML 文档结构

### Requirement: JsonParser 单元测试
系统 SHALL 为 JsonParser 提供单元测试，覆盖 JSON 格式的书签数据解析。

#### Scenario: 解析有效 JSON
- **WHEN** 传入有效的 JSON 书签数据
- **THEN** 正确解析出书签对象列表

#### Scenario: 解析无效 JSON
- **WHEN** 传入格式错误的 JSON 字符串
- **THEN** 抛出解析错误

#### Scenario: 解析缺少必要字段的 JSON
- **WHEN** 传入缺少 title 或 url 字段的 JSON 数据
- **THEN** 进行合理的默认值填充或报告字段缺失
