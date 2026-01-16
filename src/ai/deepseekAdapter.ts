import * as vscode from 'vscode';
import axios, { CancelTokenSource } from 'axios';
import { Logger } from '../utils/logger';
import { AIAdapter } from './cursorAdapter';

/**
 * DeepSeek API 适配器
 * DeepSeek 提供高性价比的代码分析能力，特别适合 C++ 和 Go
 */
export class DeepSeekAdapter implements AIAdapter {
    private apiKey: string;
    private baseUrl: string = 'https://api.deepseek.com/v1';
    private model: string = 'deepseek-coder';
    private cancelTokenSource: CancelTokenSource | null = null;

    constructor(
        apiKey: string,
        private logger: Logger,
        baseUrl?: string,
        model?: string
    ) {
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
    async analyze(prompt: string, token: vscode.CancellationToken): Promise<string> {
        this.logger.info(`Calling DeepSeek API with model: ${this.model}`);

        if (!this.apiKey) {
            throw new Error('DeepSeek API key is not configured');
        }

        // 创建取消令牌
        this.cancelTokenSource = axios.CancelToken.source();

        // 监听 VSCode 的取消事件
        token.onCancellationRequested(() => {
            this.logger.info('Analysis cancelled by user');
            this.cancelTokenSource?.cancel('Analysis cancelled by user');
        });

        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
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
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000, // 60 秒超时
                    cancelToken: this.cancelTokenSource.token
                }
            );

            const content = response.data.choices[0]?.message?.content;
            
            if (!content) {
                throw new Error('Empty response from DeepSeek API');
            }

            this.logger.info(`DeepSeek analysis completed, response length: ${content.length}`);
            return content;

        } catch (error) {
            if (axios.isCancel(error)) {
                throw new Error('Analysis cancelled by user');
            }

            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;

                if (statusCode === 401) {
                    throw new Error('Invalid DeepSeek API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
                } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
                    throw new Error('DeepSeek API server error. Please try again later.');
                } else {
                    throw new Error(`DeepSeek API error: ${errorMessage}`);
                }
            }

            this.logger.error('DeepSeek API call failed:', error);
            throw error;
        } finally {
            this.cancelTokenSource = null;
        }
    }

    /**
     * 获取适配器信息
     */
    getInfo(): { provider: string; model: string; baseUrl: string } {
        return {
            provider: 'deepseek',
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
