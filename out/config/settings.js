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
exports.ConfigurationManager = void 0;
const vscode = __importStar(require("vscode"));
class ConfigurationManager {
    constructor() {
        this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
    }
    isEnabled() {
        return this.config.get('enabled', true);
    }
    isInterceptEnabled() {
        return this.config.get('interceptCommit', true);
    }
    isAutoCheck() {
        return this.config.get('autoCheck', false);
    }
    getAIProvider() {
        return this.config.get('aiProvider', 'auto');
    }
    async setAIProvider(provider) {
        await this.config.update('aiProvider', provider, vscode.ConfigurationTarget.Global);
    }
    getDeepSeekApiKey() {
        return this.config.get('deepseek.apiKey', '');
    }
    getClaudeApiKey() {
        return this.config.get('claude.apiKey', '');
    }
    getOpenAIApiKey() {
        return this.config.get('openai.apiKey', '');
    }
    getSupportedLanguages() {
        return this.config.get('analysis.languages', ['cpp', 'c', 'go', 'h', 'hpp', 'cc', 'cxx']);
    }
    getMaxFileSize() {
        return this.config.get('analysis.maxFileSize', 102400); // 100KB
    }
    getSystemPrompt() {
        const customPrompt = this.config.get('prompt.system', '');
        return customPrompt || undefined;
    }
    // 监听配置变化
    onConfigurationChanged(callback) {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('svn-commit-ai-check')) {
                this.config = vscode.workspace.getConfiguration('svn-commit-ai-check');
                callback();
            }
        });
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=settings.js.map