# SVN Commit AI Check

[![VSCode](https://img.shields.io/badge/VSCode-1.85+-blue.svg)](https://code.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-支持-green.svg)](https://cursor.sh/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](./README.md)

一款基于 AI 的 SVN 提交代码审查扩展，专为 VSCode 和 Cursor 编辑器设计。重点支持 C++ 和 Go 代码分析，具备智能问题检测和严重程度分级功能。

## 功能特性

- **智能环境检测**：自动识别 Cursor 或 VSCode 环境并相应调整
- **多 AI 服务商支持**：支持 Cursor AI、DeepSeek、Claude 和 OpenAI
- **提交拦截**：在 SVN 提交前提示进行 AI 代码审查
- **美观的 WebView 结果展示**：在精美渲染的 Markdown 面板中显示分析结果
- **问题严重程度分级**：P0（严重）、P1（中等）、P2（轻微）三级分类
- **类 Cursor 风格配置界面**：为 VSCode 用户提供现代化配置面板
- **依赖自动安装**：自动提示安装所需的 SVN 扩展

## 界面截图

### AI 分析结果面板
分析结果在美观的 WebView 面板中展示，支持完整的 Markdown 渲染：

```
┌─────────────────────────────────────────────────────┐
│ 🔍 AI Code Review           DeepSeek  📋 💾 ✓     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  # SVN Commit AI Check 报告                         │
│                                                     │
│  ## 📊 执行摘要                                     │
│  文件数: 3 | 🔴 P0: 1 | 🟡 P1: 2 | 🔵 P2: 1       │
│                                                     │
│  ## 🔴 P0 严重问题                                  │
│  ### P0-1: PlayerManager 内存泄漏                   │
│  文件: `src/player.cpp`                            │
│  ...                                               │
└─────────────────────────────────────────────────────┘
```

### 配置面板 (VSCode)
类似 Cursor 风格的 AI 服务商选择配置面板：

```
┌─────────────────────────────────────────────────────┐
│ ⚙️ AI 服务配置                         📝 ✓        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  选择 AI 服务提供商                                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ ⚡       │  │ 🤖       │  │ 🧠       │         │
│  │ DeepSeek │  │ Claude   │  │ OpenAI   │         │
│  │ ✓ 已配置 │  │ ○ 未配置 │  │ ○ 未配置 │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 安装

### 前置要求
- VSCode 1.85.0+ 或 Cursor
- [SVN SCM 扩展](https://marketplace.visualstudio.com/items?itemName=johnstoncode.svn-scm)（会自动提示安装）

### 从 VSIX 安装
1. 从 releases 下载 `.vsix` 文件
2. 在 VSCode/Cursor 中：`扩展` > `...` > `从 VSIX 安装...`
3. 选择下载的文件

### 从源码构建
```bash
git clone https://github.com/danahuang/AiCheckBeforeSvnCommit.git
cd AiCheckBeforeSvnCommit
npm install
npm run compile
```

## 快速开始

1. **打开 SVN 仓库**：打开包含 `.svn` 目录的文件夹
2. **修改代码**：编辑你的 C++ 或 Go 文件
3. **使用 AI 检查提交**：
   - 点击 SCM 面板中的闪光图标（✨），或
   - 使用命令面板：`SVN: Commit with AI Check`
4. **查看结果**：在 WebView 面板中查看 AI 分析结果
5. **继续或取消**：选择继续提交或先修复问题

## 命令列表

| 命令 | 说明 |
|------|------|
| `SVN: Commit with AI Check` | 使用 AI 代码审查后提交 |
| `SVN: Analyze Changes with AI` | 仅运行 AI 分析，不提交 |
| `SVN: Quick Commit (Skip AI Check)` | 跳过 AI 审查直接提交 |
| `SVN: Configure AI Check` | 打开扩展设置 |
| `SVN AI: Check Dependencies` | 检查所需扩展依赖 |
| `SVN AI: Install Missing Dependencies` | 安装缺失的依赖 |

## 配置选项

### 设置项

| 设置 | 默认值 | 说明 |
|------|--------|------|
| `svn-commit-ai-check.enabled` | `true` | 启用/禁用扩展 |
| `svn-commit-ai-check.interceptCommit` | `true` | 提交前显示 AI 检查提示 |
| `svn-commit-ai-check.autoCheck` | `false` | 自动运行 AI 检查，无需提示 |
| `svn-commit-ai-check.aiProvider` | `auto` | AI 服务商：`auto`、`cursor`、`deepseek`、`claude`、`openai` |
| `svn-commit-ai-check.deepseek.apiKey` | - | DeepSeek API 密钥 |
| `svn-commit-ai-check.claude.apiKey` | - | Anthropic Claude API 密钥 |
| `svn-commit-ai-check.openai.apiKey` | - | OpenAI API 密钥 |
| `svn-commit-ai-check.analysis.languages` | `["cpp", "c", "go", ...]` | 要分析的文件扩展名 |
| `svn-commit-ai-check.analysis.maxFileSize` | `102400` | 分析的最大文件大小（字节） |

## AI 服务商

### Cursor AI（仅限 Cursor 编辑器）
- **费用**：免费（使用你的 Cursor 订阅）
- **配置**：无需配置
- **方式**：尝试 Language Model API、Composer 命令或内联辅助模式

### DeepSeek（推荐）
- **费用**：约 ¥1/百万 tokens（非常实惠）
- **配置**：从 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 获取 API 密钥
- **优势**：代码分析能力强，性价比最高

### Claude
- **费用**：标准 Anthropic 定价
- **配置**：从 [console.anthropic.com](https://console.anthropic.com/account/keys) 获取 API 密钥
- **优势**：代码理解能力强，安全分析专业

### OpenAI
- **费用**：标准 OpenAI 定价
- **配置**：从 [platform.openai.com](https://platform.openai.com/api-keys) 获取 API 密钥
- **优势**：通用能力强，兼容性广

## 问题严重程度分级

AI 将问题分为三个严重级别：

### 🔴 P0 - 严重问题
- 崩溃、数据损坏、安全漏洞
- 内存泄漏、use-after-free、double free
- 死锁、数据竞争
- **要求**：必须有确凿的代码证据

### 🟡 P1 - 中等问题
- 错误处理不完善
- 空指针风险
- 性能问题
- 边界条件未处理

### 🔵 P2 - 轻微问题
- 代码规范问题
- 命名不规范
- 注释不足
- TODO/FIXME 标记

## 项目架构

```
src/
├── extension.ts              # 扩展入口
├── ai/
│   ├── aiServiceManager.ts   # AI 服务编排
│   ├── cursorAdapter.ts      # Cursor AI 集成
│   ├── deepseekAdapter.ts    # DeepSeek API 客户端
│   ├── claudeAdapter.ts      # Claude API 客户端
│   └── openaiAdapter.ts      # OpenAI API 客户端
├── config/
│   ├── settings.ts           # 配置管理
│   └── prompts.ts            # AI Prompt 模板
├── core/
│   ├── commitInterceptor.ts  # 提交处理逻辑
│   ├── diffAnalyzer.ts       # SVN diff 解析
│   └── svnCommandInterceptor.ts # SCM 命令拦截
├── ui/
│   ├── analysisResultPanel.ts # WebView 结果展示
│   ├── aiConfigPanel.ts      # 配置 WebView
│   └── aiProviderSelector.ts # 服务商选择 UI
└── utils/
    ├── logger.ts             # 日志工具
    ├── cursorDetector.ts     # 环境检测
    └── dependencyChecker.ts  # 依赖管理
```

## 开发

### 构建
```bash
npm run compile    # 编译 TypeScript
npm run watch      # 监听模式
```

### 测试
```bash
npm run test       # 运行测试
npm run lint       # 运行 ESLint
```

### 调试
1. 在 VSCode/Cursor 中打开项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中测试扩展

### 打包
```bash
npx vsce package   # 创建 .vsix 文件
```

## 故障排除

### 扩展未激活
1. 确保你在 SVN 仓库中（存在 `.svn` 文件夹）
2. 检查 SVN SCM 扩展是否已安装
3. 查看输出面板 > "SVN-AI-Check" 获取详细日志

### AI 分析失败
1. 检查设置中的 API 密钥配置
2. 验证网络连接
3. 尝试其他 AI 服务商

### Cursor AI 不工作
1. 确保你使用的是 Cursor 编辑器（不是 VSCode）
2. 如果自动检测失败，尝试"复制到 Chat"选项
3. 使用内联辅助模式（Ctrl+K）

## 工作流程对比

### 在 Cursor 环境中
1. 自动检测 Cursor 环境
2. 尝试 Language Model API → Composer 命令 → Chat 命令 → 内联辅助
3. 结果在美观的 WebView 面板中展示

### 在 VSCode 环境中
1. 显示类 Cursor 风格的 WebView 配置面板
2. 用户选择 AI 服务商并配置 API 密钥
3. 调用选定的 API 进行分析
4. 结果在美观的 WebView 面板中展示

## 贡献

欢迎贡献！请：
1. Fork 本仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m '添加某功能'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [SVN SCM 扩展](https://github.com/AceCodePt/svn-scm) by Chris Johnston
- 灵感来自 [CodeBuddy](https://codebuddy.ai/) 代码审查技能

---

**版本**: 0.1.0
**最后更新**: 2026-01-16
