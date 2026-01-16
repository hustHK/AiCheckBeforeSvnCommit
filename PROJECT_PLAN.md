# SVN Commit AI Check - 项目计划文档

## 📋 项目概述

### 项目名称
**SVN Commit AI Check Extension** - SVN 提交智能代码审查插件

### 项目目标
为 Cursor/VSCode 开发一个扩展插件，在使用 `svn-scm` 插件进行 SVN 提交时，提供智能的代码审查功能，通过 AI 分析即将提交的代码变更，生成详细的问题报告。

### 核心功能
1. **SVN 提交拦截**：在 SVN 提交操作执行前拦截
2. **交互式确认弹窗**：询问用户是否需要 AI 代码分析
3. **智能代码分析**：调用 Cursor AI 或第三方 AI 服务进行代码审查
4. **多格式报告**：支持 Webview 展示和 Markdown 文件导出
5. **语言支持**：重点支持 C++ 和 Go 语言

---

## 🎯 需求分析（已确认）

### 功能需求

#### 1. 触发时机
- **阻塞式 Pre-commit Hook**
- 在用户点击 SVN 提交按钮后、实际提交前触发
- 用户选择 Cancel 会取消本次提交

#### 2. 分析范围
- **主要分析**：本次 SVN diff 的变更内容（新增/修改的代码）
- **上下文辅助**：结合原始文件的完整内容，提供上下文理解
- **目标**：识别即将提交代码中的问题

#### 3. 用户交互流程
```
用户点击提交 
    ↓
弹出确认对话框（OK / Cancel）
    ↓
  [OK]                    [Cancel]
    ↓                         ↓
  触发 AI 分析            直接取消提交
    ↓
显示分析进度
    ↓
展示分析报告
    ↓
用户决定是否继续提交
```

#### 4. AI 集成方案（优先级）
1. **首选**：调研 Cursor 编辑器的扩展 API（如果存在）
2. **备选 A**：模拟用户操作，通过命令调用 Cursor 的 AI Chat 功能
3. **备选 B**：集成第三方 AI API（OpenAI GPT-4 / Anthropic Claude / DeepSeek）

#### 5. 报告展示方式
- **默认**：Webview 面板展示（美观、交互性强）
- **可选**：导出为 Markdown 文件
- **功能**：支持代码高亮、问题分类、严重程度标记

#### 6. 目标语言
- **主要**：C++ 和 Go
- **扩展**：支持配置其他语言的检查规则

---

## 🏗️ 技术架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    VSCode/Cursor IDE                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         svn-scm Extension (第三方)                │  │
│  │         - SVN 操作界面                             │  │
│  │         - Source Control API                       │  │
│  └────────────────┬──────────────────────────────────┘  │
│                   │                                       │
│                   │ 监听提交事件                          │
│                   ↓                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │    SVN Commit AI Check Extension (本项目)         │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  1. Commit Interceptor (提交拦截器)         │  │  │
│  │  │     - 监听 SCM 提交事件                      │  │  │
│  │  │     - 拦截并弹窗询问                         │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  2. Diff Analyzer (差异分析器)              │  │  │
│  │  │     - 获取 SVN diff 内容                     │  │  │
│  │  │     - 解析变更文件列表                       │  │  │
│  │  │     - 读取文件完整上下文                     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  3. AI Service Manager (AI服务管理器)       │  │  │
│  │  │     - Cursor AI Adapter                      │  │  │
│  │  │     - OpenAI Adapter                         │  │  │
│  │  │     - Claude Adapter                         │  │  │
│  │  │     - Custom Prompt Templates                │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  4. Report Generator (报告生成器)           │  │  │
│  │  │     - 解析 AI 响应                           │  │  │
│  │  │     - 格式化问题列表                         │  │  │
│  │  │     - 生成 Markdown/HTML                     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  5. UI Components (UI组件)                  │  │  │
│  │  │     - Confirmation Dialog (确认对话框)       │  │  │
│  │  │     - Progress Indicator (进度指示器)        │  │  │
│  │  │     - Webview Report Panel (报告面板)        │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 核心模块说明

#### 模块 1：Commit Interceptor（提交拦截器）
**职责**：
- 监听 VSCode Source Control API 的提交事件
- 在提交前弹出确认对话框
- 根据用户选择决定是否继续流程

**技术要点**：
- 使用 `vscode.scm` API 监听 SCM 操作
- 可能需要使用 `vscode.window.showInformationMessage` 或自定义 QuickPick
- 需要研究 svn-scm 插件的事件触发机制

**潜在挑战**：
- VSCode 的 SCM API 可能不直接支持 pre-commit hook
- 可能需要通过命令拦截（Command Override）实现
- 需要确保不影响原有的 SVN 提交流程

#### 模块 2：Diff Analyzer（差异分析器）
**职责**：
- 调用 SVN 命令获取 diff 内容
- 解析变更文件列表和具体变更
- 读取完整文件内容作为上下文

**技术实现**：
```bash
# 获取暂存的变更
svn diff --changelist <changelist-name>

# 获取所有未提交的变更
svn diff

# 获取变更文件列表
svn status
```

**数据结构**：
```typescript
interface FileChange {
  path: string;              // 文件路径
  status: 'added' | 'modified' | 'deleted';
  diffContent: string;       // diff 内容
  fullContent?: string;      // 完整文件内容（仅对 added/modified）
  language: string;          // 编程语言
}

interface CommitContext {
  changes: FileChange[];
  commitMessage?: string;    // 提交信息（如果已填写）
}
```

#### 模块 3：AI Service Manager（AI 服务管理器）
**职责**：
- 管理多种 AI 服务的适配器
- 构建 Prompt 并调用 AI API
- 处理 AI 响应并提取关键信息

**AI 集成方案详细设计**：

##### 方案 A：Cursor AI Integration（优先调研）
```typescript
// 尝试使用 Cursor 的扩展 API（如果存在）
interface CursorAIService {
  analyzeCode(code: string, prompt: string): Promise<string>;
}

// 如果无直接 API，尝试通过命令调用
vscode.commands.executeCommand('cursor.chat.sendMessage', {
  message: generatedPrompt,
  context: codeContext
});
```

**调研重点**：
- Cursor 是否提供扩展可调用的 AI API
- 是否可以通过命令面板或命令 ID 触发 AI Chat
- 是否可以获取 AI Chat 的响应结果

##### 方案 B：OpenAI API
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: configuration.get('openaiApiKey')
});

const response = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: generateUserPrompt(commitContext)
    }
  ],
  temperature: 0.3
});
```

##### 方案 C：Anthropic Claude API
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: configuration.get('anthropicApiKey')
});

const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: generateUserPrompt(commitContext)
    }
  ],
  system: SYSTEM_PROMPT
});
```

**Prompt 模板设计**：

```typescript
const SYSTEM_PROMPT = `
你是一个专业的代码审查专家，专注于 C++ 和 Go 语言。
你的任务是分析即将提交的代码变更，识别潜在的问题。

请重点关注以下方面：
1. **代码质量问题**
   - 逻辑错误和潜在 bug
   - 性能问题（内存泄漏、低效算法等）
   - 线程安全问题（race condition、deadlock 等）

2. **代码规范问题**
   - 命名规范
   - 代码格式
   - 注释完整性

3. **安全问题**
   - 缓冲区溢出
   - 空指针解引用
   - 资源管理问题
   - 输入验证问题

4. **最佳实践违反**
   - 不符合语言惯用法
   - 违反 SOLID 原则
   - 过度复杂的设计

请以结构化的格式输出，包括：
- 问题严重程度（Critical / High / Medium / Low）
- 问题位置（文件和行号）
- 问题描述
- 修复建议
`;

function generateUserPrompt(context: CommitContext): string {
  let prompt = "请审查以下代码变更：\n\n";
  
  context.changes.forEach(change => {
    prompt += `## 文件: ${change.path} (${change.status})\n\n`;
    
    if (change.status === 'deleted') {
      prompt += "该文件已删除\n\n";
      return;
    }
    
    prompt += "### 变更内容（Diff）：\n";
    prompt += "```diff\n";
    prompt += change.diffContent;
    prompt += "\n```\n\n";
    
    if (change.fullContent) {
      prompt += "### 完整文件内容（上下文参考）：\n";
      prompt += `\`\`\`${change.language}\n`;
      prompt += change.fullContent;
      prompt += "\n```\n\n";
    }
  });
  
  if (context.commitMessage) {
    prompt += `## 提交信息：\n${context.commitMessage}\n\n`;
  }
  
  prompt += "请分析上述代码变更，指出所有潜在问题。";
  
  return prompt;
}
```

#### 模块 4：Report Generator（报告生成器）
**职责**：
- 解析 AI 返回的分析结果
- 生成结构化的报告数据
- 渲染为 HTML（Webview）或 Markdown 文件

**数据结构**：
```typescript
interface CodeIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  title: string;
  description: string;
  suggestion?: string;
  codeSnippet?: string;
}

interface AnalysisReport {
  timestamp: Date;
  commitContext: CommitContext;
  issues: CodeIssue[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  aiModel: string;
}
```

**Markdown 模板**：
```markdown
# SVN 提交代码审查报告

**生成时间**: {timestamp}  
**AI 模型**: {aiModel}  
**文件数量**: {fileCount}  
**问题总数**: {totalIssues}

---

## 📊 问题概览

| 严重程度 | 数量 |
|---------|------|
| 🔴 Critical | {criticalCount} |
| 🟠 High     | {highCount} |
| 🟡 Medium   | {mediumCount} |
| 🟢 Low      | {lowCount} |

---

## 🔍 详细问题列表

{问题列表，按严重程度排序}
```

**Webview HTML 模板**：
- 使用 Vue.js 或原生 Web Components
- 支持问题筛选（按严重程度、文件）
- 支持代码高亮显示
- 提供"导出为 Markdown"按钮
- 提供"继续提交"和"取消提交"操作按钮

#### 模块 5：UI Components（UI 组件）
**职责**：
- 提供用户交互界面
- 展示分析进度和结果

**组件清单**：

1. **确认对话框（Confirmation Dialog）**
   ```typescript
   const choice = await vscode.window.showInformationMessage(
     '是否需要 AI 智能分析本次提交的代码？',
     { modal: true },
     'OK',
     'Cancel'
   );
   ```

2. **进度指示器（Progress Indicator）**
   ```typescript
   vscode.window.withProgress({
     location: vscode.ProgressLocation.Notification,
     title: "正在分析代码...",
     cancellable: true
   }, async (progress, token) => {
     // 执行 AI 分析
   });
   ```

3. **Webview 报告面板（Report Panel）**
   - 使用 `vscode.window.createWebviewPanel`
   - 支持与扩展后端通信（postMessage）
   - 响应式布局

---

## 🔧 技术栈

### 核心技术
- **开发语言**: TypeScript
- **框架**: VSCode Extension API
- **包管理**: npm / yarn
- **构建工具**: webpack / esbuild

### 依赖库
```json
{
  "dependencies": {
    "vscode": "^1.85.0",
    "@types/vscode": "^1.85.0",
    "openai": "^4.0.0",              // OpenAI SDK
    "@anthropic-ai/sdk": "^0.9.0",   // Claude SDK
    "marked": "^11.0.0",              // Markdown 解析
    "highlight.js": "^11.9.0"         // 代码高亮
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "@vscode/test-electron": "^2.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

### VSCode Extension APIs
- `vscode.scm`: Source Control Management API
- `vscode.commands`: 命令注册与执行
- `vscode.window`: UI 交互（对话框、Webview、进度条）
- `vscode.workspace`: 工作区文件操作
- `vscode.extensions`: 扩展间通信

---

## 📝 关键技术挑战与解决方案

### 挑战 1：如何拦截 SVN 提交操作？

**问题**：
VSCode 的 SCM API 没有直接提供 pre-commit hook 机制。

**可能的解决方案**：

**方案 A：命令覆盖（Command Override）**
```typescript
// 覆盖 svn-scm 的提交命令
const originalCommand = 'svn.commit';
const disposable = vscode.commands.registerCommand(originalCommand, async (...args) => {
  // 拦截逻辑
  const shouldAnalyze = await showConfirmationDialog();
  
  if (shouldAnalyze) {
    await performAIAnalysis();
  }
  
  // 调用原始命令
  return vscode.commands.executeCommand('svn.commitWithInput', ...args);
});
```

**方案 B：监听 SCM Input Box 变化**
```typescript
const scm = vscode.scm.createSourceControl('svn-ai-check', 'SVN AI Check');
scm.inputBox.value = ''; // 监听用户输入提交信息
```

**方案 C：文件系统监听（File Watcher）**
```typescript
// 监听 .svn 目录的变化（不推荐，可靠性差）
const watcher = vscode.workspace.createFileSystemWatcher('**/.svn/**');
```

**推荐方案**：方案 A（命令覆盖），结合对 svn-scm 扩展源码的分析。

### 挑战 2：如何调用 Cursor 的 AI 功能？

**调研方向**：
1. 查看 Cursor 官方文档是否提供扩展 API
2. 反编译 Cursor 查看是否有隐藏的命令 ID
3. 尝试通过 IPC 或 WebSocket 与 Cursor 的 AI 服务通信

**当前已知信息**：
- Cursor 基于 VSCode fork，很可能没有公开的 AI API
- 可能需要使用"模拟用户操作"的方式（通过命令触发 Chat）

**备用方案**：
如果 Cursor 无法直接集成，提供配置选项让用户选择：
- OpenAI GPT-4
- Anthropic Claude
- DeepSeek API
- 自定义 API 端点

### 挑战 3：如何高效处理大型 Diff？

**问题**：
如果一次提交包含大量文件或大文件，可能超出 AI 的 token 限制。

**解决方案**：

1. **智能过滤**：
   - 只分析代码文件（.cpp, .go, .h, .hpp 等）
   - 忽略自动生成的文件、依赖文件
   - 配置文件大小上限（如 10KB）

2. **分批处理**：
   - 将变更文件分组（按语言或模块）
   - 对每组分别调用 AI
   - 合并分析结果

3. **上下文优化**：
   - 对于小改动，只发送 diff + 周围 N 行上下文
   - 对于大改动，发送完整文件但截断无关部分

4. **Token 计数**：
   ```typescript
   function estimateTokenCount(text: string): number {
     // 粗略估算：1 token ≈ 4 个字符
     return Math.ceil(text.length / 4);
   }
   
   function optimizeContext(change: FileChange, maxTokens: number): FileChange {
     const diffTokens = estimateTokenCount(change.diffContent);
     const remainingTokens = maxTokens - diffTokens - 1000; // 预留 1000 给 prompt
     
     if (remainingTokens <= 0) {
       // 只发送 diff
       return { ...change, fullContent: undefined };
     }
     
     // 截断完整内容
     const maxChars = remainingTokens * 4;
     if (change.fullContent && change.fullContent.length > maxChars) {
       change.fullContent = change.fullContent.substring(0, maxChars) + '\n\n... (已截断)';
     }
     
     return change;
   }
   ```

### 挑战 4：如何确保不阻塞用户操作？

**问题**：
AI 分析可能需要较长时间（10-30秒），不能让用户长时间等待。

**解决方案**：

1. **异步处理 + 进度反馈**：
   ```typescript
   await vscode.window.withProgress({
     location: vscode.ProgressLocation.Notification,
     title: "AI 代码分析进行中...",
     cancellable: true
   }, async (progress, token) => {
     progress.report({ increment: 0, message: "获取代码变更..." });
     const changes = await getDiffChanges();
     
     progress.report({ increment: 30, message: "调用 AI 服务..." });
     const analysis = await aiService.analyze(changes, token);
     
     progress.report({ increment: 80, message: "生成报告..." });
     const report = await generateReport(analysis);
     
     progress.report({ increment: 100, message: "完成！" });
     return report;
   });
   ```

2. **支持取消操作**：
   - 在进度条中提供"取消"按钮
   - 使用 CancellationToken 传递到 AI 调用
   - 取消后恢复正常提交流程或完全取消提交

3. **缓存机制**（可选）：
   - 对相同的 diff 内容缓存 AI 分析结果（基于 hash）
   - 设置缓存过期时间（如 1 小时）

---

## 🗂️ 项目结构

```
svn-commit-ai-check/
├── .vscode/
│   ├── launch.json              # 调试配置
│   └── tasks.json               # 构建任务
├── src/
│   ├── extension.ts             # 扩展入口
│   ├── config/
│   │   ├── settings.ts          # 配置管理
│   │   └── prompts.ts           # Prompt 模板
│   ├── core/
│   │   ├── commitInterceptor.ts # 提交拦截器
│   │   ├── diffAnalyzer.ts      # Diff 分析器
│   │   └── svnCommand.ts        # SVN 命令封装
│   ├── ai/
│   │   ├── aiServiceManager.ts  # AI 服务管理器
│   │   ├── adapters/
│   │   │   ├── cursorAdapter.ts # Cursor AI 适配器
│   │   │   ├── openaiAdapter.ts # OpenAI 适配器
│   │   │   └── claudeAdapter.ts # Claude 适配器
│   │   └── promptBuilder.ts     # Prompt 构建器
│   ├── report/
│   │   ├── reportGenerator.ts   # 报告生成器
│   │   ├── markdownFormatter.ts # Markdown 格式化
│   │   └── htmlFormatter.ts     # HTML 格式化
│   ├── ui/
│   │   ├── confirmationDialog.ts # 确认对话框
│   │   ├── progressIndicator.ts  # 进度指示器
│   │   └── webview/
│   │       ├── reportPanel.ts    # Webview 面板控制器
│   │       └── assets/
│   │           ├── index.html    # Webview HTML 模板
│   │           ├── style.css     # 样式
│   │           └── script.js     # 前端脚本
│   ├── utils/
│   │   ├── logger.ts            # 日志工具
│   │   ├── fileUtils.ts         # 文件操作工具
│   │   └── tokenCounter.ts      # Token 计数工具
│   └── types/
│       ├── index.d.ts           # 类型定义
│       └── models.ts            # 数据模型
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── diffAnalyzer.test.ts
│   │   └── reportGenerator.test.ts
│   └── fixtures/                # 测试数据
├── resources/
│   ├── icon.png                 # 扩展图标
│   └── prompts/
│       ├── cpp-default.txt      # C++ 默认 Prompt
│       └── go-default.txt       # Go 默认 Prompt
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── package.json                 # 扩展清单
├── tsconfig.json                # TypeScript 配置
├── webpack.config.js            # Webpack 配置
├── README.md                    # 用户文档
├── CHANGELOG.md                 # 版本更新日志
└── PROJECT_PLAN.md              # 本文档
```

---

## 📅 开发计划（分阶段实施）

### 第一阶段：基础框架搭建（1-2 天）

**目标**：建立项目骨架，实现基本的扩展结构。

**任务清单**：
- [x] 需求分析与技术调研
- [ ] 初始化 VSCode 扩展项目
  ```bash
  npm install -g yo generator-code
  yo code
  ```
- [ ] 配置 TypeScript、ESLint、Prettier
- [ ] 创建基本的目录结构
- [ ] 实现配置管理模块（读取用户配置）
- [ ] 编写日志工具（用于调试）

**交付物**：
- 可运行的空白扩展（F5 启动调试）
- 基本的配置项（settings.json）

---

### 第二阶段：SVN 集成（2-3 天）

**目标**：实现 SVN 提交拦截和 diff 获取功能。

**任务清单**：
- [ ] 研究 svn-scm 扩展的命令结构
  - 查看 svn-scm 的 package.json 中的命令定义
  - 测试不同的命令触发方式
- [ ] 实现命令拦截器（Commit Interceptor）
  - 注册自定义命令覆盖 `svn.commit`
  - 实现弹窗确认逻辑
- [ ] 实现 SVN 命令封装（svnCommand.ts）
  - `svn diff`
  - `svn status`
  - 错误处理
- [ ] 实现 Diff 分析器（diffAnalyzer.ts）
  - 解析 diff 输出
  - 提取变更文件列表
  - 读取完整文件内容
- [ ] 单元测试

**交付物**：
- 可以拦截 SVN 提交操作
- 可以获取并解析 diff 内容
- 测试用例通过

---

### 第三阶段：AI 服务集成（3-5 天）

**目标**：实现 AI 代码分析功能。

**任务清单**：
- [ ] **Cursor AI 调研**（1 天）
  - 查阅 Cursor 官方文档和社区
  - 尝试反编译或查看 Cursor 的命令列表
  - 测试是否可以通过命令调用 AI Chat
  - 编写调研报告，确定是否可行
  
- [ ] **AI 适配器实现**（2 天）
  - 实现 AI 服务接口定义（aiServiceManager.ts）
  - 实现 OpenAI 适配器（openaiAdapter.ts）
  - 实现 Claude 适配器（claudeAdapter.ts）
  - （可选）实现 Cursor 适配器（如果调研成功）
  - 支持自定义 API 端点配置
  
- [ ] **Prompt 设计与优化**（1 天）
  - 编写 C++ 代码审查 Prompt
  - 编写 Go 代码审查 Prompt
  - 实现 Prompt 模板引擎（promptBuilder.ts）
  - 支持用户自定义 Prompt
  
- [ ] **Token 优化与分批处理**（1 天）
  - 实现 Token 计数工具（tokenCounter.ts）
  - 实现上下文截断逻辑
  - 实现大 diff 的分批处理
  
- [ ] **单元测试与集成测试**
  - Mock AI 服务响应
  - 测试不同大小的 diff 处理

**交付物**：
- 可以调用 OpenAI/Claude API 进行代码分析
- （可选）可以调用 Cursor AI
- Prompt 模板可配置
- 支持大文件的智能处理

---

### 第四阶段：报告生成与展示（2-3 天）

**目标**：实现分析结果的展示和导出功能。

**任务清单**：
- [ ] 实现报告数据模型（types/models.ts）
  - `CodeIssue` 接口
  - `AnalysisReport` 接口
  
- [ ] 实现报告生成器（reportGenerator.ts）
  - 解析 AI 响应（可能是 Markdown 或 JSON）
  - 提取问题列表
  - 计算统计信息
  
- [ ] 实现 Markdown 格式化器（markdownFormatter.ts）
  - 生成美观的 Markdown 报告
  - 支持代码高亮（通过代码块语法）
  - 保存到工作区文件
  
- [ ] 实现 Webview 报告面板（reportPanel.ts）
  - 创建 Webview Panel
  - 渲染 HTML 报告
  - 实现前端交互逻辑（script.js）
    - 问题筛选
    - 跳转到代码位置
    - 导出为 Markdown
    - 继续/取消提交
  
- [ ] 设计 UI 样式（style.css）
  - 使用 VSCode 的 Webview UI Toolkit（可选）
  - 响应式设计
  - 深色/浅色主题适配

**交付物**：
- 美观的 Webview 报告展示
- 支持导出为 Markdown 文件
- 交互功能完整

---

### 第五阶段：用户体验优化（1-2 天）

**目标**：提升插件的易用性和稳定性。

**任务清单**：
- [ ] 实现进度指示器（progressIndicator.ts）
  - 显示 AI 分析进度
  - 支持取消操作
  
- [ ] 错误处理优化
  - 网络错误（API 调用失败）
  - SVN 命令错误
  - 配置错误（API Key 未设置）
  - 友好的错误提示
  
- [ ] 配置界面优化
  - 提供配置向导（首次使用引导）
  - 配置项的详细说明
  
- [ ] 性能优化
  - 减少不必要的文件读取
  - 优化 Webview 渲染性能
  - 添加缓存机制（可选）

**交付物**：
- 用户体验流畅
- 错误提示清晰
- 性能稳定

---

### 第六阶段：测试与文档（1-2 天）

**目标**：完善测试用例和用户文档。

**任务清单**：
- [ ] 编写完整的单元测试
  - 核心模块覆盖率 > 80%
  
- [ ] 编写集成测试
  - 端到端流程测试
  
- [ ] 编写用户文档（README.md）
  - 功能介绍
  - 安装指南
  - 配置说明
  - 使用教程（带截图）
  - 常见问题（FAQ）
  
- [ ] 编写开发者文档
  - 架构说明
  - API 文档
  - 贡献指南
  
- [ ] 编写 CHANGELOG.md
  - 版本历史
  - 功能更新

**交付物**：
- 完整的测试套件
- 详细的用户和开发者文档

---

### 第七阶段：打包与发布（半天）

**目标**：发布扩展到 VSCode Marketplace 或 Open VSX。

**任务清单**：
- [ ] 配置 package.json
  - 填写完整的元数据
  - 设置发布信息
  
- [ ] 生成 VSIX 包
  ```bash
  vsce package
  ```
  
- [ ] 本地测试 VSIX 安装
  ```bash
  code --install-extension svn-commit-ai-check-0.1.0.vsix
  ```
  
- [ ] （可选）发布到 VSCode Marketplace
  ```bash
  vsce publish
  ```
  
- [ ] （可选）发布到 Open VSX Registry
  ```bash
  ovsx publish
  ```

**交付物**：
- 可安装的 VSIX 文件
- （可选）公开发布的扩展

---

## ⚙️ 配置项设计

### settings.json 配置

```json
{
  "svn-commit-ai-check.enabled": {
    "type": "boolean",
    "default": true,
    "description": "启用或禁用 SVN 提交 AI 检查"
  },
  "svn-commit-ai-check.autoCheck": {
    "type": "boolean",
    "default": false,
    "description": "每次提交时自动进行 AI 检查（不弹窗询问）"
  },
  "svn-commit-ai-check.aiProvider": {
    "type": "string",
    "enum": ["cursor", "openai", "claude", "custom"],
    "default": "openai",
    "description": "AI 服务提供商"
  },
  "svn-commit-ai-check.openai.apiKey": {
    "type": "string",
    "default": "",
    "description": "OpenAI API Key"
  },
  "svn-commit-ai-check.openai.model": {
    "type": "string",
    "default": "gpt-4-turbo-preview",
    "description": "OpenAI 模型名称"
  },
  "svn-commit-ai-check.openai.baseUrl": {
    "type": "string",
    "default": "https://api.openai.com/v1",
    "description": "OpenAI API Base URL（支持自定义端点）"
  },
  "svn-commit-ai-check.claude.apiKey": {
    "type": "string",
    "default": "",
    "description": "Anthropic Claude API Key"
  },
  "svn-commit-ai-check.claude.model": {
    "type": "string",
    "default": "claude-3-5-sonnet-20241022",
    "description": "Claude 模型名称"
  },
  "svn-commit-ai-check.custom.apiUrl": {
    "type": "string",
    "default": "",
    "description": "自定义 AI API URL"
  },
  "svn-commit-ai-check.custom.apiKey": {
    "type": "string",
    "default": "",
    "description": "自定义 AI API Key"
  },
  "svn-commit-ai-check.prompt.system": {
    "type": "string",
    "default": "",
    "description": "自定义系统 Prompt（留空使用默认）"
  },
  "svn-commit-ai-check.analysis.languages": {
    "type": "array",
    "items": { "type": "string" },
    "default": ["cpp", "c", "go", "h", "hpp"],
    "description": "需要分析的文件扩展名"
  },
  "svn-commit-ai-check.analysis.maxFileSize": {
    "type": "number",
    "default": 102400,
    "description": "分析的最大文件大小（字节），超过则忽略"
  },
  "svn-commit-ai-check.analysis.includeFullContext": {
    "type": "boolean",
    "default": true,
    "description": "是否包含完整文件内容作为上下文"
  },
  "svn-commit-ai-check.analysis.maxTokens": {
    "type": "number",
    "default": 8000,
    "description": "单次分析的最大 Token 数"
  },
  "svn-commit-ai-check.report.defaultView": {
    "type": "string",
    "enum": ["webview", "markdown"],
    "default": "webview",
    "description": "报告的默认展示方式"
  },
  "svn-commit-ai-check.report.autoSaveMarkdown": {
    "type": "boolean",
    "default": true,
    "description": "自动保存 Markdown 报告到工作区"
  },
  "svn-commit-ai-check.report.markdownPath": {
    "type": "string",
    "default": ".ai-check-reports",
    "description": "Markdown 报告保存路径（相对于工作区根目录）"
  }
}
```

---

## 🧪 测试策略

### 单元测试
- 使用 Mocha + Chai
- 每个核心模块都有对应的测试文件
- Mock 外部依赖（SVN 命令、AI API）

### 集成测试
- 使用 VSCode Extension Test Runner
- 测试完整的提交流程
- 测试不同配置下的行为

### 手动测试清单
- [ ] 首次安装体验
- [ ] 配置 API Key 流程
- [ ] 正常提交流程（选择 OK）
- [ ] 取消提交流程（选择 Cancel）
- [ ] 大文件处理
- [ ] 网络错误处理
- [ ] Webview 交互
- [ ] Markdown 导出
- [ ] 多语言文件混合提交

---

## 📊 风险评估与应对

### 风险 1：Cursor AI 无法直接集成
**影响**：高  
**概率**：高  
**应对**：
- 优先使用 OpenAI/Claude 作为主要方案
- 在文档中说明 Cursor 的限制
- 未来持续关注 Cursor 是否开放 API

### 风险 2：SVN 提交无法可靠拦截
**影响**：致命  
**概率**：中  
**应对**：
- 多方案测试（命令覆盖、事件监听）
- 如果无法拦截，降级为"提交后分析"模式
- 咨询 VSCode 社区和 svn-scm 作者

### 风险 3：AI 分析时间过长
**影响**：中  
**概率**：高  
**应对**：
- 实现异步处理和进度反馈
- 提供取消功能
- 优化 Prompt 减少响应时间
- 考虑使用更快的模型（如 GPT-3.5）

### 风险 4：Token 限制导致无法分析大改动
**影响**：中  
**概率**：中  
**应对**：
- 智能分批处理
- 优先分析关键文件
- 提供配置选项让用户选择分析范围

---

## 📈 未来扩展功能

### v1.0 之后的可能功能
1. **支持更多语言**
   - Python、Java、JavaScript、Rust 等
   
2. **自定义规则引擎**
   - 用户可以定义自己的检查规则
   - 结合 ESLint、Clang-Tidy 等静态分析工具
   
3. **团队协作功能**
   - 分享 Prompt 模板
   - 统计团队的代码质量趋势
   
4. **学习功能**
   - 根据用户反馈（"这个问题有用" / "这个是误报"）优化 Prompt
   
5. **Git 支持**
   - 扩展到支持 Git 提交检查
   
6. **CI/CD 集成**
   - 提供命令行工具，可在 CI 流水线中使用

---

## 📞 需要确认的问题（待补充）

1. **性能要求**：
   - 用户可以接受多长的分析时间？（10秒？30秒？）
   
2. **报告详细程度**：
   - 是否需要 AI 提供修复建议的代码示例？
   
3. **历史记录**：
   - 是否需要保存历史分析报告？
   
4. **通知方式**：
   - 除了报告，是否需要其他形式的通知（如系统通知）？

---

## 📚 参考资料

### VSCode Extension 开发
- [VSCode Extension API](https://code.visualstudio.com/api)
- [VSCode Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)

### AI API 文档
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

### SVN 相关
- [SVN Book](https://svnbook.red-bean.com/)
- [svn-scm Extension](https://github.com/JohnstonCode/svn-scm)

---

## 🎯 成功标准

项目成功的标志：
1. ✅ 可以可靠地拦截 SVN 提交操作
2. ✅ 可以正确获取并解析 diff 内容
3. ✅ 可以调用至少一种 AI 服务进行代码分析
4. ✅ 可以生成清晰、有用的分析报告
5. ✅ 用户体验流畅，没有明显的卡顿或错误
6. ✅ 文档完整，用户可以轻松配置和使用
7. ✅ 代码质量高，易于维护和扩展

---

## 📝 总结

本项目旨在通过 AI 技术提升 SVN 提交的代码质量，重点关注 C++ 和 Go 语言。通过阻塞式的 pre-commit hook，在用户提交前提供智能的代码审查，帮助开发者在提交前发现潜在问题。

项目采用模块化设计，支持多种 AI 服务提供商，提供灵活的配置选项和美观的报告展示。虽然存在一些技术挑战（如 Cursor AI 集成、SVN 提交拦截），但通过充分的调研和多方案设计，这些挑战是可以克服的。

预计开发周期为 **10-15 天**，分七个阶段逐步实现。第一版（v0.1.0）将包含核心功能，后续版本可以根据用户反馈持续优化和扩展。

---

**文档版本**: v1.0  
**最后更新**: 2026-01-15  
**作者**: AI 智能编程助手  
**审核状态**: ⏳ 待用户审核和确认
