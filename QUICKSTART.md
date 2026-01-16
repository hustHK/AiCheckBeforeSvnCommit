# SVN Commit AI Check - 快速开始

## 🚀 5 分钟快速测试

### 1️⃣ 准备环境

确保已安装：
- ✅ Cursor 或 VSCode
- ✅ SVN 命令行工具
- ✅ Node.js >= 18

### 2️⃣ 打开项目

```bash
cd /data/home/danahuang/svn-commit-ai-check
cursor .  # 或 code .
```

### 3️⃣ 启动调试

在 Cursor/VSCode 中：
1. 按 `F5` 键
2. 等待扩展主机窗口打开（新窗口标题会显示 `[Extension Development Host]`）

### 4️⃣ 打开 SVN 仓库

在扩展主机窗口中：
1. `File → Open Folder...`
2. 选择一个 SVN 工作目录（必须是有 `.svn` 的目录）

### 5️⃣ 修改代码

在 SVN 仓库中修改一个 C++ 或 Go 文件：

```bash
# 在你的 SVN 仓库中
echo "// test change for AI check" >> src/main.cpp
```

或者直接在编辑器中修改文件。

### 6️⃣ 触发分析

在扩展主机窗口中：
1. 按 `Ctrl/Cmd + Shift + P` 打开命令面板
2. 输入 `SVN: Analyze`
3. 选择 **"SVN: Analyze Changes with AI"**

### 7️⃣ 体验对话框

你会看到以下对话框序列：

#### 对话框 1：确认分析 ✨
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
**→ 点击 "OK"**

#### 通知：获取变更
```
Getting SVN changes...
```

#### 通知：变更摘要
```
Found 1 file(s) to analyze: Total: 1 files (Added: 0, Modified: 1, Deleted: 0)
```

#### 进度条：AI 分析 ✨
```
┌─────────────────────────────────────────┐
│ 🤖 AI Code Analysis                    │
│ ⚙️ Analyzing code quality... 60%       │
└─────────────────────────────────────────┘
```

#### 对话框 2：提交确认 ✨
```
┌─────────────────────────────────────────────────┐
│ 📊 分析完成，是否继续提交？                      │
│                                                 │
│ AI 分析已完成，您可以选择继续提交或取消提交      │
│                                                 │
│       [✅ Continue Commit]  [❌ Cancel Commit]   │
└─────────────────────────────────────────────────┘
```
**→ 选择你的决定**

### 8️⃣ 查看日志

1. 在扩展主机窗口中，打开输出面板：`View → Output`
2. 在下拉菜单中选择 **"SVN-AI-Check"**
3. 查看详细日志输出

---

## 🎯 快速测试场景

### 场景 A：正常流程（推荐）
1. 修改一个 `.cpp` 文件
2. 运行命令
3. 点击 OK → Continue Commit

### 场景 B：取消分析
1. 修改文件
2. 运行命令
3. 点击 Cancel（第一个对话框）

### 场景 C：取消提交
1. 修改文件
2. 运行命令
3. 点击 OK → Cancel Commit

---

## 🐛 遇到问题？

### 问题 1：找不到命令
**解决方案**：
- 确保按了 `F5` 启动调试
- 在扩展主机窗口（不是原始窗口）中运行命令

### 问题 2：提示 "Not an SVN repository"
**解决方案**：
- 确保打开的文件夹是 SVN 工作目录
- 运行 `svn info` 检查

### 问题 3：没有找到文件变更
**解决方案**：
- 确保修改了 C++/Go 文件（.cpp, .go, .h, .hpp）
- 运行 `svn status` 检查是否有变更

### 问题 4：编译错误
**解决方案**：
```bash
cd /data/home/danahuang/svn-commit-ai-check
npm install
node ./node_modules/typescript/bin/tsc -p ./
```

---

## 📚 下一步

测试成功后，可以：
1. 查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md) 了解更多测试场景
2. 查看 [PROJECT_PLAN.md](./PROJECT_PLAN.md) 了解完整规划
3. 继续实现下一个功能：Cursor AI 集成

---

## ✅ 成功标准

如果你看到了完整的对话框流程，恭喜！Pre-commit Hook 对话框功能已经工作了！🎉

---

**文档版本**: v1.0  
**最后更新**: 2026-01-15
