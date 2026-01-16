# SVN Commit AI Check - 详细实现指南

## 📖 文档说明

本文档提供了插件开发的详细技术实现指南，包括核心代码示例、API 使用说明、关键算法实现等。与 `PROJECT_PLAN.md` 配合使用，本文档更侧重于"如何实现"的技术细节。

---

## 🚀 快速开始

### 环境准备

**必需工具**：
- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- VSCode >= 1.85.0
- Git
- SVN 命令行工具

**推荐工具**：
- VSCode Extension 开发插件：
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (Volar)

### 初始化项目

```bash
# 1. 使用 Yeoman 生成器创建扩展骨架
npm install -g yo generator-code

# 2. 运行生成器
yo code

# 选择以下选项:
# ? What type of extension do you want to create? New Extension (TypeScript)
# ? What's the name of your extension? svn-commit-ai-check
# ? What's the identifier of your extension? svn-commit-ai-check
# ? What's the description of your extension? AI-powered code review for SVN commits
# ? Initialize a git repository? Yes
# ? Which bundler to use? webpack
# ? Which package manager to use? npm

# 3. 进入项目目录
cd svn-commit-ai-check

# 4. 安装依赖
npm install

# 5. 安装额外的依赖
npm install openai @anthropic-ai/sdk marked highlight.js
npm install --save-dev @types/marked @types/node
```

### 项目配置

#### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

#### package.json（关键部分）
```json
{
  "name": "svn-commit-ai-check",
  "displayName": "SVN Commit AI Check",
  "description": "AI-powered code review for SVN commits with support for C++ and Go",
  "version": "0.1.0",
  "publisher": "your-publisher-name",
  "icon": "resources/icon.png",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Programming Languages",
    "Linters",
    "Other"
  ],
  "keywords": [
    "svn",
    "ai",
    "code review",
    "commit",
    "cpp",
    "go"
  ],
  "activationEvents": [
    "onCommand:svn.commit",
    "onView:svn",
    "workspaceContains:**/.svn"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "svn-commit-ai-check.analyzeChanges",
        "title": "SVN: Analyze Changes with AI"
      },
      {
        "command": "svn-commit-ai-check.showLastReport",
        "title": "SVN: Show Last AI Report"
      },
      {
        "command": "svn-commit-ai-check.configure",
        "title": "SVN: Configure AI Check"
      }
    ],
    "configuration": {
      "title": "SVN Commit AI Check",
      "properties": {
        "svn-commit-ai-check.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable or disable SVN commit AI checking"
        },
        "svn-commit-ai-check.aiProvider": {
          "type": "string",
          "enum": ["openai", "claude", "custom"],
          "default": "openai",
          "markdownDescription": "AI service provider. [Learn more](https://github.com/your-repo#ai-providers)"
        },
        "svn-commit-ai-check.openai.apiKey": {
          "type": "string",
          "default": "",
          "markdownDescription": "OpenAI API Key. Get one at [platform.openai.com](https://platform.openai.com/api-keys)"
        },
        "svn-commit-ai-check.openai.model": {
          "type": "string",
          "default": "gpt-4-turbo-preview",
          "enum": ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"],
          "description": "OpenAI model to use"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  }
}
```

---

## 🧩 核心模块实现

### 1. Extension 入口（extension.ts）

```typescript
import * as vscode from 'vscode';
import { CommitInterceptor } from './core/commitInterceptor';
import { ConfigurationManager } from './config/settings';
import { Logger } from './utils/logger';
import { ReportPanel } from './ui/webview/reportPanel';

let commitInterceptor: CommitInterceptor | undefined;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    logger = new Logger('SVN-AI-Check');
    logger.info('Extension activating...');

    // 初始化配置管理器
    const configManager = new ConfigurationManager();

    // 检查是否启用
    if (!configManager.isEnabled()) {
        logger.info('Extension is disabled');
        return;
    }

    // 检查 svn-scm 扩展是否安装
    const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm');
    if (!svnExtension) {
        logger.warn('svn-scm extension not found');
        vscode.window.showWarningMessage(
            'SVN Commit AI Check requires the svn-scm extension to be installed.',
            'Install svn-scm'
        ).then(selection => {
            if (selection === 'Install svn-scm') {
                vscode.commands.executeCommand(
                    'workbench.extensions.installExtension',
                    'johnstoncode.svn-scm'
                );
            }
        });
        return;
    }

    // 初始化提交拦截器
    commitInterceptor = new CommitInterceptor(context, configManager, logger);
    await commitInterceptor.initialize();

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.analyzeChanges',
            async () => {
                logger.info('Manual analysis triggered');
                await commitInterceptor?.handleCommit();
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.showLastReport',
            () => {
                ReportPanel.showLastReport(context);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.configure',
            () => {
                vscode.commands.executeCommand(
                    'workbench.action.openSettings',
                    'svn-commit-ai-check'
                );
            }
        )
    );

    // 状态栏按钮（可选）
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.text = '$(sparkle) SVN AI Check';
    statusBarItem.tooltip = 'Click to configure AI code review';
    statusBarItem.command = 'svn-commit-ai-check.configure';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    logger.info('Extension activated successfully');
}

export function deactivate() {
    logger?.info('Extension deactivating...');
    commitInterceptor?.dispose();
}
```

---

### 2. 配置管理（config/settings.ts）

```typescript
import * as vscode from 'vscode';

export interface AIProviderConfig {
    provider: 'openai' | 'claude' | 'custom';
    openai?: {
        apiKey: string;
        model: string;
        baseUrl: string;
    };
    claude?: {
        apiKey: string;
        model: string;
    };
    custom?: {
        apiUrl: string;
        apiKey: string;
    };
}

export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
    }

    isEnabled(): boolean {
        return this.config.get<boolean>('enabled', true);
    }

    isAutoCheck(): boolean {
        return this.config.get<boolean>('autoCheck', false);
    }

    getAIProviderConfig(): AIProviderConfig {
        const provider = this.config.get<string>('aiProvider', 'openai') as any;
        
        return {
            provider,
            openai: {
                apiKey: this.config.get<string>('openai.apiKey', ''),
                model: this.config.get<string>('openai.model', 'gpt-4-turbo-preview'),
                baseUrl: this.config.get<string>('openai.baseUrl', 'https://api.openai.com/v1')
            },
            claude: {
                apiKey: this.config.get<string>('claude.apiKey', ''),
                model: this.config.get<string>('claude.model', 'claude-3-5-sonnet-20241022')
            },
            custom: {
                apiUrl: this.config.get<string>('custom.apiUrl', ''),
                apiKey: this.config.get<string>('custom.apiKey', '')
            }
        };
    }

    getSystemPrompt(): string | undefined {
        const customPrompt = this.config.get<string>('prompt.system', '');
        return customPrompt || undefined;
    }

    getSupportedLanguages(): string[] {
        return this.config.get<string[]>('analysis.languages', ['cpp', 'c', 'go', 'h', 'hpp']);
    }

    getMaxFileSize(): number {
        return this.config.get<number>('analysis.maxFileSize', 102400); // 100KB
    }

    shouldIncludeFullContext(): boolean {
        return this.config.get<boolean>('analysis.includeFullContext', true);
    }

    getMaxTokens(): number {
        return this.config.get<number>('analysis.maxTokens', 8000);
    }

    getDefaultReportView(): 'webview' | 'markdown' {
        return this.config.get<string>('report.defaultView', 'webview') as any;
    }

    shouldAutoSaveMarkdown(): boolean {
        return this.config.get<boolean>('report.autoSaveMarkdown', true);
    }

    getMarkdownPath(): string {
        return this.config.get<string>('report.markdownPath', '.ai-check-reports');
    }

    // 监听配置变化
    onConfigurationChanged(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('svn-commit-ai-check')) {
                this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
                callback();
            }
        });
    }
}
```

---

### 3. 提交拦截器（core/commitInterceptor.ts）

```typescript
import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/settings';
import { Logger } from '../utils/logger';
import { DiffAnalyzer } from './diffAnalyzer';
import { AIServiceManager } from '../ai/aiServiceManager';
import { ReportGenerator } from '../report/reportGenerator';
import { ReportPanel } from '../ui/webview/reportPanel';
import { ConfirmationDialog } from '../ui/confirmationDialog';

export class CommitInterceptor {
    private diffAnalyzer: DiffAnalyzer;
    private aiService: AIServiceManager;
    private reportGenerator: ReportGenerator;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {
        this.diffAnalyzer = new DiffAnalyzer(configManager, logger);
        this.aiService = new AIServiceManager(configManager, logger);
        this.reportGenerator = new ReportGenerator(configManager, logger);
    }

    async initialize(): Promise<void> {
        // 方案: 命令拦截
        // 注册一个高优先级的 svn.commit 命令处理器
        
        // 注意: 这需要在 svn-scm 扩展之前注册，或者使用其他机制
        // 如果直接拦截不可行，可以提供一个"提交前检查"的命令让用户手动触发
        
        this.logger.info('Commit interceptor initialized');
        
        // 监听 SCM 输入框变化（间接方式）
        const scmInputBoxWatcher = vscode.workspace.onDidChangeTextDocument(e => {
            // 检测是否是 SCM 输入框
            if (e.document.uri.scheme === 'vscode-scm') {
                this.logger.debug('SCM input box changed');
            }
        });
        
        this.disposables.push(scmInputBoxWatcher);
    }

    async handleCommit(): Promise<boolean> {
        try {
            // 1. 询问用户是否需要 AI 分析
            const shouldAnalyze = await this.askUserConfirmation();
            
            if (!shouldAnalyze) {
                this.logger.info('User skipped AI analysis');
                return true; // 允许继续提交
            }

            // 2. 获取变更
            this.logger.info('Getting diff changes...');
            const changes = await this.diffAnalyzer.getChanges();
            
            if (changes.length === 0) {
                vscode.window.showInformationMessage('No changes to analyze');
                return true;
            }

            // 3. 执行 AI 分析
            const analysis = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "AI Code Analysis",
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: "Analyzing code changes..." });
                
                try {
                    const result = await this.aiService.analyzeChanges(changes, token);
                    progress.report({ increment: 100, message: "Analysis complete!" });
                    return result;
                } catch (error) {
                    if (token.isCancellationRequested) {
                        throw new Error('Analysis cancelled by user');
                    }
                    throw error;
                }
            });

            // 4. 生成报告
            const report = await this.reportGenerator.generate(changes, analysis);

            // 5. 展示报告
            await this.showReport(report);

            // 6. 询问是否继续提交
            const shouldContinue = await this.askContinueCommit(report);
            
            return shouldContinue;

        } catch (error) {
            this.logger.error('Error during commit handling:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            const choice = await vscode.window.showErrorMessage(
                `AI analysis failed: ${errorMessage}`,
                'Continue Commit Anyway',
                'Cancel Commit'
            );
            
            return choice === 'Continue Commit Anyway';
        }
    }

    private async askUserConfirmation(): Promise<boolean> {
        // 如果配置为自动检查，直接返回 true
        if (this.configManager.isAutoCheck()) {
            return true;
        }

        const choice = await vscode.window.showInformationMessage(
            '是否需要 AI 智能分析本次提交的代码?',
            { modal: true },
            'OK',
            'Cancel'
        );

        return choice === 'OK';
    }

    private async showReport(report: any): Promise<void> {
        const viewType = this.configManager.getDefaultReportView();
        
        if (viewType === 'webview') {
            ReportPanel.show(this.context, report);
        } else {
            await this.reportGenerator.saveAsMarkdown(report);
        }
    }

    private async askContinueCommit(report: any): Promise<boolean> {
        const criticalIssues = report.issues.filter(
            (issue: any) => issue.severity === 'critical'
        ).length;

        const message = criticalIssues > 0
            ? `Found ${criticalIssues} critical issue(s). Do you want to continue commit?`
            : `Analysis complete. Continue with commit?`;

        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            'Continue Commit',
            'Cancel Commit'
        );

        return choice === 'Continue Commit';
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
```

---

### 4. Diff 分析器（core/diffAnalyzer.ts）

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';
import { ConfigurationManager } from '../config/settings';
import { Logger } from '../utils/logger';

export interface FileChange {
    path: string;
    status: 'added' | 'modified' | 'deleted';
    diffContent: string;
    fullContent?: string;
    language: string;
}

export class DiffAnalyzer {
    constructor(
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {}

    async getChanges(): Promise<FileChange[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        this.logger.info(`Getting SVN changes in ${workspaceRoot}`);

        try {
            // 获取 SVN 状态
            const statusOutput = execSync('svn status', {
                cwd: workspaceRoot,
                encoding: 'utf-8'
            });

            // 解析状态输出
            const changes: FileChange[] = [];
            const lines = statusOutput.split('\n').filter(line => line.trim());

            for (const line of lines) {
                const match = line.match(/^([AMDRC])\\s+(.+)$/);
                if (!match) continue;

                const [, statusChar, filePath] = match;
                const fullPath = path.join(workspaceRoot, filePath);

                // 检查文件类型
                const language = this.getLanguageFromPath(filePath);
                if (!this.shouldAnalyzeFile(filePath, language)) {
                    this.logger.debug(`Skipping file: ${filePath}`);
                    continue;
                }

                // 检查文件大小
                const stats = await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                if (stats.size > this.configManager.getMaxFileSize()) {
                    this.logger.warn(`File too large, skipping: ${filePath} (${stats.size} bytes)`);
                    continue;
                }

                const change: FileChange = {
                    path: filePath,
                    status: this.parseStatus(statusChar),
                    diffContent: '',
                    language
                };

                // 获取 diff
                if (change.status !== 'deleted') {
                    try {
                        change.diffContent = execSync(`svn diff "${filePath}"`, {
                            cwd: workspaceRoot,
                            encoding: 'utf-8'
                        });
                    } catch (error) {
                        this.logger.warn(`Failed to get diff for ${filePath}:`, error);
                    }

                    // 获取完整文件内容（如果配置启用）
                    if (this.configManager.shouldIncludeFullContext()) {
                        try {
                            const fileUri = vscode.Uri.file(fullPath);
                            const fileContent = await vscode.workspace.fs.readFile(fileUri);
                            change.fullContent = Buffer.from(fileContent).toString('utf-8');
                        } catch (error) {
                            this.logger.warn(`Failed to read file ${filePath}:`, error);
                        }
                    }
                }

                changes.push(change);
            }

            this.logger.info(`Found ${changes.length} file(s) to analyze`);
            return changes;

        } catch (error) {
            this.logger.error('Failed to get SVN changes:', error);
            throw new Error('Failed to get SVN changes. Make sure you are in an SVN working directory.');
        }
    }

    private parseStatus(statusChar: string): FileChange['status'] {
        switch (statusChar) {
            case 'A': return 'added';
            case 'M': return 'modified';
            case 'D': return 'deleted';
            default: return 'modified';
        }
    }

    private getLanguageFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        
        const languageMap: Record<string, string> = {
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'c': 'c',
            'h': 'c',
            'hpp': 'cpp',
            'hxx': 'cpp',
            'go': 'go',
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'java': 'java',
            'rs': 'rust'
        };

        return languageMap[ext] || ext;
    }

    private shouldAnalyzeFile(filePath: string, language: string): boolean {
        const supportedLanguages = this.configManager.getSupportedLanguages();
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        
        return supportedLanguages.includes(ext) || supportedLanguages.includes(language);
    }
}
```

---

### 5. AI 服务管理器（ai/aiServiceManager.ts）

```typescript
import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/settings';
import { Logger } from '../utils/logger';
import { FileChange } from '../core/diffAnalyzer';
import { OpenAIAdapter } from './adapters/openaiAdapter';
import { ClaudeAdapter } from './adapters/claudeAdapter';
import { PromptBuilder } from './promptBuilder';

export interface AIAnalysisResult {
    rawResponse: string;
    issues: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low';
        file: string;
        line?: number;
        title: string;
        description: string;
        suggestion?: string;
    }>;
}

export interface AIAdapter {
    analyze(prompt: string, token: vscode.CancellationToken): Promise<string>;
}

export class AIServiceManager {
    private promptBuilder: PromptBuilder;
    private currentAdapter: AIAdapter | null = null;

    constructor(
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {
        this.promptBuilder = new PromptBuilder(configManager);
        this.initializeAdapter();
    }

    private initializeAdapter(): void {
        const config = this.configManager.getAIProviderConfig();
        
        switch (config.provider) {
            case 'openai':
                if (!config.openai?.apiKey) {
                    throw new Error('OpenAI API key not configured');
                }
                this.currentAdapter = new OpenAIAdapter(config.openai, this.logger);
                break;
            
            case 'claude':
                if (!config.claude?.apiKey) {
                    throw new Error('Claude API key not configured');
                }
                this.currentAdapter = new ClaudeAdapter(config.claude, this.logger);
                break;
            
            case 'custom':
                throw new Error('Custom AI provider not yet implemented');
            
            default:
                throw new Error(`Unknown AI provider: ${config.provider}`);
        }
    }

    async analyzeChanges(
        changes: FileChange[],
        token: vscode.CancellationToken
    ): Promise<AIAnalysisResult> {
        if (!this.currentAdapter) {
            throw new Error('No AI adapter initialized');
        }

        this.logger.info('Building analysis prompt...');
        const prompt = this.promptBuilder.build(changes);
        
        this.logger.info(`Prompt length: ${prompt.length} characters`);
        this.logger.debug('Prompt preview:', prompt.substring(0, 500) + '...');

        this.logger.info('Calling AI service...');
        const rawResponse = await this.currentAdapter.analyze(prompt, token);
        
        this.logger.info('Parsing AI response...');
        const issues = this.parseResponse(rawResponse);
        
        this.logger.info(`Found ${issues.length} issues`);

        return { rawResponse, issues };
    }

    private parseResponse(response: string): AIAnalysisResult['issues'] {
        // 简单的解析逻辑 - 可以根据实际 AI 响应格式优化
        const issues: AIAnalysisResult['issues'] = [];
        
        // 尝试解析 Markdown 格式的响应
        // 假设 AI 返回类似这样的格式:
        // ### 🔴 Critical: Memory Leak in file.cpp:42
        // Description: ...
        // Suggestion: ...
        
        const issueRegex = /###\\s+(🔴|🟠|🟡|🟢)\\s+(Critical|High|Medium|Low):\\s+(.+?)\\s+in\\s+(.+?):(\\d+)/g;
        let match;
        
        while ((match = issueRegex.exec(response)) !== null) {
            const [, , severityStr, title, file, lineStr] = match;
            
            issues.push({
                severity: severityStr.toLowerCase() as any,
                file,
                line: parseInt(lineStr, 10),
                title,
                description: '', // 需要进一步解析
                suggestion: ''
            });
        }

        // 如果正则匹配失败，尝试其他解析策略
        if (issues.length === 0) {
            this.logger.warn('Failed to parse structured issues, returning raw response');
            // 可以将整个响应作为一个大问题返回
            issues.push({
                severity: 'medium',
                file: 'multiple files',
                title: 'AI Analysis Result',
                description: response
            });
        }

        return issues;
    }
}
```

---

### 6. OpenAI 适配器（ai/adapters/openaiAdapter.ts）

```typescript
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { Logger } from '../../utils/logger';
import { AIAdapter } from '../aiServiceManager';

export class OpenAIAdapter implements AIAdapter {
    private client: OpenAI;

    constructor(
        private config: { apiKey: string; model: string; baseUrl: string },
        private logger: Logger
    ) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });
    }

    async analyze(prompt: string, token: vscode.CancellationToken): Promise<string> {
        this.logger.info(`Calling OpenAI ${this.config.model}...`);

        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 4096,
                stream: true
            });

            let fullResponse = '';

            for await (const chunk of stream) {
                if (token.isCancellationRequested) {
                    throw new Error('Analysis cancelled');
                }

                const content = chunk.choices[0]?.delta?.content || '';
                fullResponse += content;
            }

            this.logger.info(`Received response (${fullResponse.length} chars)`);
            return fullResponse;

        } catch (error) {
            this.logger.error('OpenAI API error:', error);
            
            if (error instanceof OpenAI.APIError) {
                throw new Error(`OpenAI API Error: ${error.message}`);
            }
            
            throw error;
        }
    }
}
```

---

### 7. Prompt 构建器（ai/promptBuilder.ts）

```typescript
import { ConfigurationManager } from '../config/settings';
import { FileChange } from '../core/diffAnalyzer';
import { DEFAULT_SYSTEM_PROMPT } from '../config/prompts';

export class PromptBuilder {
    constructor(private configManager: ConfigurationManager) {}

    build(changes: FileChange[]): string {
        const systemPrompt = this.configManager.getSystemPrompt() || DEFAULT_SYSTEM_PROMPT;
        
        let prompt = systemPrompt + '\\n\\n';
        prompt += '---\\n\\n';
        prompt += '请审查以下代码变更：\\n\\n';
        
        changes.forEach((change, index) => {
            prompt += `## ${index + 1}. 文件: ${change.path} (${change.status})\\n\\n`;
            
            if (change.status === 'deleted') {
                prompt += '该文件已删除\\n\\n';
                return;
            }
            
            // 添加 diff
            if (change.diffContent) {
                prompt += '### 变更内容（Diff）：\\n';
                prompt += '```diff\\n';
                prompt += change.diffContent;
                prompt += '\\n```\\n\\n';
            }
            
            // 添加完整内容（可选）
            if (change.fullContent && this.configManager.shouldIncludeFullContext()) {
                prompt += '### 完整文件内容（上下文参考）：\\n';
                prompt += `\`\`\`${change.language}\\n`;
                prompt += this.truncateContent(change.fullContent);
                prompt += '\\n```\\n\\n';
            }
        });
        
        prompt += '\\n---\\n\\n';
        prompt += '请按以下格式输出：\\n\\n';
        prompt += '### 🔴 Critical: [问题标题] in [文件路径]:[行号]\\n';
        prompt += '**描述**: [问题描述]\\n';
        prompt += '**建议**: [修复建议]\\n\\n';
        
        return prompt;
    }

    private truncateContent(content: string): string {
        const maxLength = 10000; // 大约 2500 tokens
        if (content.length <= maxLength) {
            return content;
        }
        
        return content.substring(0, maxLength) + '\\n\\n... (内容已截断)';
    }
}
```

---

### 8. 默认 Prompt（config/prompts.ts）

```typescript
export const DEFAULT_SYSTEM_PROMPT = `
你是一个专业的代码审查专家，擅长 C++ 和 Go 语言的代码分析。
你的任务是分析即将提交到 SVN 的代码变更，识别潜在的问题。

**审查重点**：

1. **代码质量问题** 🐛
   - 逻辑错误和潜在 bug
   - 性能问题（内存泄漏、低效算法、不必要的拷贝）
   - 并发安全问题（race condition、deadlock、data race）
   - 资源管理问题（RAII 违反、未关闭的资源）

2. **C++ 特定问题**
   - 内存安全（缓冲区溢出、野指针、double free）
   - 现代 C++ 最佳实践（优先使用智能指针、constexpr、auto）
   - 移动语义的正确使用
   - 异常安全性

3. **Go 特定问题**
   - Goroutine 泄漏
   - Channel 的不当使用
   - defer 的误用
   - 错误处理的缺失或不当

4. **代码规范问题** 📏
   - 命名规范（变量、函数、类型）
   - 代码格式和风格
   - 注释的完整性和准确性

5. **安全问题** 🔒
   - 输入验证缺失
   - SQL 注入或命令注入风险
   - 认证和授权问题
   - 敏感信息泄露

6. **最佳实践** ✨
   - SOLID 原则违反
   - DRY 原则违反（代码重复）
   - 过度设计或设计不足
   - 测试覆盖不足

**输出格式要求**：
- 按严重程度排序（Critical > High > Medium > Low）
- 每个问题必须包含：严重程度、文件路径、行号（如果适用）、问题描述、修复建议
- 使用清晰的 Markdown 格式
- 对于严重问题，提供具体的代码修复示例
- 如果没有发现问题，明确说明"未发现明显问题"

**严重程度定义**：
- 🔴 **Critical**: 会导致崩溃、数据损坏或安全漏洞的问题
- 🟠 **High**: 严重影响功能或性能的问题
- 🟡 **Medium**: 代码质量问题，可能在特定情况下引发错误
- 🟢 **Low**: 代码规范或最佳实践的轻微违反
`.trim();
```

---

### 9. 报告生成器（report/reportGenerator.ts）

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../config/settings';
import { Logger } from '../utils/logger';
import { FileChange } from '../core/diffAnalyzer';
import { AIAnalysisResult } from '../ai/aiServiceManager';
import { MarkdownFormatter } from './markdownFormatter';

export interface AnalysisReport {
    timestamp: Date;
    changes: FileChange[];
    analysis: AIAnalysisResult;
    summary: {
        totalIssues: number;
        criticalCount: number;
        highCount: number;
        mediumCount: number;
        lowCount: number;
    };
}

export class ReportGenerator {
    private markdownFormatter: MarkdownFormatter;

    constructor(
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {
        this.markdownFormatter = new MarkdownFormatter();
    }

    async generate(changes: FileChange[], analysis: AIAnalysisResult): Promise<AnalysisReport> {
        const summary = {
            totalIssues: analysis.issues.length,
            criticalCount: analysis.issues.filter(i => i.severity === 'critical').length,
            highCount: analysis.issues.filter(i => i.severity === 'high').length,
            mediumCount: analysis.issues.filter(i => i.severity === 'medium').length,
            lowCount: analysis.issues.filter(i => i.severity === 'low').length
        };

        const report: AnalysisReport = {
            timestamp: new Date(),
            changes,
            analysis,
            summary
        };

        // 如果配置为自动保存 Markdown
        if (this.configManager.shouldAutoSaveMarkdown()) {
            await this.saveAsMarkdown(report);
        }

        return report;
    }

    async saveAsMarkdown(report: AnalysisReport): Promise<string> {
        const markdown = this.markdownFormatter.format(report);
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder');
        }

        const reportDir = path.join(
            workspaceFolders[0].uri.fsPath,
            this.configManager.getMarkdownPath()
        );

        // 创建目录
        const reportDirUri = vscode.Uri.file(reportDir);
        try {
            await vscode.workspace.fs.createDirectory(reportDirUri);
        } catch (error) {
            // 目录可能已存在，忽略错误
        }

        // 生成文件名
        const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
        const fileName = `ai-check-${timestamp}.md`;
        const filePath = path.join(reportDir, fileName);
        const fileUri = vscode.Uri.file(filePath);

        // 写入文件
        await vscode.workspace.fs.writeFile(
            fileUri,
            Buffer.from(markdown, 'utf-8')
        );

        this.logger.info(`Report saved to ${filePath}`);

        // 打开文件
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);

        return filePath;
    }
}
```

---

### 10. Webview 报告面板（ui/webview/reportPanel.ts）

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { AnalysisReport } from '../../report/reportGenerator';

export class ReportPanel {
    private static currentPanel: ReportPanel | undefined;
    private static lastReport: AnalysisReport | undefined;

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private context: vscode.ExtensionContext,
        private report: AnalysisReport
    ) {
        this.panel = panel;

        // 设置 HTML 内容
        this.panel.webview.html = this.getHtmlContent(report);

        // 监听面板关闭
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // 处理来自 Webview 的消息
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'export':
                        this.exportMarkdown();
                        break;
                    case 'jumpToCode':
                        this.jumpToCode(message.file, message.line);
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    public static show(context: vscode.ExtensionContext, report: AnalysisReport) {
        ReportPanel.lastReport = report;

        const column = vscode.ViewColumn.Two;

        // 如果面板已存在，更新内容
        if (ReportPanel.currentPanel) {
            ReportPanel.currentPanel.panel.reveal(column);
            ReportPanel.currentPanel.update(report);
            return;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            'svnAiCheckReport',
            'AI Code Review Report',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'out', 'ui', 'webview', 'assets'))
                ]
            }
        );

        ReportPanel.currentPanel = new ReportPanel(panel, context, report);
    }

    public static showLastReport(context: vscode.ExtensionContext) {
        if (ReportPanel.lastReport) {
            ReportPanel.show(context, ReportPanel.lastReport);
        } else {
            vscode.window.showInformationMessage('No report available');
        }
    }

    private update(report: AnalysisReport) {
        this.report = report;
        this.panel.webview.html = this.getHtmlContent(report);
    }

    private getHtmlContent(report: AnalysisReport): string {
        // 这里返回完整的 HTML
        // 为了简洁，使用简化版本
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Review Report</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 AI Code Review Report</h1>
            <p class="timestamp">Generated at: ${report.timestamp.toLocaleString()}</p>
        </header>

        <section class="summary">
            <h2>📊 Summary</h2>
            <div class="stats">
                <div class="stat critical">
                    <span class="count">${report.summary.criticalCount}</span>
                    <span class="label">Critical</span>
                </div>
                <div class="stat high">
                    <span class="count">${report.summary.highCount}</span>
                    <span class="label">High</span>
                </div>
                <div class="stat medium">
                    <span class="count">${report.summary.mediumCount}</span>
                    <span class="label">Medium</span>
                </div>
                <div class="stat low">
                    <span class="count">${report.summary.lowCount}</span>
                    <span class="label">Low</span>
                </div>
            </div>
        </section>

        <section class="issues">
            <h2>🔍 Issues</h2>
            ${this.renderIssues(report.analysis.issues)}
        </section>

        <footer>
            <button onclick="exportMarkdown()">📄 Export as Markdown</button>
        </footer>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function exportMarkdown() {
            vscode.postMessage({ command: 'export' });
        }

        function jumpToCode(file, line) {
            vscode.postMessage({ command: 'jumpToCode', file, line });
        }
    </script>
</body>
</html>
        `;
    }

    private renderIssues(issues: any[]): string {
        if (issues.length === 0) {
            return '<p class="no-issues">✅ No issues found!</p>';
        }

        return issues.map(issue => `
            <div class="issue ${issue.severity}">
                <div class="issue-header">
                    <span class="severity-badge">${this.getSeverityIcon(issue.severity)} ${issue.severity.toUpperCase()}</span>
                    <h3>${this.escapeHtml(issue.title)}</h3>
                </div>
                <div class="issue-location" onclick="jumpToCode('${issue.file}', ${issue.line || 0})">
                    📁 ${this.escapeHtml(issue.file)}${issue.line ? `:${issue.line}` : ''}
                </div>
                <div class="issue-description">
                    ${this.escapeHtml(issue.description)}
                </div>
                ${issue.suggestion ? `
                    <div class="issue-suggestion">
                        <strong>💡 Suggestion:</strong>
                        ${this.escapeHtml(issue.suggestion)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    private getSeverityIcon(severity: string): string {
        const icons: Record<string, string> = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        };
        return icons[severity] || '⚪';
    }

    private getStyles(): string {
        return `
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 0;
                margin: 0;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            header h1 {
                margin: 0;
                color: var(--vscode-editor-foreground);
            }
            .timestamp {
                color: var(--vscode-descriptionForeground);
                margin: 5px 0;
            }
            .summary {
                margin: 20px 0;
                padding: 20px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 8px;
            }
            .stats {
                display: flex;
                gap: 20px;
                margin-top: 15px;
            }
            .stat {
                flex: 1;
                text-align: center;
                padding: 15px;
                border-radius: 8px;
                background-color: var(--vscode-editor-background);
            }
            .stat .count {
                display: block;
                font-size: 32px;
                font-weight: bold;
            }
            .stat.critical .count { color: #f44336; }
            .stat.high .count { color: #ff9800; }
            .stat.medium .count { color: #ffeb3b; }
            .stat.low .count { color: #4caf50; }
            .issue {
                margin: 15px 0;
                padding: 15px;
                border-left: 4px solid;
                border-radius: 4px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
            }
            .issue.critical { border-color: #f44336; }
            .issue.high { border-color: #ff9800; }
            .issue.medium { border-color: #ffeb3b; }
            .issue.low { border-color: #4caf50; }
            .issue-header {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .severity-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
            }
            .issue-location {
                margin: 10px 0;
                color: var(--vscode-textLink-foreground);
                cursor: pointer;
            }
            .issue-location:hover {
                text-decoration: underline;
            }
            .issue-description {
                margin: 10px 0;
                line-height: 1.6;
            }
            .issue-suggestion {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--vscode-editor-background);
                border-radius: 4px;
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            footer {
                margin-top: 30px;
                text-align: center;
            }
        `;
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    private async exportMarkdown() {
        // 调用 ReportGenerator 导出
        vscode.window.showInformationMessage('Exporting report as Markdown...');
    }

    private async jumpToCode(file: string, line: number) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const filePath = path.join(workspaceFolders[0].uri.fsPath, file);
        const uri = vscode.Uri.file(filePath);

        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            if (line > 0) {
                const position = new vscode.Position(line - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${file}`);
        }
    }

    private dispose() {
        ReportPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
```

---

## 🧪 测试

### 单元测试示例（test/suite/diffAnalyzer.test.ts）

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { DiffAnalyzer } from '../../core/diffAnalyzer';

suite('DiffAnalyzer Test Suite', () => {
    test('Should parse SVN status correctly', () => {
        // 测试 SVN 状态解析逻辑
    });

    test('Should filter files by extension', () => {
        // 测试文件过滤逻辑
    });

    test('Should handle large files', () => {
        // 测试大文件处理
    });
});
```

---

## 📦 打包与发布

### 打包为 VSIX

```bash
# 安装 vsce
npm install -g @vscode/vsce

# 打包
vsce package

# 输出: svn-commit-ai-check-0.1.0.vsix
```

### 本地安装测试

```bash
code --install-extension svn-commit-ai-check-0.1.0.vsix
```

---

## 📚 补充说明

### Cursor AI 集成调研

由于 Cursor 目前没有公开的扩展 API，推荐方案：
1. **优先使用 OpenAI/Claude**：用户配置自己的 API Key
2. **未来扩展**：持续关注 Cursor 是否开放 API

### 命令拦截的替代方案

如果无法直接拦截 `svn.commit` 命令，可以：
1. 提供一个自定义命令 `svn-commit-ai-check.commitWithCheck`
2. 在 VSCode 的命令面板中提示用户使用该命令代替标准提交
3. 或者提供一个 SCM 输入框装饰器，添加按钮触发检查

---

## ✅ 完成标准

- [x] 项目计划文档完成
- [x] 技术实现指南完成
- [ ] 核心代码实现
- [ ] 单元测试编写
- [ ] 集成测试
- [ ] 用户文档
- [ ] 打包发布

---

**文档版本**: v1.0  
**最后更新**: 2026-01-15
