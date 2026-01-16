import * as vscode from 'vscode';
import axios, { CancelTokenSource } from 'axios';
import { Logger } from '../utils/logger';
import { AIAdapter } from './cursorAdapter';

/**
 * Anthropic Claude API 适配器
 * Claude 擅长代码理解和安全分析
 */
export class ClaudeAdapter implements AIAdapter {
    private apiKey: string;
    private baseUrl: string = 'https://api.anthropic.com/v1';
    private model: string = 'claude-3-5-sonnet-20241022';
    private cancelTokenSource: CancelTokenSource | null = null;

    constructor(
        apiKey: string,
        private logger: Logger,
        model?: string
    ) {
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        }
    }

    /**
     * 分析代码
     */
    async analyze(prompt: string, token: vscode.CancellationToken): Promise<string> {
        this.logger.info(`Calling Claude API with model: ${this.model}`);

        if (!this.apiKey) {
            throw new Error('Claude API key is not configured');
        }

        this.cancelTokenSource = axios.CancelToken.source();

        token.onCancellationRequested(() => {
            this.logger.info('Analysis cancelled by user');
            this.cancelTokenSource?.cancel('Analysis cancelled by user');
        });

        try {
            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    model: this.model,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000,
                    cancelToken: this.cancelTokenSource.token
                }
            );

            const content = response.data.content[0]?.text;
            
            if (!content) {
                throw new Error('Empty response from Claude API');
            }

            this.logger.info(`Claude analysis completed, response length: ${content.length}`);
            return content;

        } catch (error) {
            if (axios.isCancel(error)) {
                throw new Error('Analysis cancelled by user');
            }

            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;

                if (statusCode === 401) {
                    throw new Error('Invalid Claude API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('Claude API rate limit exceeded. Please try again later.');
                } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
                    throw new Error('Claude API server error. Please try again later.');
                } else {
                    throw new Error(`Claude API error: ${errorMessage}`);
                }
            }

            this.logger.error('Claude API call failed:', error);
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
            provider: 'claude',
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
