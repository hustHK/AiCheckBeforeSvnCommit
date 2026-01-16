import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/settings';
import { Logger } from '../utils/logger';

export interface AIProviderOption {
    id: string;
    label: string;
    description: string;
    detail?: string;
    requiresApiKey: boolean;
    recommended?: boolean;
}

/**
 * AI 提供商选择器
 * 提供类似 Cursor Models 选择的用户界面
 */
export class AIProviderSelector {
    private static readonly PROVIDERS: AIProviderOption[] = [
        {
            id: 'cursor',
            label: '$(sparkle) Cursor AI',
            description: 'Use Cursor built-in AI (手动模式)',
            detail: '优先推荐 • 免费 • 需要在 Cursor Chat 中操作',
            requiresApiKey: false,
            recommended: true
        },
        {
            id: 'deepseek',
            label: '$(zap) DeepSeek',
            description: 'High performance code analysis',
            detail: '性价比最高 • ¥1/百万tokens • 代码能力强',
            requiresApiKey: true,
            recommended: true
        },
        {
            id: 'claude',
            label: '$(hubot) Claude',
            description: 'Anthropic Claude 3.5 Sonnet',
            detail: '代码理解能力强 • 安全分析专业',
            requiresApiKey: true
        },
        {
            id: 'openai',
            label: '$(circuit-board) OpenAI',
            description: 'GPT-4 Turbo',
            detail: '通用能力强 • 需要 API Key',
            requiresApiKey: true
        }
    ];

    constructor(
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {}

    /**
     * 显示 AI 提供商选择界面
     */
    async showProviderSelection(isCursorEnv: boolean): Promise<string | undefined> {
        this.logger.info(`Showing AI provider selection, isCursor: ${isCursorEnv}`);

        // 如果在 Cursor 环境中，优先推荐 Cursor AI
        let providers = [...AIProviderSelector.PROVIDERS];
        
        if (isCursorEnv) {
            // Cursor 环境：优先显示 Cursor AI
            providers = providers.sort((a, b) => {
                if (a.id === 'cursor') return -1;
                if (b.id === 'cursor') return 1;
                return 0;
            });
        } else {
            // VSCode 环境：过滤掉 Cursor AI，只显示外部 API
            providers = providers.filter(p => p.id !== 'cursor');
        }

        // 创建 QuickPick 项
        const items: vscode.QuickPickItem[] = providers.map(provider => ({
            label: provider.label,
            description: provider.description,
            detail: provider.detail,
            picked: provider.recommended
        }));

        // 显示选择界面
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择 AI 服务提供商',
            title: '🤖 AI Service Provider',
            ignoreFocusOut: true,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selected) {
            this.logger.info('User cancelled provider selection');
            return undefined;
        }

        // 查找对应的提供商
        const provider = providers.find(p => p.label === selected.label);
        if (!provider) {
            return undefined;
        }

        this.logger.info(`User selected provider: ${provider.id}`);

        // 如果需要 API Key，引导用户配置
        if (provider.requiresApiKey) {
            const configured = await this.ensureApiKeyConfigured(provider);
            if (!configured) {
                return undefined;
            }
        }

        // 保存用户选择
        await this.configManager.setAIProvider(provider.id);

        return provider.id;
    }

    /**
     * 确保 API Key 已配置
     */
    private async ensureApiKeyConfigured(provider: AIProviderOption): Promise<boolean> {
        // 检查是否已有 API Key
        let apiKey = '';
        switch (provider.id) {
            case 'deepseek':
                apiKey = this.configManager.getDeepSeekApiKey();
                break;
            case 'claude':
                apiKey = this.configManager.getClaudeApiKey();
                break;
            case 'openai':
                apiKey = this.configManager.getOpenAIApiKey();
                break;
        }

        if (apiKey) {
            // 已有 API Key，询问是否使用
            const choice = await vscode.window.showInformationMessage(
                `检测到已配置的 ${provider.label} API Key`,
                '使用现有配置',
                '重新配置'
            );

            if (choice === '使用现有配置') {
                return true;
            }
        }

        // 引导用户配置 API Key
        return await this.showApiKeyConfiguration(provider);
    }

    /**
     * 显示 API Key 配置向导
     */
    private async showApiKeyConfiguration(provider: AIProviderOption): Promise<boolean> {
        // 显示帮助信息
        const helpUrls: Record<string, string> = {
            'deepseek': 'https://platform.deepseek.com/api_keys',
            'claude': 'https://console.anthropic.com/account/keys',
            'openai': 'https://platform.openai.com/api-keys'
        };

        const message = `配置 ${provider.label} API Key\n\n` +
                       `请访问以下网址获取 API Key：\n${helpUrls[provider.id] || ''}`;

        const choice = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            '打开网页',
            '已有 API Key',
            '取消'
        );

        if (choice === '取消') {
            return false;
        }

        if (choice === '打开网页') {
            vscode.env.openExternal(vscode.Uri.parse(helpUrls[provider.id] || ''));
        }

        // 输入 API Key
        const apiKey = await vscode.window.showInputBox({
            prompt: `请输入 ${provider.label} 的 API Key`,
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'sk-...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API Key 不能为空';
                }
                return null;
            }
        });

        if (!apiKey) {
            return false;
        }

        // 保存 API Key
        const configKey = `${provider.id}.apiKey`;
        await vscode.workspace.getConfiguration('svn-commit-ai-check')
            .update(configKey, apiKey, vscode.ConfigurationTarget.Global);

        this.logger.info(`API Key configured for ${provider.id}`);

        vscode.window.showInformationMessage(
            `✅ ${provider.label} API Key 配置成功！`
        );

        return true;
    }

    /**
     * 显示模型选择（可选）
     */
    async showModelSelection(provider: string): Promise<string | undefined> {
        const models: Record<string, Array<{ label: string; value: string; description: string }>> = {
            'deepseek': [
                { label: 'DeepSeek Coder', value: 'deepseek-coder', description: '代码专用模型（推荐）' },
                { label: 'DeepSeek Chat', value: 'deepseek-chat', description: '通用对话模型' }
            ],
            'claude': [
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', description: '最新版本（推荐）' },
                { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229', description: '最强性能' },
                { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229', description: '平衡版本' }
            ],
            'openai': [
                { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview', description: '最新 GPT-4（推荐）' },
                { label: 'GPT-4', value: 'gpt-4', description: '标准 GPT-4' },
                { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', description: '更快更便宜' }
            ]
        };

        const providerModels = models[provider];
        if (!providerModels) {
            return undefined;
        }

        const items = providerModels.map(m => ({
            label: m.label,
            description: m.description,
            detail: m.value
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择模型',
            title: `🎯 ${provider.toUpperCase()} Models`,
            ignoreFocusOut: true
        });

        return selected ? providerModels.find(m => m.label === selected.label)?.value : undefined;
    }
}
