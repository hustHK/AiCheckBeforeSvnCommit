"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * DeepSeek API 适配器
 * DeepSeek 提供高性价比的代码分析能力，特别适合 C++ 和 Go
 */
class DeepSeekAdapter {
    constructor(apiKey, logger, baseUrl, model) {
        this.logger = logger;
        this.baseUrl = 'https://api.deepseek.com/v1';
        this.model = 'deepseek-coder';
        this.cancelTokenSource = null;
        this.apiKey = apiKey;
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
        if (model) {
            this.model = model;
        }
    }
    /**
     * 分析代码
     */
    async analyze(prompt, token) {
        this.logger.info(`Calling DeepSeek API with model: ${this.model}`);
        if (!this.apiKey) {
            throw new Error('DeepSeek API key is not configured');
        }
        // 创建取消令牌
        this.cancelTokenSource = axios_1.default.CancelToken.source();
        // 监听 VSCode 的取消事件
        token.onCancellationRequested(() => {
            this.logger.info('Analysis cancelled by user');
            this.cancelTokenSource?.cancel('Analysis cancelled by user');
        });
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/chat/completions`, {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 4096,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000, // 60 秒超时
                cancelToken: this.cancelTokenSource.token
            });
            const content = response.data.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from DeepSeek API');
            }
            this.logger.info(`DeepSeek analysis completed, response length: ${content.length}`);
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
                    throw new Error('Invalid DeepSeek API key. Please check your configuration.');
                }
                else if (statusCode === 429) {
                    throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
                }
                else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
                    throw new Error('DeepSeek API server error. Please try again later.');
                }
                else {
                    throw new Error(`DeepSeek API error: ${errorMessage}`);
                }
            }
            this.logger.error('DeepSeek API call failed:', error);
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
            provider: 'deepseek',
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
exports.DeepSeekAdapter = DeepSeekAdapter;
//# sourceMappingURL=deepseekAdapter.js.map