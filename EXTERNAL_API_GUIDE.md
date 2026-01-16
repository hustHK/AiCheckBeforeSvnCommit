# 外部 AI API 集成指南

## ✅ 新功能：外部 AI API 支持

现在支持多种 AI 服务提供商，可以在 **Cursor** 和 **原生 VSCode** 中使用！

---

## 🎯 智能检测规则

### 在 Cursor 中：
- ✅ **优先推荐**: Cursor 内置 AI（免费）
- ✅ **备选方案**: DeepSeek / Claude / OpenAI（需要 API Key）
- ✅ 用户可以选择使用外部 API

### 在 VSCode 中：
- ✅ **仅支持**: 外部 AI API（DeepSeek / Claude / OpenAI）
- ❌ **不支持**: Cursor AI（因为不在 Cursor 环境）

---

## 🆕 支持的 AI 提供商

### 1. Cursor AI（仅 Cursor 环境）
- **费用**: 免费（使用 Cursor 自带额度）
- **模式**: 半自动化（需要在 Cursor Chat 中操作）
- **优点**: 
  - ✅ 免费
  - ✅ 与 Cursor 深度集成
  - ✅ 无需配置 API Key
- **缺点**: 
  - ❌ 需要手动操作
  - ❌ 仅在 Cursor 中可用

---

### 2. DeepSeek API（推荐 ⭐）
- **费用**: ¥1/百万 tokens（非常便宜！）
- **模式**: 全自动
- **模型**: `deepseek-coder`（代码专用）
- **优点**:
  - ✅ 性价比极高（比 OpenAI 便宜 100 倍）
  - ✅ 专注代码分析
  - ✅ 全自动，无需手动操作
  - ✅ 支持 C++/Go
- **缺点**:
  - ❌ 需要注册并配置 API Key
  - ❌ 需要付费（但很便宜）

**获取 API Key**: [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

---

### 3. Claude API
- **费用**: 按使用量计费
- **模式**: 全自动
- **模型**: `claude-3-5-sonnet-20241022`
- **优点**:
  - ✅ 代码理解能力强
  - ✅ 安全分析专业
  - ✅ 全自动
- **缺点**:
  - ❌ 需要 API Key
  - ❌ 价格较高

**获取 API Key**: [https://console.anthropic.com/account/keys](https://console.anthropic.com/account/keys)

---

### 4. OpenAI API
- **费用**: 按使用量计费
- **模式**: 全自动
- **模型**: `gpt-4-turbo-preview`
- **优点**:
  - ✅ 通用能力强
  - ✅ 全自动
- **缺点**:
  - ❌ 需要 API Key
  - ❌ 价格较高
  - ❌ 可能需要特殊网络环境

**获取 API Key**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🚀 如何使用

### 方式 1：自动检测（推荐）

#### 在 Cursor 中：
1. 运行 `SVN: Analyze Changes with AI`
2. 看到提示：
   ```
   检测到 Cursor 编辑器！推荐使用 Cursor 内置 AI（免费）
   [使用 Cursor AI] [选择其他 API]
   ```
3. **选择 "使用 Cursor AI"**：使用免费的 Cursor AI
4. **选择 "选择其他 API"**：弹出 AI 提供商选择界面

#### 在 VSCode 中：
1. 运行 `SVN: Analyze Changes with AI`
2. 自动弹出 AI 提供商选择界面：
   ```
   🤖 AI Service Provider
   
   $(zap) DeepSeek
   High performance code analysis
   性价比最高 • ¥1/百万tokens • 代码能力强
   
   $(hubot) Claude
   Anthropic Claude 3.5 Sonnet
   代码理解能力强 • 安全分析专业
   
   $(circuit-board) OpenAI
   GPT-4 Turbo
   通用能力强 • 需要 API Key
   ```
3. 选择你想使用的 AI 提供商

---

### 方式 2：手动配置

#### 步骤 1：打开设置
- **方法 A**: 点击状态栏的 "$(sparkle) SVN AI" 按钮
- **方法 B**: 运行命令 `SVN: Configure AI Check`
- **方法 C**: `Ctrl/Cmd + ,` → 搜索 `svn-commit-ai-check`

#### 步骤 2：选择 AI 提供商
找到 `AI Provider` 设置，选择：
- `auto` - 自动检测（推荐）
- `cursor` - 强制使用 Cursor AI（仅 Cursor 环境）
- `deepseek` - 使用 DeepSeek API
- `claude` - 使用 Claude API
- `openai` - 使用 OpenAI API

#### 步骤 3：配置 API Key（如果使用外部 API）

**DeepSeek**:
```json
{
  "svn-commit-ai-check.aiProvider": "deepseek",
  "svn-commit-ai-check.deepseek.apiKey": "sk-your-deepseek-key-here"
}
```

**Claude**:
```json
{
  "svn-commit-ai-check.aiProvider": "claude",
  "svn-commit-ai-check.claude.apiKey": "sk-ant-your-claude-key-here"
}
```

**OpenAI**:
```json
{
  "svn-commit-ai-check.aiProvider": "openai",
  "svn-commit-ai-check.openai.apiKey": "sk-your-openai-key-here"
}
```

---

## 🎨 AI 提供商选择界面

### 界面预览（类似 Cursor 的 Models 选择）

```
┌──────────────────────────────────────────────────────┐
│ 🤖 AI Service Provider                               │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ✨ $(sparkle) Cursor AI                              │
│    Use Cursor built-in AI (手动模式)                 │
│    优先推荐 • 免费 • 需要在 Cursor Chat 中操作        │
│                                                       │
│ ⚡ $(zap) DeepSeek                                   │
│    High performance code analysis                    │
│    性价比最高 • ¥1/百万tokens • 代码能力强            │
│                                                       │
│ 🤖 $(hubot) Claude                                   │
│    Anthropic Claude 3.5 Sonnet                       │
│    代码理解能力强 • 安全分析专业                      │
│                                                       │
│ 🔌 $(circuit-board) OpenAI                           │
│    GPT-4 Turbo                                       │
│    通用能力强 • 需要 API Key                          │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 📋 使用流程对比

### Cursor AI（半自动）
```
触发分析
  ↓
确认分析
  ↓
初始化 Cursor AI
  ↓
📋 Prompt 复制到剪贴板
引导用户在 Cursor Chat 中操作
  ↓
用户在 Chat 中粘贴、发送、等待、复制回复
  ↓
点击"已完成分析"
  ↓
查看报告
```

### 外部 API（全自动）
```
触发分析
  ↓
确认分析
  ↓
选择 AI 提供商（首次）
  ↓
配置 API Key（首次）
  ↓
✨ 自动调用 API 分析
  ↓
⏱️ 等待 10-30 秒
  ↓
✅ 自动显示报告
```

---

## 💰 成本对比

假设分析 1000 行代码变更（约 5000 tokens）：

| 提供商 | 费用 | 分析 100 次的总成本 |
|--------|------|-------------------|
| **Cursor AI** | 免费 | ¥0 |
| **DeepSeek** | ¥1/百万tokens | ~¥0.005 (半分钱) |
| **Claude** | ~$0.015/1k tokens | ~$7.5 (约 ¥55) |
| **OpenAI GPT-4** | ~$0.03/1k tokens | ~$15 (约 ¥110) |

**结论**: DeepSeek 性价比极高！

---

## 🧪 测试步骤

### 测试 1：在 Cursor 中使用 Cursor AI
1. 打开 Cursor
2. 运行分析命令
3. 选择 "使用 Cursor AI"
4. 按照提示在 Cursor Chat 中操作

### 测试 2：在 Cursor 中使用 DeepSeek
1. 打开 Cursor
2. 运行分析命令
3. 选择 "选择其他 API"
4. 选择 "DeepSeek"
5. 输入 API Key
6. 自动分析并显示结果

### 测试 3：在 VSCode 中使用 DeepSeek
1. 打开原生 VSCode
2. 运行分析命令
3. 自动显示提供商选择（没有 Cursor AI 选项）
4. 选择 "DeepSeek"
5. 输入 API Key
6. 自动分析并显示结果

---

## 🔧 高级配置

### 自定义 DeepSeek Base URL
如果使用代理或镜像：
```json
{
  "svn-commit-ai-check.deepseek.baseUrl": "https://your-proxy.com/v1"
}
```

### 自定义模型
```json
{
  "svn-commit-ai-check.deepseek.model": "deepseek-chat"
}
```

---

## 🐛 故障排除

### 问题 1：API Key 无效
**错误**: `Invalid DeepSeek API key`
**解决**:
1. 检查 API Key 是否正确复制
2. 确保 Key 没有过期
3. 检查账户余额

### 问题 2：网络超时
**错误**: `timeout of 60000ms exceeded`
**解决**:
1. 检查网络连接
2. 如果使用 OpenAI，可能需要代理
3. 尝试增加超时时间

### 问题 3：Rate Limit
**错误**: `API rate limit exceeded`
**解决**:
1. 等待几分钟后重试
2. 升级 API 套餐
3. 切换到其他提供商

### 问题 4：在 VSCode 中看到 Cursor AI 选项
**原因**: 不应该出现这种情况
**解决**: 
- 插件会自动检测环境
- 如果出现此问题，请提交 bug 报告

---

## 📊 功能矩阵

| 功能 | Cursor AI | DeepSeek | Claude | OpenAI |
|------|-----------|----------|--------|--------|
| **Cursor 环境** | ✅ | ✅ | ✅ | ✅ |
| **VSCode 环境** | ❌ | ✅ | ✅ | ✅ |
| **全自动分析** | ❌ | ✅ | ✅ | ✅ |
| **需要 API Key** | ❌ | ✅ | ✅ | ✅ |
| **费用** | 免费 | 极低 | 中等 | 较高 |
| **代码能力** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐方案

### 场景 1：个人开发者 + 使用 Cursor
**推荐**: Cursor AI（免费）

### 场景 2：个人开发者 + 使用 VSCode
**推荐**: DeepSeek API（极低成本）

### 场景 3：团队开发 + 需要高质量分析
**推荐**: Claude API（代码理解能力强）

### 场景 4：企业用户 + 已有 OpenAI 订阅
**推荐**: OpenAI API（现有资源利用）

---

## ✅ 成功标准

外部 API 集成测试成功的标志：
- ✅ 在 Cursor 中可以选择使用外部 API
- ✅ 在 VSCode 中只显示外部 API 选项
- ✅ API Key 配置向导正常工作
- ✅ 外部 API 调用成功
- ✅ 分析结果正确显示
- ✅ 错误处理友好

---

## 📚 相关文档

- [CURSOR_AI_TESTING.md](./CURSOR_AI_TESTING.md) - Cursor AI 测试指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [README.md](./README.md) - 项目说明

---

**文档版本**: v1.0  
**最后更新**: 2026-01-15  
**状态**: ✅ 外部 AI API 集成完成！
