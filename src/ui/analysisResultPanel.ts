import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * AI 分析结果面板
 * 使用 WebView 展示美观的 Markdown 渲染结果
 */
export class AnalysisResultPanel {
    public static currentPanel: AnalysisResultPanel | undefined;
    private static readonly viewType = 'svnAIAnalysisResult';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private logger: Logger
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        // 监听面板关闭
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // 处理来自 WebView 的消息
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    /**
     * 创建或显示分析结果面板
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        logger: Logger
    ): AnalysisResultPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已有面板，显示它
        if (AnalysisResultPanel.currentPanel) {
            AnalysisResultPanel.currentPanel.panel.reveal(column);
            return AnalysisResultPanel.currentPanel;
        }

        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(
            AnalysisResultPanel.viewType,
            '🔍 AI Code Review',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        AnalysisResultPanel.currentPanel = new AnalysisResultPanel(panel, extensionUri, logger);
        return AnalysisResultPanel.currentPanel;
    }

    /**
     * 显示加载状态
     */
    public showLoading(message: string = '正在分析代码...'): void {
        this.panel.webview.html = this.getLoadingHtml(message);
    }

    /**
     * 显示分析结果
     */
    public showResult(
        markdownContent: string,
        metadata: {
            provider: string;
            timestamp: Date;
            fileCount: number;
            duration?: number;
        }
    ): void {
        this.panel.webview.html = this.getResultHtml(markdownContent, metadata);
    }

    /**
     * 显示错误
     */
    public showError(error: string, details?: string): void {
        this.panel.webview.html = this.getErrorHtml(error, details);
    }

    /**
     * 处理来自 WebView 的消息
     */
    private handleMessage(message: { command: string; data?: unknown }): void {
        switch (message.command) {
            case 'copy':
                vscode.env.clipboard.writeText(message.data as string);
                vscode.window.showInformationMessage('已复制到剪贴板');
                break;
            case 'export':
                this.exportReport(message.data as string);
                break;
            case 'close':
                this.panel.dispose();
                break;
            case 'retry':
                vscode.commands.executeCommand('svn-commit-ai-check.analyzeChanges');
                break;
        }
    }

    /**
     * 导出报告到文件
     */
    private async exportReport(content: string): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('ai-code-review-report.md'),
            filters: {
                'Markdown': ['md'],
                'All Files': ['*']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
            vscode.window.showInformationMessage(`报告已保存到: ${uri.fsPath}`);
        }
    }

    /**
     * 获取加载页面 HTML
     */
    private getLoadingHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Review</title>
    <style>
        ${this.getBaseStyles()}
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--vscode-editor-foreground);
            border-top-color: var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .loading-text {
            margin-top: 20px;
            font-size: 16px;
            color: var(--vscode-foreground);
        }
        .loading-subtext {
            margin-top: 10px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">${this.escapeHtml(message)}</div>
        <div class="loading-subtext">使用 AI 进行代码审查，请稍候...</div>
    </div>
</body>
</html>`;
    }

    /**
     * 获取结果页面 HTML
     */
    private getResultHtml(
        markdownContent: string,
        metadata: {
            provider: string;
            timestamp: Date;
            fileCount: number;
            duration?: number;
        }
    ): string {
        const formattedTime = metadata.timestamp.toLocaleString('zh-CN');
        const durationText = metadata.duration
            ? `${(metadata.duration / 1000).toFixed(1)}s`
            : '';

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Review Report</title>
    <style>
        ${this.getBaseStyles()}
        ${this.getMarkdownStyles()}

        .header {
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            padding: 12px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .header-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .header-actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .content {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        .provider-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 10px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <span class="header-title">🔍 AI Code Review</span>
            <span class="provider-badge">
                <span>✨</span>
                <span>${this.escapeHtml(metadata.provider)}</span>
            </span>
            <span class="header-meta">
                ${metadata.fileCount} 个文件 | ${formattedTime}${durationText ? ` | ${durationText}` : ''}
            </span>
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="copyReport()">
                📋 复制
            </button>
            <button class="btn btn-secondary" onclick="exportReport()">
                💾 导出
            </button>
            <button class="btn btn-primary" onclick="closePanel()">
                ✓ 完成
            </button>
        </div>
    </div>
    <div class="content markdown-body" id="report-content">
        ${this.renderMarkdown(markdownContent)}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const rawContent = ${JSON.stringify(markdownContent)};

        function copyReport() {
            vscode.postMessage({ command: 'copy', data: rawContent });
        }

        function exportReport() {
            vscode.postMessage({ command: 'export', data: rawContent });
        }

        function closePanel() {
            vscode.postMessage({ command: 'close' });
        }
    </script>
</body>
</html>`;
    }

    /**
     * 获取错误页面 HTML
     */
    private getErrorHtml(error: string, details?: string): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Review - Error</title>
    <style>
        ${this.getBaseStyles()}
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            padding: 20px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .error-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-errorForeground);
            margin-bottom: 10px;
        }
        .error-message {
            font-size: 14px;
            color: var(--vscode-foreground);
            margin-bottom: 20px;
            max-width: 400px;
        }
        .error-details {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-textBlockQuote-background);
            padding: 10px;
            border-radius: 4px;
            max-width: 500px;
            white-space: pre-wrap;
            margin-bottom: 20px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 4px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">❌</div>
        <div class="error-title">分析失败</div>
        <div class="error-message">${this.escapeHtml(error)}</div>
        ${details ? `<div class="error-details">${this.escapeHtml(details)}</div>` : ''}
        <div>
            <button class="btn btn-primary" onclick="retry()">🔄 重试</button>
            <button class="btn btn-secondary" onclick="close()">关闭</button>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function retry() { vscode.postMessage({ command: 'retry' }); }
        function close() { vscode.postMessage({ command: 'close' }); }
    </script>
</body>
</html>`;
    }

    /**
     * 基础样式
     */
    private getBaseStyles(): string {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }
        `;
    }

    /**
     * Markdown 样式
     */
    private getMarkdownStyles(): string {
        return `
        .markdown-body {
            color: var(--vscode-foreground);
        }
        .markdown-body h1 {
            font-size: 1.8em;
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 0.3em;
            margin-bottom: 0.8em;
        }
        .markdown-body h2 {
            font-size: 1.4em;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 0.3em;
            margin-top: 1.5em;
            margin-bottom: 0.6em;
        }
        .markdown-body h3 {
            font-size: 1.2em;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
        }
        .markdown-body p {
            margin-bottom: 0.8em;
        }
        .markdown-body ul, .markdown-body ol {
            padding-left: 2em;
            margin-bottom: 0.8em;
        }
        .markdown-body li {
            margin-bottom: 0.3em;
        }
        .markdown-body code {
            background: var(--vscode-textCodeBlock-background);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        .markdown-body pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin-bottom: 1em;
        }
        .markdown-body pre code {
            background: none;
            padding: 0;
        }
        .markdown-body blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding-left: 16px;
            margin-left: 0;
            color: var(--vscode-textBlockQuote-foreground);
            background: var(--vscode-textBlockQuote-background);
            padding: 10px 16px;
            margin-bottom: 1em;
        }
        .markdown-body hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 1.5em 0;
        }
        .markdown-body table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
        }
        .markdown-body th, .markdown-body td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }
        .markdown-body th {
            background: var(--vscode-editorWidget-background);
        }
        .markdown-body strong {
            color: var(--vscode-foreground);
            font-weight: 600;
        }
        .markdown-body a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .markdown-body a:hover {
            text-decoration: underline;
        }
        /* Issue severity badges */
        .markdown-body .p0, .markdown-body .critical {
            color: #f85149;
        }
        .markdown-body .p1, .markdown-body .high {
            color: #d29922;
        }
        .markdown-body .p2, .markdown-body .low {
            color: #58a6ff;
        }
        /* Diff styles */
        .markdown-body .diff-add {
            background: rgba(46, 160, 67, 0.15);
            color: #3fb950;
        }
        .markdown-body .diff-remove {
            background: rgba(248, 81, 73, 0.15);
            color: #f85149;
        }
        `;
    }

    /**
     * 简单的 Markdown 到 HTML 转换
     */
    private renderMarkdown(markdown: string): string {
        let html = this.escapeHtml(markdown);

        // 代码块
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            const langClass = lang ? `language-${lang}` : '';
            return `<pre><code class="${langClass}">${code.trim()}</code></pre>`;
        });

        // 内联代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 标题
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // 粗体
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 斜体
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 列表
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // 有序列表
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // 引用
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // 分隔线
        html = html.replace(/^---$/gm, '<hr>');

        // 段落
        html = html.replace(/\n\n/g, '</p><p>');
        html = `<p>${html}</p>`;

        // 清理空段落
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>\s*(<h[123]>)/g, '$1');
        html = html.replace(/(<\/h[123]>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<hr>)/g, '$1');
        html = html.replace(/(<hr>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');

        return html;
    }

    /**
     * HTML 转义
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        AnalysisResultPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
