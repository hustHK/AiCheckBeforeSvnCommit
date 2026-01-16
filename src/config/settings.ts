import * as vscode from 'vscode';

export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
    }

    isEnabled(): boolean {
        return this.config.get<boolean>('enabled', true);
    }

    isInterceptEnabled(): boolean {
        return this.config.get<boolean>('interceptCommit', true);
    }

    isAutoCheck(): boolean {
        return this.config.get<boolean>('autoCheck', false);
    }

    getAIProvider(): string {
        return this.config.get<string>('aiProvider', 'auto');
    }

    async setAIProvider(provider: string): Promise<void> {
        await this.config.update('aiProvider', provider, vscode.ConfigurationTarget.Global);
    }

    getDeepSeekApiKey(): string {
        return this.config.get<string>('deepseek.apiKey', '');
    }

    getClaudeApiKey(): string {
        return this.config.get<string>('claude.apiKey', '');
    }

    getOpenAIApiKey(): string {
        return this.config.get<string>('openai.apiKey', '');
    }

    getSupportedLanguages(): string[] {
        return this.config.get<string[]>('analysis.languages', ['cpp', 'c', 'go', 'h', 'hpp', 'cc', 'cxx']);
    }

    getMaxFileSize(): number {
        return this.config.get<number>('analysis.maxFileSize', 102400); // 100KB
    }

    getSystemPrompt(): string | undefined {
        const customPrompt = this.config.get<string>('prompt.system', '');
        return customPrompt || undefined;
    }

    // 监听配置变化
    onConfigurationChanged(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('svn-commit-ai-check')) {
                this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
                callback();
            }
        });
    }
}
