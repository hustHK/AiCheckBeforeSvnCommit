# SVN Commit AI Check - 测试指南

## 🎯 当前实现的功能

### ✅ 已完成
1. **SVN Diff 分析器** (`src/core/diffAnalyzer.ts`)
   - 检测 SVN 仓库
   - 获取待提交文件列表
   - 解析文件变更（added/modified/deleted）
   - 过滤支持的语言（C++, Go 等）
   - 获取 diff 和完整文件内容

2. **提交拦截器** (`src/core/commitInterceptor.ts`)
   - ✅ **Pre-commit 确认对话框**
   - 显示变更摘要
   - 进度指示器
   - AI 分析占位符（模拟）
   - 提交确认对话框

3. **配置管理** (`src/config/settings.ts`)
   - 启用/禁用插件
   - 自动检查模式
   - AI 提供商选择
   - 支持的语言配置

4. **基础设施**
   - 日志系统
   - 命令注册
   - 状态栏集成

---

## 🧪 如何测试

### 方法 1：在 Cursor/VSCode 中调试

#### 步骤 1：打开项目
```bash
cd /data/home/danahuang/svn-commit-ai-check
cursor .  # 或 code .
```

#### 步骤 2：启动调试
1. 在 Cursor/VSCode 中按 `F5`（或点击 Run → Start Debugging）
2. 会打开一个新的"扩展开发主机"窗口（标题带 `[Extension Development Host]`）

#### 步骤 3：打开一个 SVN 仓库
在扩展开发主机窗口中：
1. `File → Open Folder...`
2. 选择一个 SVN 工作目录

#### 步骤 4：进行代码修改
在 SVN 仓库中修改一些 C++ 或 Go 文件：
```bash
# 例如，修改一个 C++ 文件
echo "// test change" >> src/main.cpp
```

#### 步骤 5：触发分析
打开命令面板（`Ctrl/Cmd + Shift + P`），输入：
```
SVN: Analyze Changes with AI
```

#### 步骤 6：观察对话框流程
你应该看到以下对话框序列：

1. **确认对话框**
   ```
   🤖 是否需要 AI 智能分析本次提交的代码？
   将分析代码变更，识别潜在问题（重点关注 C++ 和 Go 代码）
   
   [✅ OK] [❌ Cancel]
   ```

2. **进度通知**
   ```
   Getting SVN changes...
   ```

3. **变更摘要**
   ```
   Found X file(s) to analyze: Total: X files (Added: X, Modified: X, Deleted: X)
   ```

4. **AI 分析进度**
   ```
   🤖 AI Code Analysis
   ⚙️ Preparing code changes...
   ⚙️ Analyzing code quality...
   ⚙️ Checking for issues...
   ✅ Analysis complete!
   ```

5. **提交确认对话框**
   ```
   📊 分析完成，是否继续提交？
   AI 分析已完成，您可以选择继续提交或取消提交
   
   [✅ Continue Commit] [❌ Cancel Commit]
   ```

---

### 方法 2：查看日志输出

在扩展开发主机窗口中：
1. 打开输出面板：`View → Output`
2. 在下拉菜单中选择 "SVN-AI-Check"
3. 查看详细日志

日志示例：
```
[2026-01-15T19:30:00.000Z] [INFO] SVN Commit AI Check extension activating...
[2026-01-15T19:30:00.100Z] [INFO] Commit interceptor initializing...
[2026-01-15T19:30:00.200Z] [INFO] Commit interceptor initialized successfully
[2026-01-15T19:30:10.000Z] [INFO] Manual analysis triggered
[2026-01-15T19:30:10.100Z] [INFO] === SVN Commit Check Started ===
[2026-01-15T19:30:15.000Z] [INFO] User confirmation: OK
[2026-01-15T19:30:15.100Z] [INFO] Getting SVN changes in /path/to/svn/repo
[2026-01-15T19:30:15.500Z] [INFO] Found 3 file(s) to analyze
[2026-01-15T19:30:15.600Z] [INFO] Changes: Total: 3 files (Added: 1, Modified: 2, Deleted: 0)
```

---

## 🔧 测试场景

### 场景 1：基本流程测试（推荐先测这个）
**目的**：验证对话框和基本流程

1. 打开一个 SVN 仓库
2. 修改一个 `.cpp` 或 `.go` 文件
3. 运行 "SVN: Analyze Changes with AI" 命令
4. 点击 "OK" 确认分析
5. 观察进度和对话框
6. 点击 "Continue Commit" 或 "Cancel Commit"

**预期结果**：
- ✅ 所有对话框正常显示
- ✅ 进度指示器正常工作
- ✅ 日志输出完整

---

### 场景 2：取消分析测试
**目的**：验证用户取消流程

1. 运行命令
2. 在第一个对话框点击 "Cancel"

**预期结果**：
- ✅ 提示 "User skipped AI analysis"
- ✅ 直接返回，不显示后续对话框

---

### 场景 3：无变更测试
**目的**：验证无文件变更时的行为

1. 在 SVN 仓库中不做任何修改
2. 运行命令
3. 点击 "OK"

**预期结果**：
- ✅ 提示 "No changes to analyze"

---

### 场景 4：非 SVN 仓库测试
**目的**：验证非 SVN 环境的处理

1. 打开一个非 SVN 目录（如 Git 仓库）
2. 运行命令

**预期结果**：
- ✅ 提示错误："Current workspace is not an SVN repository"

---

### 场景 5：文件过滤测试
**目的**：验证只分析 C++/Go 文件

1. 修改以下文件：
   - `test.cpp` ✅ 应该被分析
   - `test.go` ✅ 应该被分析
   - `test.txt` ❌ 应该被忽略
   - `test.js` ❌ 应该被忽略（除非在配置中启用）
2. 运行命令

**预期结果**：
- ✅ 只显示 C++/Go 文件
- ✅ 日志中显示 "Skipping file" 对于其他文件

---

### 场景 6：大文件测试
**目的**：验证大文件的处理

1. 创建一个超过 100KB 的 C++ 文件
2. 运行命令

**预期结果**：
- ✅ 日志中显示 "File too large, skipping"

---

## 🎨 UI 截图预览

### 对话框 1：确认分析
```
┌─────────────────────────────────────────────────┐
│ 🤖 是否需要 AI 智能分析本次提交的代码？          │
│                                                 │
│ 将分析代码变更，识别潜在问题                     │
│ （重点关注 C++ 和 Go 代码）                      │
│                                                 │
│                    [✅ OK]  [❌ Cancel]           │
└─────────────────────────────────────────────────┘
```

### 进度通知
```
┌─────────────────────────────────────────┐
│ 🤖 AI Code Analysis                    │
│ ⚙️ Analyzing code quality... 60%       │
│                                         │
│ [Cancel]                                │
└─────────────────────────────────────────┘
```

### 对话框 2：提交确认
```
┌─────────────────────────────────────────────────┐
│ 📊 分析完成，是否继续提交？                      │
│                                                 │
│ AI 分析已完成，您可以选择继续提交或取消提交      │
│                                                 │
│       [✅ Continue Commit]  [❌ Cancel Commit]   │
└─────────────────────────────────────────────────┘
```

---

## ⚙️ 配置选项测试

### 修改配置
1. 运行命令 "SVN: Configure AI Check"
2. 或点击状态栏的 "$(sparkle) SVN AI" 按钮
3. 修改以下配置：

#### 禁用插件
```json
{
  "svn-commit-ai-check.enabled": false
}
```
**预期结果**：插件不加载

#### 自动检查模式
```json
{
  "svn-commit-ai-check.autoCheck": true
}
```
**预期结果**：不显示第一个确认对话框，直接分析

#### 修改支持的语言
```json
{
  "svn-commit-ai-check.analysis.languages": ["cpp", "c", "go", "py"]
}
```
**预期结果**：也会分析 Python 文件

---

## 🐛 调试技巧

### 1. 查看详细日志
在扩展主机中打开开发者工具：
- `Help → Toggle Developer Tools`
- 查看控制台输出

### 2. 设置断点
在源代码中设置断点：
1. 打开 `src/core/commitInterceptor.ts`
2. 在 `handleCommit()` 方法中设置断点
3. 按 `F5` 启动调试
4. 触发命令

### 3. 重新加载扩展
如果修改了代码：
1. 在扩展主机窗口中按 `Ctrl/Cmd + R` 重新加载
2. 或重新按 `F5`

---

## ✅ 成功标准

如果以上测试场景都通过，说明 Pre-commit Hook 对话框功能已经成功实现！

下一步可以继续实现：
- [ ] Cursor AI 集成
- [ ] 外部 AI API 调用
- [ ] 报告生成和展示
- [ ] 实际的 SVN commit 命令拦截

---

## 📝 已知限制（当前版本）

1. **AI 分析是模拟的**：目前只是显示进度，没有真正调用 AI
2. **未实际拦截 SVN commit**：需要手动运行命令测试
3. **报告展示待实现**：暂时只显示简单的消息框

这些功能将在后续步骤中实现！

---

**文档版本**: v1.0  
**最后更新**: 2026-01-15  
**状态**: ✅ 可以开始测试
