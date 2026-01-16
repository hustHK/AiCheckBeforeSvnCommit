# Cursor AI 集成方案（更新版）

## 📋 调研结论

基于对 Cursor 编辑器的调研，发现以下关键信息：

### Cursor 的本质
- Cursor 是基于 **VSCode Fork** 开发的
- 完全兼容 VSCode 的扩展和 API
- 内置了 GPT-4、Claude 3.5 等 AI 模型
- **Cursor 特有的快捷键**：
  - `Ctrl/Cmd + K`: 生成代码（Generate）
  - `Ctrl/Cmd + L`: 打开 AI 聊天对话框（Chat）
  - `Ctrl/Cmd + I`: 编辑代码（Edit）

### Cursor AI API 现状
**关键发现**：Cursor **目前没有公开的扩展 API** 来直接调用其内置 AI。

### 可行的集成方案

经过调研，找到了 **3 种可行的方案**：

---

## 🎯 方案选择（推荐方案 2）

### ❌ 方案 1：直接 API 调用（不可行）
**原因**：Cursor 未提供扩展可调用的 AI API

### ✅ **方案 2：模拟用户操作 + Chat 窗口交互（推荐）**

**核心思路**：
1. 通过 `vscode.commands.executeCommand` 尝试调用 Cursor 的内置命令
2. 如果存在类似 `cursor.chat.sendMessage` 的命令，直接调用
3. 如果不存在，通过模拟快捷键（`Ctrl/Cmd + L`）打开 Chat 窗口
4. 将代码 diff 内容复制到剪贴板
5. 提示用户粘贴到 Chat 窗口并提问

**优点**：
- 利用 Cursor 内置的免费 AI 额度
- 无需用户配置 API Key
- 完全利用 Cursor 的上下文理解能力

**缺点**：
- 需要用户手动参与（半自动化）
- 依赖 Cursor 的命令是否可用

### ✅ 方案 3：智能降级方案（最稳妥）

**实现逻辑**：
```typescript
if (isCursorEditor() && hasCursorChatCommand()) {
    // 使用 Cursor 内置 AI
    useCursorAI();
} else {
    // 降级到 Claude/DeepSeek 等开源 API
    const provider = askUserSelectProvider();
    useExternalAI(provider);
}
```

**支持的外部 AI**：
- **DeepSeek API**（推荐，便宜且强大）
- **Anthropic Claude API**
- **OpenAI API**
- **本地部署的开源模型**（如 Ollama）

---

## 🔧 具体实现方案

### 阶段 1：检测 Cursor 环境

```typescript
// src/utils/cursorDetector.ts
export function isCursorEditor(): boolean {
    const appName = vscode.env.appName.toLowerCase();
    return appName.includes('cursor');
}

export async function getCursorCommands(): Promise<string[]> {
    const allCommands = await vscode.commands.getCommands();
    return allCommands.filter(cmd => cmd.includes('cursor'));
}
```

### 阶段 2：尝试调用 Cursor Chat 命令

```typescript
// src/ai/cursorAdapter.ts
export class CursorAIAdapter {
    async sendToChat(prompt: string): Promise<boolean> {
        try {
            // 尝试方法 1: 直接命令调用
            await vscode.commands.executeCommand('cursor.chat.sendMessage', {
                message: prompt
            });
            return true;
        } catch (error) {
            // 尝试方法 2: 打开 Chat 并复制内容
            return await this.fallbackToManual(prompt);
        }
    }

    private async fallbackToManual(prompt: string): Promise<boolean> {
        // 复制到剪贴板
        await vscode.env.clipboard.writeText(prompt);
        
        // 打开 Cursor Chat（通过快捷键）
        // 注意: VSCode Extension API 无法直接模拟键盘输入
        // 需要通过命令打开 Chat 面板
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open');
        } catch {
            // 如果命令不存在，给用户提示
        }
        
        const choice = await vscode.window.showInformationMessage(
            '代码分析 Prompt 已复制到剪贴板！\n请粘贴到 Cursor Chat (Ctrl/Cmd+L) 并发送。',
            { modal: true },
            'OK'
        );
        
        return choice === 'OK';
    }
}
```

### 阶段 3：外部 AI 降级方案

```typescript
// src/ai/aiServiceFactory.ts
export class AIServiceFactory {
    static async create(configManager: ConfigurationManager): Promise<AIAdapter> {
        // 检测 Cursor 环境
        if (isCursorEditor()) {
            const cursorCommands = await getCursorCommands();
            logger.info('Cursor commands:', cursorCommands);
            
            // 如果发现可用的 Cursor Chat 命令
            if (cursorCommands.some(cmd => cmd.includes('chat'))) {
                const choice = await vscode.window.showInformationMessage(
                    '检测到 Cursor 编辑器！是否使用 Cursor 内置 AI？',
                    'Use Cursor AI',
                    'Use External AI'
                );
                
                if (choice === 'Use Cursor AI') {
                    return new CursorAIAdapter(logger);
                }
            }
        }
        
        // 降级到外部 AI
        return await this.selectExternalAI(configManager);
    }
    
    private static async selectExternalAI(config: ConfigurationManager): Promise<AIAdapter> {
        const provider = config.getAIProvider();
        
        if (!provider || provider === 'none') {
            // 询问用户选择
            const choice = await vscode.window.showQuickPick([
                { label: 'DeepSeek API', value: 'deepseek', description: '便宜且强大（推荐）' },
                { label: 'Claude API', value: 'claude', description: 'Anthropic Claude' },
                { label: 'OpenAI API', value: 'openai', description: 'GPT-4' },
                { label: 'Local Ollama', value: 'ollama', description: '本地部署（免费）' }
            ], {
                placeHolder: '选择 AI 服务提供商'
            });
            
            if (!choice) {
                throw new Error('No AI provider selected');
            }
            
            // 保存用户选择
            await config.setAIProvider(choice.value);
        }
        
        // 根据选择创建适配器
        switch (provider) {
            case 'deepseek':
                return new DeepSeekAdapter(config, logger);
            case 'claude':
                return new ClaudeAdapter(config, logger);
            case 'openai':
                return new OpenAIAdapter(config, logger);
            case 'ollama':
                return new OllamaAdapter(config, logger);
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
}
```

### 阶段 4：DeepSeek 适配器（推荐的免费方案）

```typescript
// src/ai/adapters/deepseekAdapter.ts
import axios from 'axios';

export class DeepSeekAdapter implements AIAdapter {
    private apiKey: string;
    private baseUrl = 'https://api.deepseek.com/v1';
    
    constructor(config: ConfigurationManager, private logger: Logger) {
        this.apiKey = config.get('deepseek.apiKey') || '';
        if (!this.apiKey) {
            throw new Error('DeepSeek API key not configured');
        }
    }
    
    async analyze(prompt: string, token: vscode.CancellationToken): Promise<string> {
        this.logger.info('Calling DeepSeek API...');
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: 'deepseek-coder',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    cancelToken: new axios.CancelToken(cancel => {
                        token.onCancellationRequested(() => cancel());
                    })
                }
            );
            
            return response.data.choices[0].message.content;
            
        } catch (error) {
            this.logger.error('DeepSeek API error:', error);
            throw new Error('DeepSeek API call failed');
        }
    }
}
```

---

## 📝 更新的配置项

```json
{
  "svn-commit-ai-check.aiProvider": {
    "type": "string",
    "enum": ["auto", "cursor", "deepseek", "claude", "openai", "ollama"],
    "default": "auto",
    "markdownDescription": "AI 服务提供商\n- `auto`: 自动检测（优先 Cursor）\n- `cursor`: 强制使用 Cursor 内置 AI\n- `deepseek`: DeepSeek API（推荐，便宜）\n- `claude`: Anthropic Claude\n- `openai`: OpenAI GPT-4\n- `ollama`: 本地 Ollama"
  },
  "svn-commit-ai-check.deepseek.apiKey": {
    "type": "string",
    "default": "",
    "markdownDescription": "DeepSeek API Key. [获取地址](https://platform.deepseek.com/api_keys)"
  },
  "svn-commit-ai-check.ollama.baseUrl": {
    "type": "string",
    "default": "http://localhost:11434",
    "description": "Ollama 服务地址"
  },
  "svn-commit-ai-check.ollama.model": {
    "type": "string",
    "default": "codellama",
    "description": "Ollama 使用的模型"
  }
}
```

---

## 🚀 实施步骤（分步骤）

### Step 1: 初始化项目（今天完成）
- [x] 调研 Cursor 集成方案
- [ ] 创建项目骨架
- [ ] 配置 TypeScript 和基本依赖

### Step 2: 实现 SVN Diff 分析（明天）
- [ ] 实现 `svn status` 和 `svn diff` 调用
- [ ] 解析 diff 输出
- [ ] 文件过滤逻辑

### Step 3: 实现 Cursor 检测和适配器（后天）
- [ ] 实现 Cursor 环境检测
- [ ] 实现 Cursor Chat 命令查找
- [ ] 实现半自动化的 Chat 交互

### Step 4: 实现外部 AI 适配器（第 4 天）
- [ ] 实现 DeepSeek 适配器
- [ ] 实现配置向导
- [ ] 测试 API 调用

### Step 5: 实现报告展示（第 5 天）
- [ ] 简单的 Markdown 报告生成
- [ ] 在编辑器中展示
- [ ] （可选）Webview 面板

### Step 6: 集成和测试（第 6 天）
- [ ] 端到端流程测试
- [ ] 修复 bug
- [ ] 优化用户体验

### Step 7: 打包和文档（第 7 天）
- [ ] 编写 README
- [ ] 打包为 VSIX
- [ ] 本地安装测试

---

## 💡 用户体验流程（最终版）

```
用户在 Cursor 中点击 SVN 提交
    ↓
插件弹窗: "是否需要 AI 代码审查？" [OK] [Cancel]
    ↓
[OK] → 插件检测环境
    ↓
┌────────────────────────────────────────────┐
│ 是 Cursor 且有可用命令？                     │
├────────────────────────────────────────────┤
│ YES → 自动打开 Cursor Chat                   │
│       提示用户: "Prompt 已复制到剪贴板，      │
│                  请粘贴到 Chat 并发送"       │
│                                             │
│ NO  → 选择外部 AI 提供商                     │
│       ├─ DeepSeek (推荐)                     │
│       ├─ Claude                             │
│       ├─ OpenAI                             │
│       └─ Ollama (本地)                       │
│                                             │
│       输入 API Key (如需要)                  │
│       自动调用 AI 分析                       │
└────────────────────────────────────────────┘
    ↓
AI 分析完成 → 生成报告
    ↓
展示报告（Markdown 或 Webview）
    ↓
用户决定: [继续提交] [取消提交]
```

---

## ⚠️ 重要提醒

1. **Cursor Chat 命令调研**
   - 需要在实际 Cursor 环境中运行 `vscode.commands.getCommands()` 查看所有命令
   - 可能的命令名称：
     - `cursor.chat.open`
     - `cursor.chat.sendMessage`
     - `workbench.action.chat.open`
     - `aichat.openChat`

2. **DeepSeek API 费用**
   - DeepSeek Coder: ¥1/百万 tokens（输入）
   - 比 OpenAI 便宜 **100 倍**
   - 适合个人和小团队使用

3. **Ollama 本地方案**
   - 完全免费
   - 需要本地安装 Ollama
   - 推荐模型: `codellama:13b` 或 `deepseek-coder:6.7b`

---

## 📋 总结

**最终方案**：
- **优先尝试** Cursor 内置 AI（通过命令或半自动交互）
- **默认推荐** DeepSeek API（便宜且强大）
- **备选方案** Ollama 本地部署（完全免费）
- **高级选项** Claude/OpenAI（如用户已有 API Key）

这样既满足了"使用 Cursor 自带 AI"的需求，又提供了灵活的降级方案，确保插件在各种环境下都能正常工作！

---

**文档版本**: v2.0  
**最后更新**: 2026-01-15  
**状态**: ✅ 调研完成，准备开始实现
