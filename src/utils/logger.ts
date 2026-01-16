import * as vscode from 'vscode';

export class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor(channelName: string) {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    info(message: string, ...args: any[]): void {
        const fullMessage = this.formatMessage('INFO', message, args);
        this.outputChannel.appendLine(fullMessage);
        console.log(fullMessage);
    }

    warn(message: string, ...args: any[]): void {
        const fullMessage = this.formatMessage('WARN', message, args);
        this.outputChannel.appendLine(fullMessage);
        console.warn(fullMessage);
    }

    error(message: string, ...args: any[]): void {
        const fullMessage = this.formatMessage('ERROR', message, args);
        this.outputChannel.appendLine(fullMessage);
        console.error(fullMessage);
    }

    debug(message: string, ...args: any[]): void {
        const fullMessage = this.formatMessage('DEBUG', message, args);
        this.outputChannel.appendLine(fullMessage);
        console.debug(fullMessage);
    }

    show(): void {
        this.outputChannel.show();
    }

    private formatMessage(level: string, message: string, args: any[]): string {
        const timestamp = new Date().toISOString();
        const argsStr = args.length > 0 ? ' ' + JSON.stringify(args) : '';
        return `[${timestamp}] [${level}] ${message}${argsStr}`;
    }
}
