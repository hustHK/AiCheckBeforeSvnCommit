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
exports.AIServiceManager = void 0;
const vscode = __importStar(require("vscode"));
const cursorDetector_1 = require("../utils/cursorDetector");
const cursorAdapter_1 = require("./cursorAdapter");
const deepseekAdapter_1 = require("./deepseekAdapter");
const claudeAdapter_1 = require("./claudeAdapter");
const openaiAdapter_1 = require("./openaiAdapter");
const prompts_1 = require("../config/prompts");
const aiProviderSelector_1 = require("../ui/aiProviderSelector");
const aiConfigPanel_1 = require("../ui/aiConfigPanel");
const analysisResultPanel_1 = require("../ui/analysisResultPanel");
/**
 * AI 服务管理器
 * 负责选择和管理不同的 AI 服务提供商
 *
 * 智能检测规则：
 * 1. 如果在 Cursor 环境中 → 优先使用 Cursor AI
 * 2. 如果在 VSCode 环境中 → 只使用外部 API（DeepSeek/Claude/OpenAI）
 * 3. 用户可以在设置中强制选择特定提供商
 */
class AIServiceManager {
    constructor(configManager, logger) {
        this.configManager = configManager;
        this.logger = logger;
        this.currentAdapter = null;
        this.currentProvider = 'unknown';
        this.isCursorEnvironment = false;
        this.extensionUri = null;
        this.cursorDetector = new cursorDetector_1.CursorDetector(logger);
        this.providerSelector = new aiProviderSelector_1.AIProviderSelector(configManager, logger);
    }
    /**
     * 设置扩展 URI（用于创建 WebView）
     */
    setExtensionUri(uri) {
        this.extensionUri = uri;
    }
    /**
     * 初始化 AI 服务（智能检测或让用户选择）
     */
    async initialize() {
        this.logger.info('Initializing AI service...');
        // 检测环境
        this.isCursorEnvironment = this.cursorDetector.isCursorEditor();
        const envSummary = await this.cursorDetector.getEnvironmentSummary();
        this.logger.info('Environment summary:\n' + envSummary);
        // 根据配置选择 AI 提供商
        const aiProvider = this.configManager.getAIProvider();
        if (aiProvider === 'auto') {
            // 自动检测
            await this.autoDetectProvider();
        }
        else if (aiProvider === 'cursor') {
            // 强制使用 Cursor（仅在 Cursor 环境中有效）
            if (this.isCursorEnvironment) {
                await this.initializeCursorAI();
            }
            else {
                throw new Error('Cursor AI is only available in Cursor environment. Please select another provider.');
            }
        }
        else if (aiProvider === 'deepseek') {
            await this.initializeDeepSeek();
        }
        else if (aiProvider === 'claude') {
            await this.initializeClaude();
        }
        else if (aiProvider === 'openai') {
            await this.initializeOpenAI();
        }
        else {
            // 未配置或配置无效，显示选择界面
            await this.autoDetectProvider();
        }
    }
    /**
     * 自动检测并选择最佳的 AI 提供商
     */
    async autoDetectProvider() {
        this.logger.info('Auto-detecting AI provider...');
        // 在 Cursor 环境中，优先推荐 Cursor AI
        if (this.isCursorEnvironment) {
            this.logger.info('Cursor environment detected, offering Cursor AI');
            const chatInfo = await this.cursorDetector.isCursorChatAvailable();
            if (chatInfo.available) {
                // 询问用户是否使用 Cursor AI
                const choice = await vscode.window.showInformationMessage('检测到 Cursor 编辑器！推荐使用 Cursor 内置 AI（免费）', '使用 Cursor AI', '选择其他 API');
                if (choice === '使用 Cursor AI') {
                    await this.initializeCursorAI(chatInfo.commandId);
                    return;
                }
            }
        }
        else {
            // 在 VSCode 环境中，显示配置面板
            this.logger.info('VSCode environment detected, showing config panel');
        }
        // 显示 AI 提供商选择界面
        const selectedProvider = await this.showProviderSelection();
        if (!selectedProvider) {
            throw new Error('No AI provider selected');
        }
        // 根据选择初始化对应的适配器
        await this.initializeProvider(selectedProvider);
    }
    /**
     * 显示提供商选择（根据环境使用不同方式）
     */
    async showProviderSelection() {
        if (this.isCursorEnvironment) {
            // Cursor 环境：使用 QuickPick（快速）
            return await this.providerSelector.showProviderSelection(true);
        }
        else {
            // VSCode 环境：使用 WebView 配置面板（美观）
            return await this.showConfigPanel();
        }
    }
    /**
     * 显示 WebView 配置面板
     */
    async showConfigPanel() {
        return new Promise((resolve) => {
            if (!this.extensionUri) {
                // 没有 extensionUri，使用 QuickPick
                this.providerSelector.showProviderSelection(false).then(resolve);
                return;
            }
            aiConfigPanel_1.AIConfigPanel.createOrShow(this.extensionUri, this.configManager, this.logger, (provider) => {
                resolve(provider);
            });
        });
    }
    /**
     * 初始化指定的提供商
     */
    async initializeProvider(provider) {
        switch (provider) {
            case 'cursor':
                await this.initializeCursorAI();
                break;
            case 'deepseek':
                await this.initializeDeepSeek();
                break;
            case 'claude':
                await this.initializeClaude();
                break;
            case 'openai':
                await this.initializeOpenAI();
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
    /**
     * 初始化 Cursor AI
     */
    async initializeCursorAI(chatCommandId) {
        this.logger.info('Initializing Cursor AI adapter...');
        this.currentAdapter = new cursorAdapter_1.CursorAIAdapter(this.logger, chatCommandId);
        this.currentProvider = 'cursor';
        this.logger.info('Cursor AI adapter initialized');
    }
    /**
     * 初始化 DeepSeek API
     */
    async initializeDeepSeek() {
        this.logger.info('Initializing DeepSeek adapter...');
        const apiKey = this.configManager.getDeepSeekApiKey();
        if (!apiKey) {
            throw new Error('DeepSeek API key not configured');
        }
        this.currentAdapter = new deepseekAdapter_1.DeepSeekAdapter(apiKey, this.logger);
        this.currentProvider = 'deepseek';
        this.logger.info('DeepSeek adapter initialized');
    }
    /**
     * 初始化 Claude API
     */
    async initializeClaude() {
        this.logger.info('Initializing Claude adapter...');
        const apiKey = this.configManager.getClaudeApiKey();
        if (!apiKey) {
            throw new Error('Claude API key not configured');
        }
        this.currentAdapter = new claudeAdapter_1.ClaudeAdapter(apiKey, this.logger);
        this.currentProvider = 'claude';
        this.logger.info('Claude adapter initialized');
    }
    /**
     * 初始化 OpenAI API
     */
    async initializeOpenAI() {
        this.logger.info('Initializing OpenAI adapter...');
        const apiKey = this.configManager.getOpenAIApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        this.currentAdapter = new openaiAdapter_1.OpenAIAdapter(apiKey, this.logger);
        this.currentProvider = 'openai';
        this.logger.info('OpenAI adapter initialized');
    }
    /**
     * 分析代码变更
     */
    async analyzeChanges(changes, token) {
        if (!this.currentAdapter) {
            throw new Error('AI service not initialized. Call initialize() first.');
        }
        this.logger.info(`Analyzing ${changes.length} file(s) with ${this.currentProvider}...`);
        // 构建 Prompt
        const customPrompt = this.configManager.getSystemPrompt();
        const prompt = (0, prompts_1.buildAnalysisPrompt)(changes.map(change => ({
            path: change.path,
            status: change.status,
            language: change.language,
            diffContent: change.diffContent,
            fullContent: change.fullContent
        })), customPrompt);
        this.logger.info(`Prompt generated, length: ${prompt.length} characters`);
        this.logger.debug('Prompt preview:', prompt.substring(0, 500) + '...');
        // 调用 AI 分析
        const startTime = Date.now();
        const rawResponse = await this.currentAdapter.analyze(prompt, token);
        const duration = Date.now() - startTime;
        this.logger.info(`AI analysis completed in ${duration}ms`);
        this.logger.info(`Response length: ${rawResponse.length} characters`);
        // 生成摘要
        const summary = this.generateSummary(rawResponse);
        return {
            rawResponse,
            summary,
            timestamp: new Date(),
            provider: this.currentProvider,
            duration,
            fileCount: changes.length
        };
    }
    /**
     * 分析代码变更并显示结果在 WebView 中
     */
    async analyzeAndShowResults(changes, token) {
        if (!this.extensionUri) {
            // 没有 extensionUri，使用普通分析
            return await this.analyzeChanges(changes, token);
        }
        // 创建或显示结果面板
        const resultPanel = analysisResultPanel_1.AnalysisResultPanel.createOrShow(this.extensionUri, this.logger);
        // 显示加载状态
        resultPanel.showLoading(`正在使用 ${this.getProviderDisplayName()} 分析 ${changes.length} 个文件...`);
        try {
            // 执行分析
            const result = await this.analyzeChanges(changes, token);
            // 显示结果
            resultPanel.showResult(result.rawResponse, {
                provider: this.getProviderDisplayName(),
                timestamp: result.timestamp,
                fileCount: result.fileCount || changes.length,
                duration: result.duration
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            resultPanel.showError('分析失败', errorMessage);
            throw error;
        }
    }
    /**
     * 获取提供商显示名称
     */
    getProviderDisplayName() {
        const names = {
            'cursor': 'Cursor AI',
            'deepseek': 'DeepSeek',
            'claude': 'Claude',
            'openai': 'OpenAI',
            'unknown': 'Unknown'
        };
        return names[this.currentProvider] || this.currentProvider;
    }
    /**
     * 生成分析摘要
     */
    generateSummary(response) {
        // 改进的摘要生成：匹配 P0/P1/P2 格式
        const p0Count = (response.match(/🔴\s*P0|P0\s*严重|Critical/gi) || []).length;
        const p1Count = (response.match(/🟡\s*P1|P1\s*中等|High/gi) || []).length;
        const p2Count = (response.match(/🔵\s*P2|P2\s*轻微|Low/gi) || []).length;
        const totalIssues = p0Count + p1Count + p2Count;
        if (totalIssues === 0) {
            // 检查是否有其他问题指示
            if (response.includes('未发现') || response.includes('代码质量良好') || response.includes('no issues')) {
                return '✅ 未发现明显问题';
            }
            return '📊 分析完成';
        }
        let summary = `发现 ${totalIssues} 个问题：`;
        const parts = [];
        if (p0Count > 0) {
            parts.push(`🔴 P0: ${p0Count}`);
        }
        if (p1Count > 0) {
            parts.push(`🟡 P1: ${p1Count}`);
        }
        if (p2Count > 0) {
            parts.push(`🔵 P2: ${p2Count}`);
        }
        return summary + parts.join(' | ');
    }
    /**
     * 获取当前使用的 AI 提供商
     */
    getCurrentProvider() {
        return this.currentProvider;
    }
    /**
     * 检查是否为 Cursor 环境
     */
    isCursor() {
        return this.isCursorEnvironment;
    }
    /**
     * 重新选择 AI 提供商
     */
    async reconfigureProvider() {
        const selectedProvider = await this.showProviderSelection();
        if (selectedProvider) {
            await this.initializeProvider(selectedProvider);
        }
    }
}
exports.AIServiceManager = AIServiceManager;
//# sourceMappingURL=aiServiceManager.js.map