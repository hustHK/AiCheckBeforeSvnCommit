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
exports.DiffAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class DiffAnalyzer {
    constructor(configManager, logger) {
        this.configManager = configManager;
        this.logger = logger;
    }
    /**
     * 获取 SVN 工作目录的根路径
     */
    getWorkspaceRoot() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }
        return workspaceFolders[0].uri.fsPath;
    }
    /**
     * 检查是否在 SVN 工作目录中
     */
    async isSvnRepository() {
        try {
            const workspaceRoot = this.getWorkspaceRoot();
            (0, child_process_1.execSync)('svn info', {
                cwd: workspaceRoot,
                encoding: 'utf-8',
                stdio: 'pipe'
            });
            return true;
        }
        catch (error) {
            this.logger.warn('Not an SVN repository');
            return false;
        }
    }
    /**
     * 获取所有待提交的变更
     */
    async getChanges() {
        const workspaceRoot = this.getWorkspaceRoot();
        this.logger.info(`Getting SVN changes in ${workspaceRoot}`);
        // 检查是否是 SVN 仓库
        if (!(await this.isSvnRepository())) {
            throw new Error('Current workspace is not an SVN repository');
        }
        try {
            // 获取 SVN 状态
            const statusOutput = (0, child_process_1.execSync)('svn status', {
                cwd: workspaceRoot,
                encoding: 'utf-8'
            });
            // 解析状态输出
            const changes = [];
            const lines = statusOutput.split('\n').filter(line => line.trim());
            for (const line of lines) {
                // SVN status 格式: 第一列是状态字符，后面是文件路径
                // 例如: M       src/file.cpp
                //      A       src/newfile.go
                //      D       src/oldfile.h
                const match = line.match(/^([AMDRC\?!~])\s+(.+)$/);
                if (!match) {
                    continue;
                }
                const [, statusChar, filePath] = match;
                // 忽略未跟踪的文件 (?)
                if (statusChar === '?') {
                    continue;
                }
                const fullPath = path.join(workspaceRoot, filePath);
                // 检查文件类型
                const language = this.getLanguageFromPath(filePath);
                if (!this.shouldAnalyzeFile(filePath, language)) {
                    this.logger.debug(`Skipping file: ${filePath} (language: ${language})`);
                    continue;
                }
                const change = {
                    path: filePath,
                    status: this.parseStatus(statusChar),
                    diffContent: '',
                    language
                };
                // 获取 diff（对于非删除的文件）
                if (change.status !== 'deleted') {
                    try {
                        // 检查文件大小
                        const fileUri = vscode.Uri.file(fullPath);
                        const stats = await vscode.workspace.fs.stat(fileUri);
                        if (stats.size > this.configManager.getMaxFileSize()) {
                            this.logger.warn(`File too large, skipping: ${filePath} (${stats.size} bytes)`);
                            continue;
                        }
                        // 获取 diff
                        change.diffContent = (0, child_process_1.execSync)(`svn diff "${filePath}"`, {
                            cwd: workspaceRoot,
                            encoding: 'utf-8'
                        });
                        // 获取完整文件内容（作为上下文）
                        const fileContent = await vscode.workspace.fs.readFile(fileUri);
                        change.fullContent = Buffer.from(fileContent).toString('utf-8');
                    }
                    catch (error) {
                        this.logger.warn(`Failed to get diff for ${filePath}:`, error);
                        // 继续处理其他文件
                    }
                }
                changes.push(change);
            }
            this.logger.info(`Found ${changes.length} file(s) to analyze`);
            return changes;
        }
        catch (error) {
            this.logger.error('Failed to get SVN changes:', error);
            throw new Error('Failed to get SVN changes. Make sure you are in an SVN working directory.');
        }
    }
    /**
     * 解析 SVN 状态字符
     */
    parseStatus(statusChar) {
        switch (statusChar) {
            case 'A':
                return 'added';
            case 'M':
            case 'R': // Replaced
                return 'modified';
            case 'D':
                return 'deleted';
            case 'C': // Conflicted - 视为修改
                return 'modified';
            default:
                return 'modified';
        }
    }
    /**
     * 根据文件路径判断编程语言
     */
    getLanguageFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        const languageMap = {
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'c': 'c',
            'h': 'c',
            'hpp': 'cpp',
            'hxx': 'cpp',
            'hh': 'cpp',
            'go': 'go',
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'java': 'java',
            'rs': 'rust'
        };
        return languageMap[ext] || ext;
    }
    /**
     * 判断是否应该分析该文件
     */
    shouldAnalyzeFile(filePath, language) {
        const supportedLanguages = this.configManager.getSupportedLanguages();
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        // 检查扩展名或语言是否在支持列表中
        return supportedLanguages.includes(ext) || supportedLanguages.includes(language);
    }
    /**
     * 获取变更摘要
     */
    getChangesSummary(changes) {
        const summary = {
            added: 0,
            modified: 0,
            deleted: 0,
            total: changes.length
        };
        changes.forEach(change => {
            switch (change.status) {
                case 'added':
                    summary.added++;
                    break;
                case 'modified':
                    summary.modified++;
                    break;
                case 'deleted':
                    summary.deleted++;
                    break;
            }
        });
        return `Total: ${summary.total} files (Added: ${summary.added}, Modified: ${summary.modified}, Deleted: ${summary.deleted})`;
    }
}
exports.DiffAnalyzer = DiffAnalyzer;
//# sourceMappingURL=diffAnalyzer.js.map