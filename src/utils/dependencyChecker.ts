import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * 依赖扩展信息
 */
export interface ExtensionDependency {
    /** 扩展 ID（publisher.name 格式） */
    id: string;
    /** 扩展显示名称 */
    displayName: string;
    /** 是否必需（必需的依赖会阻止插件启动） */
    required: boolean;
    /** 描述说明 */
    description: string;
    /** 扩展市场链接（备用） */
    marketplaceUrl?: string;
}

/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
    /** 是否所有必需依赖都已安装 */
    allRequiredInstalled: boolean;
    /** 已安装的依赖 */
    installed: ExtensionDependency[];
    /** 未安装的依赖 */
    missing: ExtensionDependency[];
    /** 未安装的必需依赖 */
    missingRequired: ExtensionDependency[];
    /** 未安装的可选依赖 */
    missingOptional: ExtensionDependency[];
}

/**
 * 依赖检查器
 *
 * 功能：
 * 1. 检查必需的扩展是否已安装
 * 2. 提示用户安装缺失的依赖
 * 3. 自动安装依赖扩展
 */
export class DependencyChecker {
    /**
     * 本插件依赖的扩展列表
     */
    private static readonly DEPENDENCIES: ExtensionDependency[] = [
        {
            id: 'johnstoncode.svn-scm',
            displayName: 'SVN',
            required: true,
            description: 'SVN 源代码管理扩展，提供 SVN 集成功能',
            marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=johnstoncode.svn-scm'
        }
        // 可以在这里添加更多依赖
        // {
        //     id: 'some.other-extension',
        //     displayName: 'Other Extension',
        //     required: false,
        //     description: '可选的扩展'
        // }
    ];

    constructor(private logger: Logger) {}

    /**
     * 检查所有依赖是否已安装
     */
    async checkDependencies(): Promise<DependencyCheckResult> {
        this.logger.info('Checking extension dependencies...');

        const installed: ExtensionDependency[] = [];
        const missing: ExtensionDependency[] = [];

        for (const dep of DependencyChecker.DEPENDENCIES) {
            const extension = vscode.extensions.getExtension(dep.id);

            if (extension) {
                installed.push(dep);
                this.logger.info(`✅ ${dep.displayName} (${dep.id}) - installed`);
            } else {
                missing.push(dep);
                this.logger.warn(`❌ ${dep.displayName} (${dep.id}) - not installed`);
            }
        }

        const missingRequired = missing.filter(d => d.required);
        const missingOptional = missing.filter(d => !d.required);

        const result: DependencyCheckResult = {
            allRequiredInstalled: missingRequired.length === 0,
            installed,
            missing,
            missingRequired,
            missingOptional
        };

        this.logger.info(`Dependency check complete: ${installed.length} installed, ${missing.length} missing`);

        return result;
    }

    /**
     * 检查依赖并处理缺失情况
     * @returns true 如果可以继续启动，false 如果需要阻止启动
     */
    async checkAndHandleDependencies(): Promise<boolean> {
        const result = await this.checkDependencies();

        // 如果所有依赖都已安装，直接返回
        if (result.missing.length === 0) {
            this.logger.info('All dependencies are installed');
            return true;
        }

        // 处理缺失的必需依赖
        if (result.missingRequired.length > 0) {
            const shouldContinue = await this.handleMissingRequired(result.missingRequired);
            if (!shouldContinue) {
                return false;
            }
        }

        // 处理缺失的可选依赖（非阻塞）
        if (result.missingOptional.length > 0) {
            await this.handleMissingOptional(result.missingOptional);
        }

        // 重新检查必需依赖
        const recheck = await this.checkDependencies();
        return recheck.allRequiredInstalled;
    }

    /**
     * 处理缺失的必需依赖
     */
    private async handleMissingRequired(missing: ExtensionDependency[]): Promise<boolean> {
        const extensionNames = missing.map(d => d.displayName).join(', ');

        this.logger.warn(`Missing required extensions: ${extensionNames}`);

        // 显示模态对话框
        const message = missing.length === 1
            ? `SVN Commit AI Check 需要安装 "${missing[0].displayName}" 扩展才能正常工作。`
            : `SVN Commit AI Check 需要安装以下扩展才能正常工作：\n${missing.map(d => `• ${d.displayName}`).join('\n')}`;

        const choice = await vscode.window.showWarningMessage(
            message,
            {
                modal: true,
                detail: missing.map(d => `${d.displayName}: ${d.description}`).join('\n\n')
            },
            '立即安装',
            '手动安装',
            '暂不安装'
        );

        if (choice === '立即安装') {
            // 自动安装所有缺失的必需扩展
            const allInstalled = await this.installExtensions(missing);

            if (allInstalled) {
                // 提示用户重新加载窗口
                const reload = await vscode.window.showInformationMessage(
                    '✅ 依赖扩展安装完成！需要重新加载窗口以激活。',
                    '重新加载',
                    '稍后'
                );

                if (reload === '重新加载') {
                    await vscode.commands.executeCommand('workbench.action.reloadWindow');
                }

                return true;
            } else {
                vscode.window.showErrorMessage(
                    '部分扩展安装失败，请尝试手动安装。'
                );
                return false;
            }
        } else if (choice === '手动安装') {
            // 打开扩展市场搜索页面
            for (const dep of missing) {
                await vscode.commands.executeCommand(
                    'workbench.extensions.search',
                    dep.id
                );
            }

            vscode.window.showInformationMessage(
                '请在扩展面板中搜索并安装所需扩展，然后重新加载窗口。'
            );

            return false;
        } else {
            // 用户选择暂不安装
            this.logger.warn('User chose not to install required dependencies');

            vscode.window.showWarningMessage(
                'SVN Commit AI Check 将在功能受限模式下运行。某些功能可能不可用。'
            );

            return false;
        }
    }

    /**
     * 处理缺失的可选依赖
     */
    private async handleMissingOptional(missing: ExtensionDependency[]): Promise<void> {
        // 可选依赖只显示一次提示，不阻塞启动
        const extensionNames = missing.map(d => d.displayName).join(', ');

        this.logger.info(`Missing optional extensions: ${extensionNames}`);

        // 检查是否已经提示过（使用全局状态存储）
        // 这里简化处理，每次启动都可能提示
        // 实际可以使用 context.globalState 来记录是否已提示

        const choice = await vscode.window.showInformationMessage(
            `推荐安装以下扩展以获得更好的体验：${extensionNames}`,
            '安装',
            '不再提示'
        );

        if (choice === '安装') {
            await this.installExtensions(missing);
        }
        // '不再提示' 可以存储到 globalState 中
    }

    /**
     * 安装扩展
     */
    private async installExtensions(extensions: ExtensionDependency[]): Promise<boolean> {
        let allSuccess = true;

        for (const ext of extensions) {
            try {
                this.logger.info(`Installing extension: ${ext.id}`);

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `正在安装 ${ext.displayName}...`,
                    cancellable: false
                }, async () => {
                    await vscode.commands.executeCommand(
                        'workbench.extensions.installExtension',
                        ext.id
                    );
                });

                this.logger.info(`Successfully installed: ${ext.id}`);

            } catch (error) {
                this.logger.error(`Failed to install ${ext.id}:`, error);
                allSuccess = false;

                // 显示错误并提供备选方案
                const retry = await vscode.window.showErrorMessage(
                    `安装 ${ext.displayName} 失败`,
                    '重试',
                    '打开扩展市场',
                    '跳过'
                );

                if (retry === '重试') {
                    // 递归重试
                    const retryResult = await this.installExtensions([ext]);
                    if (retryResult) {
                        allSuccess = true;
                    }
                } else if (retry === '打开扩展市场') {
                    if (ext.marketplaceUrl) {
                        await vscode.env.openExternal(vscode.Uri.parse(ext.marketplaceUrl));
                    } else {
                        await vscode.commands.executeCommand(
                            'workbench.extensions.search',
                            ext.id
                        );
                    }
                }
            }
        }

        return allSuccess;
    }

    /**
     * 检查特定扩展是否已安装
     */
    isExtensionInstalled(extensionId: string): boolean {
        return vscode.extensions.getExtension(extensionId) !== undefined;
    }

    /**
     * 获取已安装扩展的版本
     */
    getExtensionVersion(extensionId: string): string | undefined {
        const extension = vscode.extensions.getExtension(extensionId);
        return extension?.packageJSON?.version;
    }

    /**
     * 检查 SVN 扩展是否已安装并激活
     */
    async isSvnExtensionReady(): Promise<boolean> {
        const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm');

        if (!svnExtension) {
            return false;
        }

        // 如果扩展未激活，尝试激活它
        if (!svnExtension.isActive) {
            try {
                await svnExtension.activate();
            } catch (error) {
                this.logger.error('Failed to activate SVN extension:', error);
                return false;
            }
        }

        return true;
    }

    /**
     * 获取依赖状态摘要
     */
    async getDependencyStatusSummary(): Promise<string> {
        const result = await this.checkDependencies();

        let summary = '=== 扩展依赖状态 ===\n';

        for (const dep of DependencyChecker.DEPENDENCIES) {
            const installed = result.installed.find(d => d.id === dep.id);
            const status = installed ? '✅ 已安装' : '❌ 未安装';
            const required = dep.required ? '(必需)' : '(可选)';
            const version = installed ? ` v${this.getExtensionVersion(dep.id) || 'unknown'}` : '';

            summary += `${status} ${dep.displayName}${version} ${required}\n`;
        }

        summary += `\n总计: ${result.installed.length}/${DependencyChecker.DEPENDENCIES.length} 已安装`;

        return summary;
    }
}
