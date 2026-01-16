"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Anthropic Claude API 适配器
 * Claude 擅长代码理解和安全分析
 */
class ClaudeAdapter {
    constructor(apiKey, logger, model) {
        this.logger = logger;
        this.baseUrl = 'https://api.anthropic.com/v1';
        this.model = 'claude-3-5-sonnet-20241022';
        this.cancelTokenSource = null;
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        }
    }
    /**
     * 分析代码
     */
    async analyze(prompt, token) {
        this.logger.info(`Calling Claude API with model: ${this.model}`);
        if (!this.apiKey) {
            throw new Error('Claude API key is not configured');
        }
        this.cancelTokenSource = axios_1.default.CancelToken.source();
        token.onCancellationRequested(() => {
            this.logger.info('Analysis cancelled by user');
            this.cancelTokenSource?.cancel('Analysis cancelled by user');
        });
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/messages`, {
                model: this.model,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: 60000,
                cancelToken: this.cancelTokenSource.token
            });
            const content = response.data.content[0]?.text;
            if (!content) {
                throw new Error('Empty response from Claude API');
            }
            this.logger.info(`Claude analysis completed, response length: ${content.length}`);
            return content;
        }
        catch (error) {
            if (axios_1.default.isCancel(error)) {
                throw new Error('Analysis cancelled by user');
            }
            if (axios_1.default.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                if (statusCode === 401) {
                    throw new Error('Invalid Claude API key. Please check your configuration.');
                }
                else if (statusCode === 429) {
                    throw new Error('Claude API rate limit exceeded. Please try again later.');
                }
                else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
                    throw new Error('Claude API server error. Please try again later.');
                }
                else {
                    throw new Error(`Claude API error: ${errorMessage}`);
                }
            }
            this.logger.error('Claude API call failed:', error);
            throw error;
        }
        finally {
            this.cancelTokenSource = null;
        }
    }
    /**
     * 获取适配器信息
     */
    getInfo() {
        return {
            provider: 'claude',
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
exports.ClaudeAdapter = ClaudeAdapter;
//# sourceMappingURL=claudeAdapter.js.map