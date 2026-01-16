import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ConfigurationManager } from './config/settings';
import { CommitInterceptor } from './core/commitInterceptor';
import { SvnCommandInterceptor } from './core/svnCommandInterceptor';
import { DependencyChecker } from './utils/dependencyChecker';

let logger: Logger;
let commitInterceptor: CommitInterceptor | undefined;
let svnCommandInterceptor: SvnCommandInterceptor | undefined;
let dependencyChecker: DependencyChecker | undefined;

export async function activate(context: vscode.ExtensionContext) {
    logger = new Logger('SVN-AI-Check');
    logger.info('SVN Commit AI Check extension activating...');

    // 初始化配置管理器
    const configManager = new ConfigurationManager();

    // 检查是否启用
    if (!configManager.isEnabled()) {
        logger.info('Extension is disabled');
        return;
    }

    // ========== 依赖检查 ==========
    dependencyChecker = new DependencyChecker(logger);

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
    commitInterceptor = new CommitInterceptor(context, configManager, logger);
    await commitInterceptor.initialize();

    // 初始化 SVN 命令拦截器（处理提交按钮点击）
    svnCommandInterceptor = new SvnCommandInterceptor(
        context,
        configManager,
        commitInterceptor,
        logger
    );
    await svnCommandInterceptor.initialize();

    // 注册依赖管理命令
    registerDependencyCommands(context, dependencyChecker);

    // 注册命令：手动触发分析
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.analyzeChanges',
            async () => {
                logger.info('Manual analysis triggered');
                if (commitInterceptor) {
                    const shouldContinue = await commitInterceptor.handleCommit();
                    if (shouldContinue) {
                        vscode.window.showInformationMessage('✅ Analysis complete, you can proceed with commit');
                    } else {
                        vscode.window.showInformationMessage('❌ Commit cancelled');
                    }
                }
            }
        )
    );

    // 注册命令：打开配置
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

    // 状态栏按钮
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
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
    } else {
        logger.warn('SVN extension not installed. Some features may be limited.');
    }
}

export function deactivate() {
    logger?.info('Extension deactivating...');
    svnCommandInterceptor?.dispose();
    commitInterceptor?.dispose();
}

/**
 * 注册依赖管理相关命令
 */
function registerDependencyCommands(
    context: vscode.ExtensionContext,
    checker: DependencyChecker
): void {
    // 命令：检查依赖状态
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.checkDependencies',
            async () => {
                const summary = await checker.getDependencyStatusSummary();

                // 在输出面板显示详细信息
                logger.info(summary);

                // 显示简要通知
                const result = await checker.checkDependencies();
                if (result.allRequiredInstalled) {
                    vscode.window.showInformationMessage(
                        `✅ 所有依赖已安装 (${result.installed.length}/${result.installed.length + result.missing.length})`
                    );
                } else {
                    const missing = result.missingRequired.map(d => d.displayName).join(', ');
                    vscode.window.showWarningMessage(
                        `⚠️ 缺少必需依赖: ${missing}`,
                        '安装依赖'
                    ).then(choice => {
                        if (choice === '安装依赖') {
                            vscode.commands.executeCommand('svn-commit-ai-check.installDependencies');
                        }
                    });
                }
            }
        )
    );

    // 命令：安装缺失的依赖
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'svn-commit-ai-check.installDependencies',
            async () => {
                logger.info('Installing missing dependencies...');
                const success = await checker.checkAndHandleDependencies();

                if (success) {
                    vscode.window.showInformationMessage(
                        '✅ 依赖安装完成！建议重新加载窗口。',
                        '重新加载'
                    ).then(choice => {
                        if (choice === '重新加载') {
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    });
                }
            }
        )
    );
}
