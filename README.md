# SVN Commit AI Check

[![VSCode](https://img.shields.io/badge/VSCode-1.85+-blue.svg)](https://code.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-Supported-green.svg)](https://cursor.sh/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[中文文档 (Chinese)](./README_CN.md)

AI-powered code review extension for SVN commits, designed for VSCode and Cursor editors. Focuses on C++ and Go code analysis with intelligent issue detection and severity classification.

## Features

- **Smart Environment Detection**: Automatically detects Cursor or VSCode environment and adapts accordingly
- **Multiple AI Providers**: Support for Cursor AI, DeepSeek, Claude, and OpenAI
- **Commit Interception**: Prompts for AI code review before SVN commits
- **Beautiful WebView Results**: Display analysis results in a well-rendered Markdown panel
- **Issue Severity Classification**: P0 (Critical), P1 (High), P2 (Low) severity levels
- **Cursor-style Configuration**: Modern configuration panel for VSCode users
- **Dependency Auto-Install**: Automatically prompts to install required SVN extension

## Screenshots

### AI Analysis Result Panel
The analysis results are displayed in a beautiful WebView panel with proper Markdown rendering:

```
┌─────────────────────────────────────────────────────┐
│ 🔍 AI Code Review           DeepSeek  📋 💾 ✓     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  # SVN Commit AI Check Report                       │
│                                                     │
│  ## 📊 Summary                                      │
│  Files: 3 | 🔴 P0: 1 | 🟡 P1: 2 | 🔵 P2: 1        │
│                                                     │
│  ## 🔴 P0 Critical Issues                          │
│  ### P0-1: Memory Leak in PlayerManager            │
│  File: `src/player.cpp`                            │
│  ...                                               │
└─────────────────────────────────────────────────────┘
```

### Configuration Panel (VSCode)
A Cursor-style configuration panel for selecting AI providers:

```
┌─────────────────────────────────────────────────────┐
│ ⚙️ AI Configuration                    📝 ✓        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Select AI Service Provider                         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ ⚡       │  │ 🤖       │  │ 🧠       │         │
│  │ DeepSeek │  │ Claude   │  │ OpenAI   │         │
│  │ ✓ Ready  │  │ ○ Config │  │ ○ Config │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites
- VSCode 1.85.0+ or Cursor
- [SVN SCM Extension](https://marketplace.visualstudio.com/items?itemName=johnstoncode.svn-scm) (auto-prompted for installation)

### Install from VSIX
1. Download the `.vsix` file from releases
2. In VSCode/Cursor: `Extensions` > `...` > `Install from VSIX...`
3. Select the downloaded file

### Build from Source
```bash
git clone https://github.com/danahuang/AiCheckBeforeSvnCommit.git
cd AiCheckBeforeSvnCommit
npm install
npm run compile
```

## Quick Start

1. **Open a SVN Repository**: Open a folder containing a `.svn` directory
2. **Make Changes**: Edit your C++ or Go files
3. **Commit with AI Check**:
   - Click the sparkle icon (✨) in the SCM panel, or
   - Use command palette: `SVN: Commit with AI Check`
4. **Review Results**: View the AI analysis in the WebView panel
5. **Proceed or Cancel**: Choose to continue with commit or fix issues first

## Commands

| Command | Description |
|---------|-------------|
| `SVN: Commit with AI Check` | Commit changes with AI code review |
| `SVN: Analyze Changes with AI` | Run AI analysis without committing |
| `SVN: Quick Commit (Skip AI Check)` | Commit without AI review |
| `SVN: Configure AI Check` | Open extension settings |
| `SVN AI: Check Dependencies` | Check required extension dependencies |
| `SVN AI: Install Missing Dependencies` | Install missing dependencies |

## Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `svn-commit-ai-check.enabled` | `true` | Enable/disable the extension |
| `svn-commit-ai-check.interceptCommit` | `true` | Show AI check prompt before commits |
| `svn-commit-ai-check.autoCheck` | `false` | Auto-run AI check without prompting |
| `svn-commit-ai-check.aiProvider` | `auto` | AI provider: `auto`, `cursor`, `deepseek`, `claude`, `openai` |
| `svn-commit-ai-check.deepseek.apiKey` | - | DeepSeek API Key |
| `svn-commit-ai-check.claude.apiKey` | - | Anthropic Claude API Key |
| `svn-commit-ai-check.openai.apiKey` | - | OpenAI API Key |
| `svn-commit-ai-check.analysis.languages` | `["cpp", "c", "go", ...]` | File extensions to analyze |
| `svn-commit-ai-check.analysis.maxFileSize` | `102400` | Max file size (bytes) to analyze |

## AI Providers

### Cursor AI (Cursor Editor Only)
- **Cost**: Free (uses your Cursor subscription)
- **Setup**: No configuration needed
- **Method**: Attempts Language Model API, Composer commands, or inline assist mode

### DeepSeek (Recommended)
- **Cost**: ~$0.14/million tokens (very affordable)
- **Setup**: Get API key from [platform.deepseek.com](https://platform.deepseek.com/api_keys)
- **Strength**: Excellent code analysis, best value for money

### Claude
- **Cost**: Standard Anthropic pricing
- **Setup**: Get API key from [console.anthropic.com](https://console.anthropic.com/account/keys)
- **Strength**: Strong code understanding, security analysis

### OpenAI
- **Cost**: Standard OpenAI pricing
- **Setup**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Strength**: General-purpose, widely compatible

## Issue Severity Levels

The AI classifies issues into three severity levels:

### 🔴 P0 - Critical
- Crashes, data corruption, security vulnerabilities
- Memory leaks, use-after-free, double free
- Deadlocks, data races
- **Requirement**: Must have concrete code evidence

### 🟡 P1 - High
- Incomplete error handling
- Null pointer risks
- Performance issues
- Missing boundary checks

### 🔵 P2 - Low
- Code style issues
- Naming conventions
- Missing comments
- TODO/FIXME markers

## Architecture

```
src/
├── extension.ts              # Extension entry point
├── ai/
│   ├── aiServiceManager.ts   # AI service orchestration
│   ├── cursorAdapter.ts      # Cursor AI integration
│   ├── deepseekAdapter.ts    # DeepSeek API client
│   ├── claudeAdapter.ts      # Claude API client
│   └── openaiAdapter.ts      # OpenAI API client
├── config/
│   ├── settings.ts           # Configuration management
│   └── prompts.ts            # AI prompt templates
├── core/
│   ├── commitInterceptor.ts  # Commit handling logic
│   ├── diffAnalyzer.ts       # SVN diff parsing
│   └── svnCommandInterceptor.ts # SCM command interception
├── ui/
│   ├── analysisResultPanel.ts # WebView result display
│   ├── aiConfigPanel.ts      # Configuration WebView
│   └── aiProviderSelector.ts # Provider selection UI
└── utils/
    ├── logger.ts             # Logging utility
    ├── cursorDetector.ts     # Environment detection
    └── dependencyChecker.ts  # Dependency management
```

## Development

### Build
```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode for development
```

### Test
```bash
npm run test       # Run tests
npm run lint       # Run ESLint
```

### Debug
1. Open the project in VSCode/Cursor
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new window

### Package
```bash
npx vsce package   # Create .vsix file
```

## Troubleshooting

### Extension Not Activating
1. Ensure you're in a SVN repository (`.svn` folder exists)
2. Check that SVN SCM extension is installed
3. View Output panel > "SVN-AI-Check" for detailed logs

### AI Analysis Fails
1. Check API key configuration in settings
2. Verify network connectivity
3. Try a different AI provider

### Cursor AI Not Working
1. Ensure you're using Cursor editor (not VSCode)
2. Try the "Copy to Chat" option if auto-detection fails
3. Use the inline assist mode (Ctrl+K)

## Workflow Comparison

### In Cursor Environment
1. Detects Cursor environment automatically
2. Attempts Language Model API → Composer commands → Chat command → Inline assist
3. Results displayed in beautiful WebView panel

### In VSCode Environment
1. Shows Cursor-style WebView configuration panel
2. User selects AI provider and configures API key
3. Calls selected API for analysis
4. Results displayed in beautiful WebView panel

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [SVN SCM Extension](https://github.com/AceCodePt/svn-scm) by Chris Johnston
- Inspired by [CodeBuddy](https://codebuddy.ai/) code review skill

---

**Version**: 0.1.0
**Last Updated**: 2026-01-16
