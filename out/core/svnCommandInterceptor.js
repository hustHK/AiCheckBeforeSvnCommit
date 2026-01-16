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
exports.SvnCommandInterceptor = void 0;
const vscode = __importStar(require("vscode"));
/**
 * SVN 命令拦截器
 *
 * 拦截 SVN 扩展的提交命令，在提交前执行 AI 代码检查
 *
 * 支持的 SVN 扩展：
 * - johnstoncode.svn-scm (SVN by Chris Johnston)
 *
 * 拦截方式：
 * 1. 注册自己的提交命令 `svn-commit-ai-check.commitWithCheck`
 * 2. 通过 menu 配置替换 SCM 面板的提交按钮
 * 3. 用户点击时先执行 AI 检查，通过后再调用原始 svn.commit
 */
class SvnCommandInterceptor {
    constructor(context, configManager, commitInterceptor, logger) {
        this.context = context;
        this.configManager = configManager;
        this.commitInterceptor = commitInterceptor;
        this.logger = logger;
        this.disposables = [];
        this.isInterceptEnabled = true;
    }
    /**
     * 初始化拦截器
     */
    async initialize() {
        this.logger.info('Initializing SVN command interceptor...');
        // 检查 SVN 扩展是否安装
        const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm');
        if (!svnExtension) {
            this.logger.warn('SVN extension (johnstoncode.svn-scm) not found');
            this.logger.info('Interceptor will work in standalone mode');
        }
        else {
            this.logger.info('SVN extension detected: johnstoncode.svn-scm');
        }
        // 注册我们的智能提交命令
        this.registerCommitWithCheckCommand();
        // 读取配置
        this.isInterceptEnabled = this.configManager.isInterceptEnabled();
        this.logger.info(`Commit interception: ${this.isInterceptEnabled ? 'enabled' : 'disabled'}`);
        // 监听配置变化
        this.disposables.push(this.configManager.onConfigurationChanged(() => {
            this.isInterceptEnabled = this.configManager.isInterceptEnabled();
            this.logger.info(`Interception setting changed: ${this.isInterceptEnabled}`);
        }));
        this.logger.info('SVN command interceptor initialized');
    }
    /**
     * 注册带 AI 检查的提交命令
     */
    registerCommitWithCheckCommand() {
        // 主命令：带 AI 检查的提交
        const commitWithCheckCmd = vscode.commands.registerCommand('svn-commit-ai-check.commitWithCheck', async (resource) => {
            await this.handleCommitWithCheck(resource);
        });
        this.context.subscriptions.push(commitWithCheckCmd);
        this.disposables.push(commitWithCheckCmd);
        // 快速提交命令（跳过 AI 检查）
        const quickCommitCmd = vscode.commands.registerCommand('svn-commit-ai-check.quickCommit', async () => {
            await this.executeOriginalCommit();
        });
        this.context.subscriptions.push(quickCommitCmd);
        this.disposables.push(quickCommitCmd);
        this.logger.info('Commit commands registered');
    }
    /**
     * 处理带 AI 检查的提交
     */
    async handleCommitWithCheck(resource) {
        this.logger.info('=== Smart Commit with AI Check ===');
        try {
            // 1. 显示初始弹窗，询问用户是否需要 AI 检查
            const choice = await vscode.window.showInformationMessage('🤖 SVN 提交前是否需要 AI 智能代码检查？', {
                modal: true,
                detail: 'AI 将分析您的代码变更，检测潜在问题（重点关注 C++ 和 Go 代码）\n\n选择"跳过检查"将直接进行提交。'
            }, '✅ 进行 AI 检查', '⏭️ 跳过检查', '❌ 取消');
            if (choice === '❌ 取消' || !choice) {
                this.logger.info('User cancelled commit');
                return;
            }
            if (choice === '⏭️ 跳过检查') {
                this.logger.info('User skipped AI check, proceeding with commit');
                await this.executeOriginalCommit();
                return;
            }
            // 2. 执行 AI 检查
            this.logger.info('User requested AI check');
            const shouldContinue = await this.commitInterceptor.handleCommit();
            if (!shouldContinue) {
                this.logger.info('Commit cancelled after AI analysis');
                vscode.window.showInformationMessage('❌ 提交已取消');
                return;
            }
            // 3. AI 检查通过，执行提交
            this.logger.info('AI check passed, proceeding with commit');
            await this.executeOriginalCommit();
        }
        catch (error) {
            this.logger.error('Error during commit with check:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const retry = await vscode.window.showErrorMessage(`提交过程中出错: ${errorMessage}`, '重试', '跳过检查直接提交', '取消');
            if (retry === '重试') {
                await this.handleCommitWithCheck(resource);
            }
            else if (retry === '跳过检查直接提交') {
                await this.executeOriginalCommit();
            }
        }
    }
    /**
     * 执行原始的 SVN 提交命令
     */
    async executeOriginalCommit() {
        this.logger.info('Executing original SVN commit...');
        try {
            // 尝试调用 SVN 扩展的提交命令
            const commands = await vscode.commands.getCommands(true);
            if (commands.includes('svn.commit')) {
                await vscode.commands.executeCommand('svn.commit');
                this.logger.info('SVN commit command executed');
            }
            else if (commands.includes('svn.commitWithMessage')) {
                await vscode.commands.executeCommand('svn.commitWithMessage');
                this.logger.info('SVN commitWithMessage command executed');
            }
            else {
                // 如果没有 SVN 扩展命令，提示用户手动提交
                this.logger.warn('No SVN commit command found');
                vscode.window.showWarningMessage('未找到 SVN 提交命令，请手动执行 svn commit 或安装 SVN 扩展', '打开终端').then(choice => {
                    if (choice === '打开终端') {
                        vscode.commands.executeCommand('workbench.action.terminal.new');
                    }
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to execute SVN commit:', error);
            throw error;
        }
    }
    /**
     * 检查是否应该拦截提交
     */
    shouldIntercept() {
        return this.isInterceptEnabled;
    }
    /**
     * 获取 SVN 扩展信息
     */
    async getSvnExtensionInfo() {
        const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm');
        if (!svnExtension) {
            return { installed: false, active: false };
        }
        return {
            installed: true,
            active: svnExtension.isActive,
            version: svnExtension.packageJSON?.version
        };
    }
    /**
     * 释放资源
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.SvnCommandInterceptor = SvnCommandInterceptor;
// SVN 扩展常用的命令
SvnCommandInterceptor.SVN_COMMIT_COMMANDS = [
    'svn.commit', // 主提交命令
    'svn.commitWithMessage' // 带消息的提交
];
//# sourceMappingURL=svnCommandInterceptor.js.map