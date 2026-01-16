import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Cursor 环境检测工具
 */
export class CursorDetector {
    constructor(private logger: Logger) {}

    /**
     * 检测是否在 Cursor 编辑器中运行
     */
    isCursorEditor(): boolean {
        const appName = vscode.env.appName.toLowerCase();
        const isCursor = appName.includes('cursor');
        
        this.logger.info(`Editor detected: ${vscode.env.appName}, isCursor: ${isCursor}`);
        return isCursor;
    }

    /**
     * 获取所有可用的命令
     */
    async getAllCommands(): Promise<string[]> {
        try {
            const allCommands = await vscode.commands.getCommands(true);
            return allCommands;
        } catch (error) {
            this.logger.error('Failed to get commands:', error);
            return [];
        }
    }

    /**
     * 查找 Cursor 相关的命令
     */
    async getCursorCommands(): Promise<string[]> {
        const allCommands = await this.getAllCommands();
        const cursorCommands = allCommands.filter(cmd => 
            cmd.toLowerCase().includes('cursor') ||
            cmd.toLowerCase().includes('aichat') ||
            cmd.toLowerCase().includes('ai.chat') ||
            cmd.toLowerCase().includes('chat.open')
        );
        
        this.logger.info(`Found ${cursorCommands.length} Cursor-related commands`);
        if (cursorCommands.length > 0) {
            this.logger.debug('Cursor commands:', cursorCommands.slice(0, 10));
        }
        
        return cursorCommands;
    }

    /**
     * 检测 Cursor Chat 功能是否可用
     */
    async isCursorChatAvailable(): Promise<{
        available: boolean;
        commandId?: string;
        method: 'direct' | 'fallback' | 'none';
    }> {
        if (!this.isCursorEditor()) {
            return { available: false, method: 'none' };
        }

        const cursorCommands = await this.getCursorCommands();
        
        // 尝试查找可能的 Chat 命令
        const possibleChatCommands = [
            'cursor.chat.open',
            'cursor.chat.sendMessage',
            'aichat.open',
            'workbench.action.chat.open',
            'workbench.panel.chat.view.copilot.focus'
        ];

        for (const cmdId of possibleChatCommands) {
            if (cursorCommands.includes(cmdId)) {
                this.logger.info(`Found Cursor Chat command: ${cmdId}`);
                return {
                    available: true,
                    commandId: cmdId,
                    method: 'direct'
                };
            }
        }

        // 如果没有找到直接命令，使用 fallback 方法（复制到剪贴板）
        this.logger.info('No direct Cursor Chat command found, using fallback method');
        return {
            available: true,
            method: 'fallback'
        };
    }

    /**
     * 获取环境信息摘要
     */
    async getEnvironmentSummary(): Promise<string> {
        const isCursor = this.isCursorEditor();
        const chatInfo = await this.isCursorChatAvailable();
        
        let summary = `Environment: ${vscode.env.appName}\n`;
        summary += `Is Cursor: ${isCursor}\n`;
        summary += `Chat Available: ${chatInfo.available}\n`;
        summary += `Integration Method: ${chatInfo.method}\n`;
        
        if (chatInfo.commandId) {
            summary += `Chat Command: ${chatInfo.commandId}\n`;
        }
        
        return summary;
    }
}
