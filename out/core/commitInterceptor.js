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
exports.CommitInterceptor = void 0;
const vscode = __importStar(require("vscode"));
const diffAnalyzer_1 = require("./diffAnalyzer");
const aiServiceManager_1 = require("../ai/aiServiceManager");
const analysisResultPanel_1 = require("../ui/analysisResultPanel");
class CommitInterceptor {
    constructor(context, configManager, logger) {
        this.context = context;
        this.configManager = configManager;
        this.logger = logger;
        this.disposables = [];
        this.lastAnalysisResult = null;
        this.extensionUri = null;
        this.diffAnalyzer = new diffAnalyzer_1.DiffAnalyzer(configManager, logger);
        this.aiServiceManager = new aiServiceManager_1.AIServiceManager(configManager, logger);
        this.extensionUri = context.extensionUri;
        // 设置扩展 URI 到 AI 服务管理器
        this.aiServiceManager.setExtensionUri(context.extensionUri);
    }
    /**
     * 初始化拦截器
     */
    async initialize() {
        this.logger.info('Commit interceptor initializing...');
        // 检查是否在 SVN 仓库中
        const isSvn = await this.diffAnalyzer.isSvnRepository();
        if (!isSvn) {
            this.logger.info('Not in SVN repository, interceptor disabled');
            return;
        }
        this.logger.info('Commit interceptor initialized successfully');
    }
    /**
     * 处理提交请求
     * @returns true 表示允许继续提交，false 表示取消提交
     */
    async handleCommit() {
        try {
            this.logger.info('=== SVN Commit Check Started ===');
            // 1. 询问用户是否需要 AI 分析
            const shouldAnalyze = await this.askUserConfirmation();
            if (!shouldAnalyze) {
                this.logger.info('User skipped AI analysis, proceeding with commit');
                return true; // 允许继续提交
            }
            // 2. 获取变更
            this.logger.info('Getting SVN changes...');
            const changes = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Getting SVN changes...",
                cancellable: false
            }, async () => {
                return await this.diffAnalyzer.getChanges();
            });
            if (changes.length === 0) {
                vscode.window.showInformationMessage('No changes to analyze');
                return true;
            }
            // 显示变更摘要
            const summary = this.diffAnalyzer.getChangesSummary(changes);
            this.logger.info(`Changes: ${summary}`);
            // 3. 执行 AI 分析并展示结果
            await this.performAIAnalysis(changes);
            // 4. 询问是否继续提交
            const shouldContinue = await this.askContinueCommit();
            return shouldContinue;
        }
        catch (error) {
            this.logger.error('Error during commit handling:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const choice = await vscode.window.showErrorMessage(`AI analysis failed: ${errorMessage}`, 'Continue Commit Anyway', 'Cancel Commit');
            return choice === 'Continue Commit Anyway';
        }
    }
    /**
     * 询问用户是否需要 AI 分析
     */
    async askUserConfirmation() {
        // 如果配置为自动检查，直接返回 true
        if (this.configManager.isAutoCheck()) {
            this.logger.info('Auto-check enabled, proceeding with analysis');
            return true;
        }
        // 显示模态对话框
        const choice = await vscode.window.showInformationMessage('🤖 是否需要 AI 智能分析本次提交的代码？', {
            modal: true,
            detail: '将分析代码变更，识别潜在问题（重点关注 C++ 和 Go 代码）'
        }, '✅ OK', '❌ Cancel');
        const result = choice === '✅ OK';
        this.logger.info(`User confirmation: ${result ? 'OK' : 'Cancel'}`);
        return result;
    }
    /**
     * 执行 AI 分析
     */
    async performAIAnalysis(changes) {
        this.logger.info('Performing AI analysis...');
        // 初始化 AI 服务
        try {
            await this.aiServiceManager.initialize();
        }
        catch (error) {
            this.logger.error('Failed to initialize AI service:', error);
            throw error;
        }
        // 创建取消令牌
        const tokenSource = new vscode.CancellationTokenSource();
        // 如果有 extensionUri，使用 WebView 展示
        if (this.extensionUri) {
            await this.performAIAnalysisWithWebView(changes, tokenSource.token);
        }
        else {
            // 否则使用传统的进度条方式
            await this.performAIAnalysisWithProgress(changes, tokenSource.token);
        }
    }
    /**
     * 使用 WebView 展示分析结果
     */
    async performAIAnalysisWithWebView(changes, token) {
        // 创建结果面板
        const resultPanel = analysisResultPanel_1.AnalysisResultPanel.createOrShow(this.extensionUri, this.logger);
        // 显示加载状态
        const provider = this.aiServiceManager.getCurrentProvider() || 'AI';
        resultPanel.showLoading(`正在使用 ${provider} 分析 ${changes.length} 个文件...`);
        try {
            // 执行分析
            const result = await this.aiServiceManager.analyzeChanges(changes, token);
            // 保存结果
            this.lastAnalysisResult = result;
            // 在 WebView 中显示结果
            resultPanel.showResult(result.rawResponse, {
                provider: this.getProviderDisplayName(result.provider),
                timestamp: result.timestamp,
                fileCount: result.fileCount || changes.length,
                duration: result.duration
            });
            this.logger.info('AI analysis completed and displayed in WebView');
            this.logger.info(`Summary: ${result.summary}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            resultPanel.showError('分析失败', errorMessage);
            throw error;
        }
    }
    /**
     * 使用进度条方式执行分析（传统方式）
     */
    async performAIAnalysisWithProgress(changes, token) {
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🤖 AI Code Analysis",
            cancellable: true
        }, async (progress, progressToken) => {
            progress.report({ increment: 0, message: "Initializing AI service..." });
            progress.report({ increment: 20, message: "Preparing code changes..." });
            try {
                progress.report({ increment: 40, message: "Analyzing with AI..." });
                // 实际调用 AI 分析
                const analysisResult = await this.aiServiceManager.analyzeChanges(changes, progressToken);
                progress.report({ increment: 100, message: "Analysis complete!" });
                return analysisResult;
            }
            catch (error) {
                if (progressToken.isCancellationRequested) {
                    throw new Error('Analysis cancelled by user');
                }
                throw error;
            }
        });
        // 保存分析结果
        this.lastAnalysisResult = result;
        this.logger.info('AI analysis completed');
        this.logger.info(`Summary: ${result.summary}`);
        // 显示分析结果
        await this.showAnalysisResultInEditor(result);
    }
    /**
     * 在编辑器中显示分析结果（传统方式）
     */
    async showAnalysisResultInEditor(result) {
        const provider = this.getProviderDisplayName(result.provider);
        // 创建一个新的文档来展示结果
        const doc = await vscode.workspace.openTextDocument({
            content: result.rawResponse,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: vscode.ViewColumn.Beside
        });
        // 显示摘要通知
        vscode.window.showInformationMessage(`✅ AI 分析完成 (${provider})：${result.summary}`);
    }
    /**
     * 获取提供商显示名称
     */
    getProviderDisplayName(provider) {
        const names = {
            'cursor': 'Cursor AI',
            'deepseek': 'DeepSeek',
            'claude': 'Claude',
            'openai': 'OpenAI'
        };
        return names[provider] || provider.toUpperCase();
    }
    /**
     * 询问是否继续提交
     */
    async askContinueCommit() {
        let detail = 'AI 分析已完成，您可以选择继续提交或取消提交';
        // 如果有分析结果，添加摘要信息
        if (this.lastAnalysisResult) {
            detail += `\n\n${this.lastAnalysisResult.summary}`;
        }
        const choice = await vscode.window.showWarningMessage('📊 分析完成，是否继续提交？', {
            modal: true,
            detail
        }, '✅ Continue Commit', '❌ Cancel Commit', '📄 查看完整报告');
        if (choice === '📄 查看完整报告') {
            // 再次显示报告
            if (this.lastAnalysisResult && this.extensionUri) {
                const resultPanel = analysisResultPanel_1.AnalysisResultPanel.createOrShow(this.extensionUri, this.logger);
                resultPanel.showResult(this.lastAnalysisResult.rawResponse, {
                    provider: this.getProviderDisplayName(this.lastAnalysisResult.provider),
                    timestamp: this.lastAnalysisResult.timestamp,
                    fileCount: this.lastAnalysisResult.fileCount || 0,
                    duration: this.lastAnalysisResult.duration
                });
            }
            else if (this.lastAnalysisResult) {
                await this.showAnalysisResultInEditor(this.lastAnalysisResult);
            }
            // 再次询问
            return await this.askContinueCommit();
        }
        const result = choice === '✅ Continue Commit';
        this.logger.info(`Continue commit: ${result ? 'Yes' : 'No'}`);
        return result;
    }
    /**
     * 获取最后一次分析结果
     */
    getLastAnalysisResult() {
        return this.lastAnalysisResult;
    }
    /**
     * 释放资源
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.CommitInterceptor = CommitInterceptor;
//# sourceMappingURL=commitInterceptor.js.map