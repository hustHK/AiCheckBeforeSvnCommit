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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const logger_1 = require("./utils/logger");
const settings_1 = require("./config/settings");
const commitInterceptor_1 = require("./core/commitInterceptor");
const svnCommandInterceptor_1 = require("./core/svnCommandInterceptor");
const dependencyChecker_1 = require("./utils/dependencyChecker");
let logger;
let commitInterceptor;
let svnCommandInterceptor;
let dependencyChecker;
async function activate(context) {
    logger = new logger_1.Logger('SVN-AI-Check');
    logger.info('SVN Commit AI Check extension activating...');
    // 初始化配置管理器
    const configManager = new settings_1.ConfigurationManager();
    // 检查是否启用
    if (!configManager.isEnabled()) {
        logger.info('Extension is disabled');
        return;
    }
    // ========== 依赖检查 ==========
    dependencyChecker = new dependencyChecker_1.DependencyChecker(logger);
    // 检查并处理依赖
    const dependenciesReady = await dependencyChecker.checkAndHandleDependencies();
    if (!dependenciesReady) {
        logger.warn('Required dependencies not installed. Extension running in limited mode.');
        // 注册一个命令，让用户可以重新检查依赖
        registerDependencyCommands(context, dependencyChecker);
        return;
    }
    // 输出依赖状态
    const depSummary = await dependencyChecker.getDependencyStatusSummary();
    logger.info(depSummary);
    // ========== 初始化核心模块 ==========
    // 初始化提交拦截器（AI 分析逻辑）
    commitInterceptor = new commitInterceptor_1.CommitInterceptor(context, configManager, logger);
    await commitInterceptor.initialize();
    // 初始化 SVN 命令拦截器（处理提交按钮点击）
    svnCommandInterceptor = new svnCommandInterceptor_1.SvnCommandInterceptor(context, configManager, commitInterceptor, logger);
    await svnCommandInterceptor.initialize();
    // 注册依赖管理命令
    registerDependencyCommands(context, dependencyChecker);
    // 注册命令：手动触发分析
    context.subscriptions.push(vscode.commands.registerCommand('svn-commit-ai-check.analyzeChanges', async () => {
        logger.info('Manual analysis triggered');
        if (commitInterceptor) {
            const shouldContinue = await commitInterceptor.handleCommit();
            if (shouldContinue) {
                vscode.window.showInformationMessage('✅ Analysis complete, you can proceed with commit');
            }
            else {
                vscode.window.showInformationMessage('❌ Commit cancelled');
            }
        }
    }));
    // 注册命令：打开配置
    context.subscriptions.push(vscode.commands.registerCommand('svn-commit-ai-check.configure', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'svn-commit-ai-check');
    }));
    // 状态栏按钮
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(sparkle) SVN AI';
    statusBarItem.tooltip = 'SVN Commit AI Check - Click to trigger AI analysis';
    statusBarItem.command = 'svn-commit-ai-check.commitWithCheck';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // 显示激活信息
    logger.info('SVN Commit AI Check extension activated successfully');
    logger.info('Commands available:');
    logger.info('  - "SVN: Commit with AI Check" - Commit with AI code review');
    logger.info('  - "SVN: Analyze Changes with AI" - Analyze without commit');
    logger.info('  - "SVN: Quick Commit (Skip AI Check)" - Commit without AI check');
    // 检测 SVN 扩展状态
    const svnInfo = await svnCommandInterceptor.getSvnExtensionInfo();
    if (svnInfo.installed) {
        logger.info(`SVN extension detected: v${svnInfo.version}, active: ${svnInfo.active}`);
    }
    else {
        logger.warn('SVN extension not installed. Some features may be limited.');
    }
}
function deactivate() {
    logger?.info('Extension deactivating...');
    svnCommandInterceptor?.dispose();
    commitInterceptor?.dispose();
}
/**
 * 注册依赖管理相关命令
 */
function registerDependencyCommands(context, checker) {
    // 命令：检查依赖状态
    context.subscriptions.push(vscode.commands.registerCommand('svn-commit-ai-check.checkDependencies', async () => {
        const summary = await checker.getDependencyStatusSummary();
        // 在输出面板显示详细信息
        logger.info(summary);
        // 显示简要通知
        const result = await checker.checkDependencies();
        if (result.allRequiredInstalled) {
            vscode.window.showInformationMessage(`✅ 所有依赖已安装 (${result.installed.length}/${result.installed.length + result.missing.length})`);
        }
        else {
            const missing = result.missingRequired.map(d => d.displayName).join(', ');
            vscode.window.showWarningMessage(`⚠️ 缺少必需依赖: ${missing}`, '安装依赖').then(choice => {
                if (choice === '安装依赖') {
                    vscode.commands.executeCommand('svn-commit-ai-check.installDependencies');
                }
            });
        }
    }));
    // 命令：安装缺失的依赖
    context.subscriptions.push(vscode.commands.registerCommand('svn-commit-ai-check.installDependencies', async () => {
        logger.info('Installing missing dependencies...');
        const success = await checker.checkAndHandleDependencies();
        if (success) {
            vscode.window.showInformationMessage('✅ 依赖安装完成！建议重新加载窗口。', '重新加载').then(choice => {
                if (choice === '重新加载') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    }));
}
//# sourceMappingURL=extension.js.map