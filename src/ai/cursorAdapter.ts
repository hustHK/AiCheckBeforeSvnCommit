import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface AIAdapter {
    analyze(prompt: string, token: vscode.CancellationToken): Promise<string>;
}

/**
 * Cursor AI 适配器
 *
 * 尝试多种方式与 Cursor AI 交互：
 * 1. 通过 Composer API（如果可用）
 * 2. 通过 Chat 命令和自动化
 * 3. 通过语言模型 API（VSCode 1.90+）
 * 4. Fallback 到手动方式
 */
export class CursorAIAdapter implements AIAdapter {
    constructor(
        private logger: Logger,
        private chatCommandId?: string
    ) {}

    /**
     * 分析代码
     */
    async analyze(prompt: string, token: vscode.CancellationToken): Promise<string> {
        this.logger.info('Using Cursor AI adapter...');

        // 方法 1: 尝试使用 VSCode Language Model API (1.90+)
        try {
            const result = await this.tryLanguageModelAPI(prompt, token);
            if (result) {
                this.logger.info('Analysis completed via Language Model API');
                return result;
            }
        } catch (error) {
            this.logger.warn('Language Model API not available:', error);
        }

        // 方法 2: 尝试 Cursor Composer/Agent 命令
        try {
            const result = await this.tryCursorComposer(prompt, token);
            if (result) {
                this.logger.info('Analysis completed via Cursor Composer');
                return result;
            }
        } catch (error) {
            this.logger.warn('Cursor Composer not available:', error);
        }

        // 方法 3: 尝试通过 Cursor Chat 命令发送
        try {
            const result = await this.tryCursorChatCommand(prompt, token);
            if (result) {
                this.logger.info('Analysis completed via Cursor Chat command');
                return result;
            }
        } catch (error) {
            this.logger.warn('Cursor Chat command failed:', error);
        }

        // 方法 4: Fallback - 使用编辑器内联方式
        return await this.inlineAssistMode(prompt, token);
    }

    /**
     * 尝试使用 VSCode Language Model API
     * 这是 VSCode 1.90+ 提供的标准 AI 接口
     */
    private async tryLanguageModelAPI(
        prompt: string,
        token: vscode.CancellationToken
    ): Promise<string | null> {
        // 检查 API 是否可用
        if (!vscode.lm) {
            this.logger.info('Language Model API (vscode.lm) not available');
            return null;
        }

        try {
            // 获取可用的模型
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4'
            });

            if (!models || models.length === 0) {
                // 尝试获取任何可用的模型
                const allModels = await vscode.lm.selectChatModels();
                if (!allModels || allModels.length === 0) {
                    this.logger.info('No language models available');
                    return null;
                }
                models.push(allModels[0]);
            }

            const model = models[0];
            this.logger.info(`Using language model: ${model.name || model.id}`);

            // 创建消息
            const messages = [
                vscode.LanguageModelChatMessage.User(prompt)
            ];

            // 发送请求
            const response = await model.sendRequest(messages, {}, token);

            // 收集响应
            let result = '';
            for await (const chunk of response.text) {
                if (token.isCancellationRequested) {
                    throw new Error('Analysis cancelled');
                }
                result += chunk;
            }

            return result;

        } catch (error) {
            this.logger.error('Language Model API error:', error);
            return null;
        }
    }

    /**
     * 尝试使用 Cursor Composer
     */
    private async tryCursorComposer(
        prompt: string,
        token: vscode.CancellationToken
    ): Promise<string | null> {
        // 检查 Composer 命令是否可用
        const commands = await vscode.commands.getCommands(true);

        const composerCommands = [
            'cursor.composer.send',
            'cursor.composer.sendMessage',
            'cursor.agent.send',
            'aipopup.action.modal.generate',
            'cursor.action.generateCode'
        ];

        for (const cmd of composerCommands) {
            if (commands.includes(cmd)) {
                this.logger.info(`Found Composer command: ${cmd}`);

                try {
                    // 尝试执行命令并获取结果
                    const result = await vscode.commands.executeCommand<string>(cmd, prompt);
                    if (result && typeof result === 'string') {
                        return result;
                    }
                } catch (e) {
                    this.logger.debug(`Command ${cmd} failed:`, e);
                }
            }
        }

        return null;
    }

    /**
     * 尝试使用 Cursor Chat 命令
     */
    private async tryCursorChatCommand(
        prompt: string,
        token: vscode.CancellationToken
    ): Promise<string | null> {
        if (!this.chatCommandId) {
            return null;
        }

        try {
            // 尝试执行 Chat 命令并传递 prompt
            const result = await vscode.commands.executeCommand<string>(
                this.chatCommandId,
                { message: prompt, silent: true }
            );

            if (result && typeof result === 'string') {
                return result;
            }
        } catch (error) {
            this.logger.debug('Chat command execution failed:', error);
        }

        return null;
    }

    /**
     * 内联辅助模式 - 在编辑器中进行 AI 分析
     * 这种方式用户体验更好，不需要来回复制
     */
    private async inlineAssistMode(
        prompt: string,
        token: vscode.CancellationToken
    ): Promise<string> {
        this.logger.info('Using inline assist mode...');

        // 创建临时文件来存放 prompt 和接收结果
        const tempDoc = await vscode.workspace.openTextDocument({
            content: this.formatPromptForInline(prompt),
            language: 'markdown'
        });

        // 显示文档
        const editor = await vscode.window.showTextDocument(tempDoc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true
        });

        // 选中全部内容
        const fullRange = new vscode.Range(
            tempDoc.positionAt(0),
            tempDoc.positionAt(tempDoc.getText().length)
        );
        editor.selection = new vscode.Selection(fullRange.start, fullRange.end);

        // 提示用户操作
        const choice = await vscode.window.showInformationMessage(
            '🤖 请使用 Cursor AI 分析代码',
            {
                modal: true,
                detail: '操作步骤：\n\n' +
                    '1. 按 Ctrl+K (Windows/Linux) 或 Cmd+K (Mac) 打开 Cursor 内联编辑\n' +
                    '2. AI 会自动看到选中的代码审查请求\n' +
                    '3. 输入 "请分析这段代码" 或直接按 Enter\n' +
                    '4. 等待 AI 生成分析报告\n' +
                    '5. 点击 "接受" 或按 Ctrl/Cmd+Enter 应用结果\n' +
                    '6. 分析完成后点击下面的 "已完成分析"\n\n' +
                    '提示：Cursor 会自动理解这是代码审查请求'
            },
            '✅ 已完成分析',
            '📋 复制到 Chat',
            '❌ 取消'
        );

        if (token.isCancellationRequested) {
            throw new Error('Analysis cancelled');
        }

        if (choice === '📋 复制到 Chat') {
            // 复制 prompt 到剪贴板，让用户在 Chat 中粘贴
            await vscode.env.clipboard.writeText(prompt);

            // 尝试打开 Chat
            try {
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            } catch {
                try {
                    await vscode.commands.executeCommand('aichat.open');
                } catch {
                    // ignore
                }
            }

            return await this.waitForManualResponse(prompt, token);
        } else if (choice === '✅ 已完成分析') {
            // 获取编辑器中的内容作为结果
            const result = editor.document.getText();

            // 关闭临时文档
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

            // 检查是否有实际的分析结果
            if (result && result !== this.formatPromptForInline(prompt)) {
                return this.extractAnalysisResult(result);
            } else {
                // 如果内容没变化，可能用户把结果复制到了剪贴板
                const clipboardContent = await vscode.env.clipboard.readText();
                if (clipboardContent && clipboardContent.length > 100) {
                    return clipboardContent;
                }

                throw new Error('未检测到分析结果');
            }
        } else {
            // 关闭临时文档
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            throw new Error('User cancelled analysis');
        }
    }

    /**
     * 等待用户在 Chat 中完成分析并复制结果
     */
    private async waitForManualResponse(
        originalPrompt: string,
        token: vscode.CancellationToken
    ): Promise<string> {
        const result = await vscode.window.showInformationMessage(
            '📋 Prompt 已复制到剪贴板',
            {
                modal: true,
                detail: '请在 Cursor Chat 中：\n\n' +
                    '1. 粘贴 Prompt (Ctrl/Cmd + V)\n' +
                    '2. 发送给 AI 进行分析\n' +
                    '3. 等待 AI 回复完成\n' +
                    '4. 复制 AI 的完整回复到剪贴板\n' +
                    '5. 点击 "已完成分析"'
            },
            '✅ 已完成分析',
            '🔄 重新复制',
            '❌ 取消'
        );

        if (token.isCancellationRequested) {
            throw new Error('Analysis cancelled');
        }

        if (result === '🔄 重新复制') {
            await vscode.env.clipboard.writeText(originalPrompt);
            vscode.window.showInformationMessage('Prompt 已重新复制');
            return this.waitForManualResponse(originalPrompt, token);
        } else if (result === '✅ 已完成分析') {
            const response = await vscode.env.clipboard.readText();

            if (!response || response === originalPrompt || response.length < 50) {
                const retry = await vscode.window.showWarningMessage(
                    '⚠️ 剪贴板内容似乎不是有效的 AI 分析结果',
                    '重试',
                    '强制使用',
                    '取消'
                );

                if (retry === '重试') {
                    return this.waitForManualResponse(originalPrompt, token);
                } else if (retry === '强制使用') {
                    return response || '';
                } else {
                    throw new Error('Invalid AI response');
                }
            }

            return response;
        } else {
            throw new Error('User cancelled analysis');
        }
    }

    /**
     * 格式化 prompt 用于内联模式
     */
    private formatPromptForInline(prompt: string): string {
        return `# 🤖 AI Code Review Request

请帮我审查以下代码变更，按照 P0/P1/P2 严重级别报告问题。

---

${prompt}

---

**请在上方生成分析报告**
`;
    }

    /**
     * 从编辑器内容中提取分析结果
     */
    private extractAnalysisResult(content: string): string {
        // 尝试提取实际的分析内容（去掉原始请求部分）
        const markers = [
            '# SVN Commit AI Check 报告',
            '## 📊 执行摘要',
            '## Analysis Summary',
            '## 🔴 P0',
            '## 🟡 P1',
            '## 🔵 P2'
        ];

        for (const marker of markers) {
            const index = content.indexOf(marker);
            if (index !== -1) {
                return content.substring(index);
            }
        }

        // 如果找不到特定标记，返回全部内容
        return content;
    }
}
