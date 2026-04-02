---
name: eb-feature-delivery
description: >
  Orchestrates a full feature delivery pipeline for the Encrypted Bookmark Chrome extension project.
  Coordinates Product Manager (PRD), Frontend Developer (implementation + e2e tests),
  Tester (e2e validation + bug fix loop), and Documentation updates (CHANGELOG/README/docs).
  This skill should be used when the user says "需求开发", "新功能", "feature delivery",
  "需求交付", "启动需求", or describes a new feature request for the Encrypted Bookmark project.
---

# Encrypted Bookmark - 需求全流程交付

> 本 Skill 编排从需求分析到文档沉淀的完整交付流程，协调 4 个 Agent 角色按序协作。

## 项目概览

- **项目名**：Encrypted Bookmark（加密书签管理 Chrome 扩展）
- **技术栈**：React 18 + TypeScript + Vite + @crxjs/vite-plugin + Web Crypto API
- **浏览器规范**：Manifest V3
- **E2E 测试**：Playwright（`e2e/` 目录，`npm run test:e2e`）

详细项目上下文参考 `references/project-context.md`。

## 触发条件

当用户提出新功能需求或改进需求时触发，例如：
- "新增书签分组功能"
- "支持快捷键操作"
- "优化搜索体验"
- "需求：..."

## 交付流程

严格按以下 4 个阶段顺序执行，每个阶段使用对应的 Task Agent：

### 阶段 1：产品需求分析（PRD）

**角色**：`通用产品经理`

**输入**：用户提出的原始需求

**Agent Prompt 模板**：

```
你是 Encrypted Bookmark 项目的资深产品经理。请根据以下需求完成 PRD 文档编写。

## 项目背景
请先读取以下文件了解项目现状：
- `README.md` - 项目概览与核心特性
- `CHANGELOG.md` - 版本历史与已实现功能
- `docs/QUICKSTART.md` - 用户使用指南
- `PRD/` 目录（如存在）- 历史需求文档

## 用户需求
{用户的原始需求描述}

## 输出要求
1. 先调研项目现有代码结构（`src/` 目录），了解当前功能实现
2. 输出完整 PRD 文档，包含：
   - 需求背景与目标
   - 功能清单与优先级
   - 交互流程说明
   - 页面/组件影响范围
   - 验收标准
   - 边界与异常场景
3. 将 PRD 保存到 `PRD/{需求名称}.md`
```

**产出**：`PRD/{需求名称}.md`

### 阶段 2：前端开发实现

**角色**：`通用资深前端研发`

**输入**：阶段 1 输出的 PRD 文档

**Agent Prompt 模板**：

```
你是 Encrypted Bookmark 项目的前端开发负责人。请根据 PRD 完成开发任务。

## 开发任务
1. 先读取 PRD 文档：`PRD/{需求名称}.md`
2. 研读项目现有代码结构（`src/`），理解技术实现方式
3. 阅读 `e2e/README.md` 了解 E2E 测试架构
4. 按 PRD 逐项实现功能：
   - 遵循项目现有代码风格和目录结构
   - TypeScript 优先，提供完整类型定义
   - 组件遵循 React 单一职责原则
   - 加密相关逻辑使用 Web Crypto API
5. 同步更新 E2E 测试：
   - 阅读 `e2e/` 目录下现有测试用例作为参考
   - 在 `e2e/tests/` 对应目录下新增或修改测试文件
   - 参考 `e2e/helpers/selectors.ts` 使用选择器常量
   - 参考 `e2e/helpers/chrome-storage.ts` 进行存储操作
   - 参考 `e2e/fixtures/extension.ts` 使用扩展 fixture
6. 确保代码能通过 `npm run build` 构建成功

## 注意事项
- 不修改与本次需求无关的代码
- 不做无谓的重构
- 安全相关逻辑必须严谨（加密、密码、会话管理）
```

**产出**：功能代码 + E2E 测试用例

### 阶段 3：E2E 测试验证

**角色**：`通用资深测试`

**输入**：阶段 2 的开发产出

**Agent Prompt 模板**：

```
你是 Encrypted Bookmark 项目的测试负责人。请验证阶段 2 的开发质量。

## 测试任务
1. 先读取 PRD 文档：`PRD/{需求名称}.md`
2. 阅读 E2E 测试方案：`e2e/README.md`
3. 检查新增/修改的 E2E 测试文件，评估覆盖度
4. 构建项目并运行 E2E 测试：`npm run test:e2e`
5. 分析测试结果：
   - 如果全部通过 → 输出测试报告，进入阶段 4
   - 如果存在失败 → 详细记录失败原因和复现步骤，返回阶段 2 修复

## 输出要求
- 测试覆盖度评估
- 测试执行结果（通过/失败/跳过）
- 失败用例的根因分析和修复建议
```

**产出**：测试报告；若有失败 → 回到阶段 2 修复（最多循环 3 次）

**回退机制**：测试失败时，将失败信息反馈给阶段 2 的前端开发 Agent 进行修复，修复后重新运行测试。循环不超过 3 次。

### 阶段 4：文档沉淀

**角色**：`通用资深前端研发`

**输入**：PRD + 开发产出 + 测试结果

**Agent Prompt 模板**：

```
你是 Encrypted Bookmark 项目的文档负责人。请完成本次需求交付后的文档更新。

## 文档更新任务
1. 先读取 PRD 文档：`PRD/{需求名称}.md`
2. 按以下优先级更新文档：

### CHANGELOG.md
在文件顶部新增版本记录，格式遵循 Keep a Changelog 规范：
```
## [X.X.X] - YYYY-MM-DD

### Added / Changed / Fixed
- 功能变更描述
```

### README.md
- 如果新增了核心特性 → 更新「核心特性」章节
- 如果技术栈有变化 → 更新「技术栈」章节
- 如果项目结构有变化 → 更新「项目结构」章节

### docs/QUICKSTART.md
- 如果有新功能影响用户操作 → 在对应章节补充说明
- 如果有新的设置项 → 更新设置页面说明

3. 保持文档风格与现有内容一致
```

**产出**：`CHANGELOG.md`、`README.md`、`docs/` 的增量更新

---

## 流程控制规则

1. **严格顺序执行**：阶段 1 → 2 → 3 → 4，不可跳过
2. **阶段 3 回退**：测试失败时回到阶段 2，循环上限 3 次
3. **Agent 调用方式**：使用 Task 工具调用对应 subagent_name
4. **上下文传递**：每个阶段开始时，在 prompt 中引用上一阶段的产出文件路径
5. **并行控制**：不并行启动阶段，确保前一阶段完成后再启动下一阶段

## Agent 角色映射

| 阶段 | subagent_name | 职责 |
|------|--------------|------|
| 需求分析 | `通用产品经理` | 调研项目现状，出具 PRD |
| 开发实现 | `通用资深前端研发` | 按 PRD 开发功能 + E2E 测试 |
| 测试验证 | `通用资深测试` | 运行 E2E 测试，验证质量 |
| 文档沉淀 | `通用资深前端研发` | 更新 CHANGELOG/README/docs |
