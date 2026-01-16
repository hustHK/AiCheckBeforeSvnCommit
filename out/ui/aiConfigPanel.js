"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConfigPanel = void 0;
const vscode = __importStar(require("vscode"));
/**
 * AI 配置面板
 * 类似 Cursor 风格的 LLM 配置界面
 */
class AIConfigPanel {
    constructor(panel, configManager, logger, onProviderSelected) {
        this.configManager = configManager;
        this.logger = logger;
        this.onProviderSelected = onProviderSelected;
        this.disposables = [];
        this.panel = panel;
        // 设置初始内容
        this.updateContent();
        // 监听面板关闭
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        // 处理来自 WebView 的消息
        this.panel.webview.onDidReceiveMessage(message => this.handleMessage(message), null, this.disposables);
        // 监听配置变化
        this.disposables.push(this.configManager.onConfigurationChanged(() => this.updateContent()));
    }
    /**
     * 创建或显示配置面板
     */
    static createOrShow(extensionUri, configManager, logger, onProviderSelected) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // 如果已有面板，显示它
        if (AIConfigPanel.currentPanel) {
            AIConfigPanel.currentPanel.panel.reveal(column);
            return AIConfigPanel.currentPanel;
        }
        // 创建新面板
        const panel = vscode.window.createWebviewPanel(AIConfigPanel.viewType, '⚙️ AI Configuration', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        AIConfigPanel.currentPanel = new AIConfigPanel(panel, configManager, logger, onProviderSelected);
        return AIConfigPanel.currentPanel;
    }
    /**
     * 更新面板内容
     */
    updateContent() {
        const currentProvider = this.configManager.getAIProvider();
        const hasDeepSeekKey = !!this.configManager.getDeepSeekApiKey();
        const hasClaudeKey = !!this.configManager.getClaudeApiKey();
        const hasOpenAIKey = !!this.configManager.getOpenAIApiKey();
        this.panel.webview.html = this.getHtml({
            currentProvider,
            hasDeepSeekKey,
            hasClaudeKey,
            hasOpenAIKey
        });
    }
    /**
     * 处理来自 WebView 的消息
     */
    async handleMessage(message) {
        switch (message.command) {
            case 'selectProvider':
                if (message.provider) {
                    await this.configManager.setAIProvider(message.provider);
                    this.onProviderSelected(message.provider);
                    this.updateContent();
                    vscode.window.showInformationMessage(`✅ AI 服务已切换为: ${this.getProviderDisplayName(message.provider)}`);
                }
                break;
            case 'saveApiKey':
                if (message.provider && message.apiKey) {
                    await this.saveApiKey(message.provider, message.apiKey);
                    this.updateContent();
                }
                break;
            case 'testConnection':
                if (message.provider) {
                    await this.testConnection(message.provider);
                }
                break;
            case 'openSettings':
                vscode.commands.executeCommand('workbench.action.openSettings', 'svn-commit-ai-check');
                break;
            case 'close':
                this.panel.dispose();
                break;
        }
    }
    /**
     * 保存 API Key
     */
    async saveApiKey(provider, apiKey) {
        const configKey = `${provider}.apiKey`;
        await vscode.workspace.getConfiguration('svn-commit-ai-check')
            .update(configKey, apiKey, vscode.ConfigurationTarget.Global);
        this.logger.info(`API Key saved for ${provider}`);
        vscode.window.showInformationMessage(`✅ ${this.getProviderDisplayName(provider)} API Key 已保存`);
    }
    /**
     * 测试连接
     */
    async testConnection(provider) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `测试 ${this.getProviderDisplayName(provider)} 连接...`,
            cancellable: false
        }, async () => {
            try {
                // 简单的连接测试
                let apiKey = '';
                let endpoint = '';
                switch (provider) {
                    case 'deepseek':
                        apiKey = this.configManager.getDeepSeekApiKey();
                        endpoint = 'https://api.deepseek.com/v1/models';
                        break;
                    case 'claude':
                        apiKey = this.configManager.getClaudeApiKey();
                        endpoint = 'https://api.anthropic.com/v1/models';
                        break;
                    case 'openai':
                        apiKey = this.configManager.getOpenAIApiKey();
                        endpoint = 'https://api.openai.com/v1/models';
                        break;
                }
                if (!apiKey) {
                    vscode.window.showWarningMessage(`⚠️ 请先配置 ${this.getProviderDisplayName(provider)} API Key`);
                    return;
                }
                // 使用 fetch 测试连接（如果可用）
                // 这里简化处理，只检查 key 是否存在
                vscode.window.showInformationMessage(`✅ ${this.getProviderDisplayName(provider)} API Key 已配置`);
            }
            catch (error) {
                this.logger.error('Connection test failed:', error);
                vscode.window.showErrorMessage(`❌ 连接测试失败: ${error}`);
            }
        });
    }
    /**
     * 获取提供商显示名称
     */
    getProviderDisplayName(provider) {
        const names = {
            'auto': '自动选择',
            'cursor': 'Cursor AI',
            'deepseek': 'DeepSeek',
            'claude': 'Claude',
            'openai': 'OpenAI'
        };
        return names[provider] || provider;
    }
    /**
     * 获取面板 HTML
     */
    getHtml(state) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Configuration</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header h1 {
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header-actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
        }
        .section-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
        }
        .provider-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }
        .provider-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .provider-card:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        .provider-card.selected {
            border-color: var(--vscode-button-background);
            background: var(--vscode-editor-selectionBackground);
        }
        .provider-card.selected::after {
            content: '✓';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        .provider-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .provider-name {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .provider-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .provider-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
        }
        .badge-recommended {
            background: rgba(46, 160, 67, 0.2);
            color: #3fb950;
        }
        .badge-free {
            background: rgba(88, 166, 255, 0.2);
            color: #58a6ff;
        }
        .badge-configured {
            background: rgba(46, 160, 67, 0.2);
            color: #3fb950;
        }
        .badge-not-configured {
            background: rgba(248, 81, 73, 0.2);
            color: #f85149;
        }
        .api-config {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }
        .api-config-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .api-config-title {
            font-size: 13px;
            font-weight: 600;
        }
        .input-group {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        }
        .input-group input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 13px;
        }
        .input-group input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .input-group input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        .help-link {
            font-size: 11px;
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .help-link:hover {
            text-decoration: underline;
        }
        .tips {
            margin-top: 24px;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
        }
        .tips-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .tips-content {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.6;
        }
        .tips-content ul {
            padding-left: 16px;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <span>⚙️</span>
            <span>AI 服务配置</span>
        </h1>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="openSettings()">
                📝 高级设置
            </button>
            <button class="btn btn-primary" onclick="close()">
                ✓ 完成
            </button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">选择 AI 服务提供商</div>
        <div class="section-desc">选择用于代码审查的 AI 服务。推荐使用 DeepSeek，性价比最高。</div>

        <div class="provider-grid">
            <div class="provider-card ${state.currentProvider === 'deepseek' ? 'selected' : ''}"
                 onclick="selectProvider('deepseek')">
                <div class="provider-icon">⚡</div>
                <div class="provider-name">DeepSeek</div>
                <div class="provider-desc">高性能代码分析，性价比最高</div>
                <span class="provider-badge badge-recommended">推荐</span>
                <span class="provider-badge ${state.hasDeepSeekKey ? 'badge-configured' : 'badge-not-configured'}">
                    ${state.hasDeepSeekKey ? '已配置' : '未配置'}
                </span>
            </div>

            <div class="provider-card ${state.currentProvider === 'claude' ? 'selected' : ''}"
                 onclick="selectProvider('claude')">
                <div class="provider-icon">🤖</div>
                <div class="provider-name">Claude</div>
                <div class="provider-desc">Anthropic Claude 3.5 Sonnet</div>
                <span class="provider-badge ${state.hasClaudeKey ? 'badge-configured' : 'badge-not-configured'}">
                    ${state.hasClaudeKey ? '已配置' : '未配置'}
                </span>
            </div>

            <div class="provider-card ${state.currentProvider === 'openai' ? 'selected' : ''}"
                 onclick="selectProvider('openai')">
                <div class="provider-icon">🧠</div>
                <div class="provider-name">OpenAI</div>
                <div class="provider-desc">GPT-4 Turbo</div>
                <span class="provider-badge ${state.hasOpenAIKey ? 'badge-configured' : 'badge-not-configured'}">
                    ${state.hasOpenAIKey ? '已配置' : '未配置'}
                </span>
            </div>

            <div class="provider-card ${state.currentProvider === 'auto' ? 'selected' : ''}"
                 onclick="selectProvider('auto')">
                <div class="provider-icon">✨</div>
                <div class="provider-name">自动选择</div>
                <div class="provider-desc">自动检测最佳可用服务</div>
            </div>
        </div>
    </div>

    <div class="section" id="api-config-section">
        <div class="section-title">API 密钥配置</div>

        <div class="api-config" id="deepseek-config" style="display: ${state.currentProvider === 'deepseek' ? 'block' : 'none'}">
            <div class="api-config-header">
                <span class="api-config-title">DeepSeek API Key</span>
                <a href="https://platform.deepseek.com/api_keys" class="help-link" target="_blank">获取 API Key →</a>
            </div>
            <div class="input-group">
                <input type="password" id="deepseek-key" placeholder="sk-..." value="${state.hasDeepSeekKey ? '••••••••••••••••' : ''}">
                <button class="btn btn-secondary" onclick="saveApiKey('deepseek')">保存</button>
                <button class="btn btn-secondary" onclick="testConnection('deepseek')">测试</button>
            </div>
        </div>

        <div class="api-config" id="claude-config" style="display: ${state.currentProvider === 'claude' ? 'block' : 'none'}">
            <div class="api-config-header">
                <span class="api-config-title">Claude API Key</span>
                <a href="https://console.anthropic.com/account/keys" class="help-link" target="_blank">获取 API Key →</a>
            </div>
            <div class="input-group">
                <input type="password" id="claude-key" placeholder="sk-ant-..." value="${state.hasClaudeKey ? '••••••••••••••••' : ''}">
                <button class="btn btn-secondary" onclick="saveApiKey('claude')">保存</button>
                <button class="btn btn-secondary" onclick="testConnection('claude')">测试</button>
            </div>
        </div>

        <div class="api-config" id="openai-config" style="display: ${state.currentProvider === 'openai' ? 'block' : 'none'}">
            <div class="api-config-header">
                <span class="api-config-title">OpenAI API Key</span>
                <a href="https://platform.openai.com/api-keys" class="help-link" target="_blank">获取 API Key →</a>
            </div>
            <div class="input-group">
                <input type="password" id="openai-key" placeholder="sk-..." value="${state.hasOpenAIKey ? '••••••••••••••••' : ''}">
                <button class="btn btn-secondary" onclick="saveApiKey('openai')">保存</button>
                <button class="btn btn-secondary" onclick="testConnection('openai')">测试</button>
            </div>
        </div>
    </div>

    <div class="tips">
        <div class="tips-title">💡 使用提示</div>
        <div class="tips-content">
            <ul>
                <li><strong>DeepSeek</strong>: 价格便宜（约 ¥1/百万 tokens），代码分析能力强，推荐首选</li>
                <li><strong>Claude</strong>: 代码理解能力出色，安全分析专业，适合复杂项目</li>
                <li><strong>OpenAI</strong>: 通用能力强，支持多种任务</li>
                <li>API Key 会安全存储在 VSCode 设置中</li>
            </ul>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectProvider(provider) {
            vscode.postMessage({ command: 'selectProvider', provider });

            // 更新 UI
            document.querySelectorAll('.provider-card').forEach(card => {
                card.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');

            // 显示对应的 API 配置
            document.querySelectorAll('.api-config').forEach(config => {
                config.style.display = 'none';
            });
            const configEl = document.getElementById(provider + '-config');
            if (configEl) {
                configEl.style.display = 'block';
            }
        }

        function saveApiKey(provider) {
            const input = document.getElementById(provider + '-key');
            const apiKey = input.value;

            if (!apiKey || apiKey === '••••••••••••••••') {
                return;
            }

            vscode.postMessage({
                command: 'saveApiKey',
                provider,
                apiKey
            });
        }

        function testConnection(provider) {
            vscode.postMessage({
                command: 'testConnection',
                provider
            });
        }

        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }

        function close() {
            vscode.postMessage({ command: 'close' });
        }
    </script>
</body>
</html>`;
    }
    /**
     * 清理资源
     */
    dispose() {
        AIConfigPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.AIConfigPanel = AIConfigPanel;
AIConfigPanel.viewType = 'svnAIConfig';
//# sourceMappingURL=aiConfigPanel.js.map