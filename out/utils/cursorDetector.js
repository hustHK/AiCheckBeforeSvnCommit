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
exports.CursorDetector = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Cursor 环境检测工具
 */
class CursorDetector {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * 检测是否在 Cursor 编辑器中运行
     */
    isCursorEditor() {
        const appName = vscode.env.appName.toLowerCase();
        const isCursor = appName.includes('cursor');
        this.logger.info(`Editor detected: ${vscode.env.appName}, isCursor: ${isCursor}`);
        return isCursor;
    }
    /**
     * 获取所有可用的命令
     */
    async getAllCommands() {
        try {
            const allCommands = await vscode.commands.getCommands(true);
            return allCommands;
        }
        catch (error) {
            this.logger.error('Failed to get commands:', error);
            return [];
        }
    }
    /**
     * 查找 Cursor 相关的命令
     */
    async getCursorCommands() {
        const allCommands = await this.getAllCommands();
        const cursorCommands = allCommands.filter(cmd => cmd.toLowerCase().includes('cursor') ||
            cmd.toLowerCase().includes('aichat') ||
            cmd.toLowerCase().includes('ai.chat') ||
            cmd.toLowerCase().includes('chat.open'));
        this.logger.info(`Found ${cursorCommands.length} Cursor-related commands`);
        if (cursorCommands.length > 0) {
            this.logger.debug('Cursor commands:', cursorCommands.slice(0, 10));
        }
        return cursorCommands;
    }
    /**
     * 检测 Cursor Chat 功能是否可用
     */
    async isCursorChatAvailable() {
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
    async getEnvironmentSummary() {
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
exports.CursorDetector = CursorDetector;
//# sourceMappingURL=cursorDetector.js.map